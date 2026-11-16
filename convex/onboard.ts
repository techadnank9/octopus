import { internalAction, internalMutation, internalQuery, mutation, type QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { brain, remember } from "./memory";

type Draft = { name: string; currency: string | null; hours: string | null; about: string | null; unpriced: string[]; items: { name: string; price: number; description: string | null }[] };

const PROMPT = `You set up a small shop from what its owner gave you: text from their website, or their own description.
Reply with JSON only: {"name": string, "currency": string|null, "hours": string|null, "about": string|null, "items": [{"name": string, "price": number, "description": string|null}], "unpriced": [string]}.
name is the business name. currency is the ISO 4217 code the prices in the text are written in, such as "usd" or "eur" (a euro sign or EUR means "eur"); null when the text shows no prices. about is one plain sentence on what they sell. price is a number in the main currency unit.
items holds only things that have a clear price in the text. unpriced lists up to 15 things they clearly sell where no price is given. Never invent items, prices or hours. At most 40 items.`;

type Scrape = { markdown: string; links: string[] };

/** Firecrawl renders a page and returns clean markdown plus its links, which reads menus far better than raw HTML. */
async function scrape(target: string): Promise<Scrape | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ url: target, formats: ["markdown", "links"], onlyMainContent: true }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: { markdown?: string; links?: string[] } };
  return body.data?.markdown ? { markdown: body.data.markdown, links: body.data.links ?? [] } : null;
}

/** Looks a business up by name and returns its own site, skipping social and directory pages. */
async function findWebsite(name: string) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return undefined;
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ query: `${name} official website`, limit: 5 }),
  });
  if (!res.ok) return undefined;
  const body = (await res.json()) as { data?: { web?: { url: string }[] } };
  const skip = /instagram|facebook|yelp|tripadvisor|google|linkedin|tiktok|youtube|x\.com|twitter|wikipedia/i;
  return body.data?.web?.map((hit) => hit.url).find((url) => !skip.test(new URL(url).host));
}

const WORTH_READING = /menu|pric|order|shop|product|service|book|catering|about|hours|visit/i;

/** Reads the home page, then up to three more pages on the same site that look like menus, prices or hours. */
async function scrapeSite(target: string) {
  const home = await scrape(target);
  if (!home) return null;
  const host = new URL(target).host;
  const more = [...new Set(home.links)]
    .filter((link) => {
      try {
        const url = new URL(link);
        return url.host === host && url.href.replace(/\/$/, "") !== target.replace(/\/$/, "") && WORTH_READING.test(url.pathname);
      } catch {
        return false;
      }
    })
    .slice(0, 3);
  const pages = await Promise.all(more.map((link) => scrape(link)));
  return [home, ...pages]
    .filter((page): page is Scrape => page !== null)
    .map((page) => page.markdown.slice(0, 9000))
    .join("\n\n---\n\n");
}

async function readWebsite(url: string) {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const scraped = await scrapeSite(target);
  if (scraped) return scraped;
  const res = await fetch(target, { headers: { "user-agent": "OctopusSetup/1.0" } });
  if (!res.ok) throw new Error(`Could not open that website (${res.status})`);
  const html = await res.text();
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 14000);
}

async function draftShop(source: string): Promise<Draft> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.CHAT_MODEL ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: source },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Setup assistant error ${res.status}`);
  const body = (await res.json()) as { choices: { message: { content: string } }[] };
  return JSON.parse(body.choices[0].message.content) as Draft;
}

export const createShop = internalMutation({
  args: {
    name: v.string(),
    hours: v.optional(v.string()),
    currency: v.optional(v.string()),
    claimCode: v.string(),
    items: v.array(v.object({ name: v.string(), priceCents: v.number(), description: v.optional(v.string()) })),
  },
  handler: async (ctx, { name, hours, currency, claimCode, items }) => {
    const shopId = await ctx.db.insert("shops", {
      name,
      hours,
      currency,
      ownerId: `web:${claimCode}`,
      channelLink: process.env.SHOP_CHANNEL_LINK,
      createdAt: Date.now(),
    });
    for (const item of items) await ctx.db.insert("items", { shopId, ...item, available: true });
    return shopId;
  },
});

/** Builds a shop from a website or a description: name, hours, priced catalog, text line and a code to open it in the app. */
export const fromWeb = internalAction({
  args: { query: v.optional(v.string()), website: v.optional(v.string()), description: v.optional(v.string()) },
  handler: async (ctx, { query, website, description }): Promise<{ shopId: Id<"shops">; claimCode: string; source: string | null }> => {
    const typed = query?.trim().slice(0, 1200);
    const looksLikeSite = !!typed && /^\S+\.[a-z]{2,}(\/\S*)?$/i.test(typed);
    // A sentence or more is the owner describing the business; a few words is a name to look up.
    const describes = !!typed && !looksLikeSite && typed.split(/\s+/).length > 6;
    const site = website?.trim() || (looksLikeSite ? typed : typed && !describes ? await findWebsite(typed) : undefined);
    const told = description?.trim().slice(0, 4000) || (describes ? typed : typed && !looksLikeSite ? `The business is called "${typed}".` : undefined);
    if (!site && !told) throw new Error("Enter your website or your business name");
    if (!process.env.OPENAI_API_KEY) throw new Error("Setup is not available yet");
    const source = [site ? `Website ${site}:\n${await readWebsite(site)}` : "", told ? `Owner's description:\n${told}` : ""].join("\n\n");
    const draft = await draftShop(source);
    const name = (draft.name ?? "").trim() || "My shop";
    const items = (draft.items ?? [])
      .filter((i) => typeof i.name === "string" && i.name.trim() && typeof i.price === "number" && i.price >= 0)
      .slice(0, 40)
      .map((i) => ({ name: i.name.trim(), priceCents: Math.round(i.price * 100), description: i.description ?? undefined }));
    const claimCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const currency = /^[a-z]{3}$/i.test(draft.currency ?? "") ? draft.currency!.toLowerCase() : undefined;
    const shopId = await ctx.runMutation(internal.onboard.createShop, { name, hours: draft.hours ?? undefined, currency, claimCode, items });
    if (draft.about) await remember(brain.shopNotes(shopId), `About the shop: ${draft.about}`);
    if (site) await ctx.scheduler.runAfter(0, internal.onboard.addImages, { shopId, website: site });
    else await ctx.scheduler.runAfter(0, internal.onboard.illustrate, { shopId });
    await ctx.scheduler.runAfter(0, internal.onboard.categorize, { shopId });
    // Learn the brand in the background so the dashboard opens straight away.
    await ctx.scheduler.runAfter(0, internal.onboard.learnBrand, { shopId, source: site ?? told ?? name });
    if (draft.unpriced?.length) {
      await remember(brain.shopNotes(shopId), `The shop also sells these, but the price is not set yet, so ask the owner before taking an order for them: ${draft.unpriced.slice(0, 15).join(", ")}`);
    }
    return { shopId, claimCode, source: site ?? null };
  },
});

const suiteOf = (ctx: QueryCtx, shopId: Id<"shops">) => ctx.runQuery(internal.suite.overview, { shopId });

/** Everything the web page shows for one shop, in one read. */
export const state = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new Error("Shop not found");
    const [items, orders, arms, dashboard] = await Promise.all([
      ctx.runQuery(api.items.list, { shopId }),
      ctx.runQuery(api.orders.list, { shopId }),
      ctx.runQuery(api.events.countsToday, { shopId }),
      ctx.runQuery(internal.ownerTools.dashboard, { shopId }),
    ]);
    const suite: Awaited<ReturnType<typeof suiteOf>> = await suiteOf(ctx, shopId);
    return {
      shop: { name: shop.name, brand: shop.brand ?? null, currency: shop.currency ?? "usd", hours: shop.hours ?? null, channelLink: shop.channelLink ?? null, claimCode: shop.ownerId.startsWith("web:") ? shop.ownerId.slice(4) : null, ownerLink: process.env.OWNER_CHANNEL_LINK ?? null },
      items: items.map((i) => ({ name: i.name, category: i.category ?? null, priceCents: i.priceCents, available: i.available, stock: i.stock ?? null })),
      dashboard,
      suite,
      phoneRuns: await ctx.runQuery(internal.phone.recent, {}),
      orders: orders.slice(0, 8).map((o) => ({
        id: o._id,
        customer: o.customerName,
        lines: o.lines.map((l) => `${l.qty} × ${l.name}`),
        totalCents: o.totalCents,
        status: o.status,
        paid: o.paymentStatus === "paid",
        requestedTime: o.requestedTime ?? null,
      })),
      arms,
    };
  },
});

/** The phone app takes over a shop that was set up on the web. */
export const claim = mutation({
  args: { ownerId: v.string(), code: v.string() },
  handler: async (ctx, { ownerId, code }) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", `web:${code.trim().toUpperCase()}`))
      .first();
    if (!shop) throw new Error("That code does not match a shop");
    await ctx.db.patch(shop._id, { ownerId });
    return shop._id;
  },
});

/** What a shop's customer app shows: the menu, and that customer's current order if they have one. */
export const store = internalQuery({
  args: { shopId: v.id("shops"), orderId: v.optional(v.string()) },
  handler: async (ctx, { shopId, orderId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new Error("Shop not found");
    const items = await ctx.runQuery(api.items.list, { shopId });
    const id = orderId ? ctx.db.normalizeId("orders", orderId) : null;
    const order = id ? await ctx.db.get(id) : null;
    return {
      shop: { name: shop.name, currency: shop.currency ?? "usd", hours: shop.hours ?? null },
      items: items.map((i) => ({ name: i.name, priceCents: i.priceCents, description: i.description ?? null, imageUrl: i.imageUrl ?? null, category: i.category ?? null, available: i.available, stock: i.stock ?? null })),
      order:
        order && order.shopId === shopId
          ? {
              lines: order.lines.map((l) => `${l.qty} × ${l.name}`),
              totalCents: order.totalCents,
              status: order.status,
              paid: order.paymentStatus === "paid",
              paymentLink: order.paymentLink ?? null,
              requestedTime: order.requestedTime ?? null,
            }
          : null,
    };
  },
});

/** Shops that already exist, for the home page picker. The shop the text lines serve comes first. */
export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").order("desc").take(40);
    const rows = await Promise.all(
      shops.map(async (shop) => ({
        id: shop._id,
        name: shop.name,
        items: (await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shop._id)).collect()).length,
        textLine: shop._id === process.env.DEMO_SHOP_ID,
      })),
    );
    // One entry per name, text-line shop first; shops made by automated tests are left out.
    const seen = new Set<string>();
    return rows
      .filter((r) => r.items > 0 && !/test/i.test(r.name))
      .sort((a, b) => Number(b.textLine) - Number(a.textLine))
      .filter((r) => !seen.has(r.name) && seen.add(r.name));
  },
});

const BRAND_PROMPT = `From this text about a small business, write what an assistant must know to speak for the brand.
Reply with JSON only: {"voice": string, "facts": [string]}.
voice is one sentence on how the brand sounds (for example "warm, family-run, proud of authentic ingredients").
facts are up to 14 short, plain statements taken from the text: what they sell and are known for, who it is for, where they are and which areas they serve, delivery and pickup, payment, returns, contact details, opening times, their story. Never invent anything.`;

export const saveBrand = internalMutation({
  args: { shopId: v.id("shops"), voice: v.string(), facts: v.array(v.string()) },
  handler: (ctx, { shopId, voice, facts }) => ctx.db.patch(shopId, { brand: { voice, facts } }),
});

/** Builds the brand's brain in Supermemory from its website: a voice, a list of facts, and the pages themselves for recall. */
export const learnBrand = internalAction({
  args: { shopId: v.id("shops"), source: v.string() },
  handler: async (ctx, { shopId, source }): Promise<{ facts: number }> => {
    const text = /^\S+\.[a-z]{2,}(\/\S*)?$/i.test(source.trim()) || /^https?:/i.test(source.trim()) ? await readWebsite(source.trim()) : source;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL ?? "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: BRAND_PROMPT },
          { role: "user", content: text.slice(0, 24000) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Could not learn the brand (${res.status})`);
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const brand = JSON.parse(body.choices[0].message.content) as { voice?: string; facts?: string[] };
    const facts = (brand.facts ?? []).filter((f) => typeof f === "string" && f.trim()).slice(0, 14);
    const voice = (brand.voice ?? "").trim();
    await ctx.runMutation(internal.onboard.saveBrand, { shopId, voice, facts });
    const space = brain.brand(shopId);
    await Promise.all([
      ...(voice ? [remember(space, `How the brand sounds: ${voice}`)] : []),
      ...facts.map((fact) => remember(space, fact)),
      // The pages too, so questions the fact list did not anticipate can still be answered.
      ...[0, 1, 2, 3].map((i) => text.slice(i * 1800, (i + 1) * 1800)).filter(Boolean).map((chunk) => remember(space, chunk)),
    ]);
    return { facts: facts.length };
  },
});

/**
 * Product photos from the shop's own site. Shop pages list each product as an image link followed by a
 * heading link to the same product page, so photos are matched to names through that shared page address.
 */
async function productImages(website: string): Promise<Map<string, string>> {
  const target = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  const photos = new Map<string, string>();
  // Shops built on Shopify publish their whole catalog as a feed: every product, its variants and its photo.
  try {
    for (let page = 1; page <= 6; page++) {
      const feed = await fetch(`${new URL(target).origin}/products.json?limit=250&page=${page}`);
      if (!feed.ok) break;
      const body = (await feed.json()) as { products?: { title: string; variants?: { title: string }[]; images?: { src: string }[] }[] };
      if (!body.products?.length) break;
      for (const product of body.products) {
        const photo = product.images?.[0]?.src;
        if (!photo) continue;
        photos.set(product.title.trim().toLowerCase(), photo);
        for (const variant of product.variants ?? []) photos.set(`${product.title} ${variant.title}`.trim().toLowerCase(), photo);
      }
    }
  } catch {
    // Not a Shopify shop: fall through to reading the pages.
  }
  const home = await scrape(target);
  if (!home) return photos;
  // The home page shows only some products, so read the listing pages it links to as well.
  const host = new URL(target).host;
  const more = [...new Set(home.links)].filter((link) => link.includes(host) && /collections|products|shop|menu|catalog/i.test(link) && !/\/products\/[^/]+$/.test(link)).slice(0, 4);
  const pages = [home, ...(await Promise.all(more.map((link) => scrape(link)))).filter((p): p is Scrape => p !== null)];
  const markdown = pages.map((p) => p.markdown).join("\n");
  const byPage = new Map<string, string>();
  for (const m of markdown.matchAll(/\[!\[[^\]]*\]\((https?:\/\/[^)\s]+?)(?:%20\d+w)?\)\]\((https?:\/\/[^)\s"]+)/g)) {
    if (!byPage.has(m[2])) byPage.set(m[2], m[1]);
  }
  for (const m of markdown.matchAll(/#{2,4}\s*\[([^\]]+)\]\((https?:\/\/[^)\s"]+)/g)) {
    const photo = byPage.get(m[2]);
    const key = m[1].trim().toLowerCase();
    if (photo && !photos.has(key)) photos.set(key, photo);
  }
  return photos;
}

export const setImages = internalMutation({
  args: { shopId: v.id("shops"), photos: v.array(v.object({ name: v.string(), imageUrl: v.string() })) },
  handler: async (ctx, { shopId, photos }) => {
    const items = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
    let matched = 0;
    for (const item of items) {
      // Exact name first; then a size variant of the same product ("Urid Dal 2 KG" uses the "Urid Dal 500 Gm" photo).
      const name = item.name.trim().toLowerCase();
      const stem = name.replace(/\s*\d+(\.\d+)?\s*(kg|g|gm|gms|ml|l|ltr|pcs|pack)\b.*$/i, "").trim();
      const squash = (text: string) => text.replace(/[^a-z0-9]/g, "");
      const photo =
        photos.find((p) => p.name === name) ??
        photos.find((p) => squash(p.name) === squash(name)) ??
        (stem.length > 3 ? photos.find((p) => p.name.startsWith(stem)) ?? photos.find((p) => squash(stem).startsWith(squash(p.name)) && p.name.length > 5) : undefined);
      if (!photo) continue;
      await ctx.db.patch(item._id, { imageUrl: photo.imageUrl });
      matched += 1;
    }
    return matched;
  },
});

/** Adds product photos from the shop's website to the items already in its catalog. */
export const addImages = internalAction({
  args: { shopId: v.id("shops"), website: v.string() },
  handler: async (ctx, { shopId, website }): Promise<{ matched: number }> => {
    const photos = [...(await productImages(website)).entries()].map(([name, imageUrl]) => ({ name, imageUrl }));
    const matched = await ctx.runMutation(internal.onboard.setImages, { shopId, photos });
    await ctx.scheduler.runAfter(0, internal.onboard.illustrate, { shopId });
    return { matched };
  },
});

export const itemNames = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) =>
    (await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect()).map((i) => ({ id: i._id, name: i.name })),
});

export const setCategories = internalMutation({
  args: { rows: v.array(v.object({ id: v.id("items"), category: v.string() })) },
  handler: async (ctx, { rows }) => {
    for (const row of rows) await ctx.db.patch(row.id, { category: row.category });
  },
});

/** Sorts the catalog onto a few shelves so customers can browse instead of scrolling one long list. */
export const categorize = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<{ categories: string[] }> => {
    const items = await ctx.runQuery(internal.onboard.itemNames, { shopId });
    if (items.length < 6) return { categories: [] };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL ?? "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Group a shop\'s items into 3 to 7 customer-friendly categories, the way a good shopping app would (short names in sentence case, such as "Rice and grains", "Dals and pulses", "Snacks"). Every item gets exactly one category. Reply with JSON only: {"items": [{"n": number, "category": string}]} where n is the item number given.',
          },
          { role: "user", content: items.map((item, n) => `${n}. ${item.name}`).join("\n") },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Could not sort the catalog (${res.status})`);
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const sorted = (JSON.parse(body.choices[0].message.content) as { items: { n: number; category: string }[] }).items;
    const rows = sorted
      .filter((row) => items[row.n] && typeof row.category === "string" && row.category.trim())
      .map((row) => ({ id: items[row.n].id, category: row.category.trim().slice(0, 40) }));
    await ctx.runMutation(internal.onboard.setCategories, { rows });
    return { categories: [...new Set(rows.map((r) => r.category))] };
  },
});

export const unpictured = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    const items = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
    return { shopName: shop?.name ?? "", items: items.filter((i) => !i.imageUrl).slice(0, 16).map((i) => ({ id: i._id, name: i.name, category: i.category ?? "" })) };
  },
});

export const setImage = internalMutation({
  args: { id: v.id("items"), imageUrl: v.string() },
  handler: (ctx, { id, imageUrl }) => ctx.db.patch(id, { imageUrl }),
});

/**
 * A shop described in a sentence has no website to take photos from, so every item without a photo
 * gets a generated one. Real photos from the shop's own site always win; this only fills gaps.
 */
export const illustrate = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<{ made: number }> => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return { made: 0 };
    const { shopName, items } = await ctx.runQuery(internal.onboard.unpictured, { shopId });
    const made = await Promise.all(
      items.map(async (item) => {
        const res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({
            model: process.env.IMAGE_MODEL ?? "gpt-image-1-mini",
            size: "1024x1024",
            quality: "low",
            prompt: `Appetising, realistic product photo for the catalog of "${shopName}": ${item.name}${item.category ? ` (${item.category})` : ""}. One subject, centred, soft natural light, plain light background, square, no text, no logos, no people's faces.`,
          }),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as { data?: { b64_json?: string }[] };
        const encoded = body.data?.[0]?.b64_json;
        if (!encoded) return false;
        const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
        const storageId = await ctx.storage.store(new Blob([bytes], { type: "image/png" }));
        const url = await ctx.storage.getUrl(storageId);
        if (!url) return false;
        await ctx.runMutation(internal.onboard.setImage, { id: item.id, imageUrl: url });
        return true;
      }),
    );
    return { made: made.filter(Boolean).length };
  },
});
