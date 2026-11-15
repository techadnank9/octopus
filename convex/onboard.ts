import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
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
    const typed = query?.trim().slice(0, 200);
    const looksLikeSite = !!typed && /^\S+\.[a-z]{2,}(\/\S*)?$/i.test(typed);
    const site = website?.trim() || (looksLikeSite ? typed : typed ? await findWebsite(typed) : undefined);
    const told = description?.trim().slice(0, 4000) || (typed && !looksLikeSite ? `The business is called "${typed}".` : undefined);
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
    if (draft.unpriced?.length) {
      await remember(brain.shopNotes(shopId), `The shop also sells these, but the price is not set yet, so ask the owner before taking an order for them: ${draft.unpriced.slice(0, 15).join(", ")}`);
    }
    return { shopId, claimCode, source: site ?? null };
  },
});

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
    return {
      shop: { name: shop.name, currency: shop.currency ?? "usd", hours: shop.hours ?? null, channelLink: shop.channelLink ?? null, claimCode: shop.ownerId.startsWith("web:") ? shop.ownerId.slice(4) : null, ownerLink: process.env.OWNER_CHANNEL_LINK ?? null },
      items: items.map((i) => ({ name: i.name, priceCents: i.priceCents, available: i.available, stock: i.stock ?? null })),
      dashboard,
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
      items: items.map((i) => ({ name: i.name, priceCents: i.priceCents, description: i.description ?? null, available: i.available, stock: i.stock ?? null })),
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
