import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { brain, remember } from "./memory";

type Draft = { name: string; hours: string | null; about: string | null; items: { name: string; price: number; description: string | null }[] };

const PROMPT = `You set up a small shop from what its owner gave you: text from their website, or their own description.
Reply with JSON only: {"name": string, "hours": string|null, "about": string|null, "items": [{"name": string, "price": number, "description": string|null}]}.
name is the business name. about is one plain sentence on what they sell. price is a number in the main currency unit.
Only include items or services that have a clear price in the text. Never invent items, prices or hours. At most 25 items.`;

/** Firecrawl renders the page and returns clean markdown, which reads menus far better than raw HTML. */
async function scrapeWithFirecrawl(target: string) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ url: target, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: { markdown?: string } };
  return body.data?.markdown?.slice(0, 14000) || null;
}

async function readWebsite(url: string) {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const scraped = await scrapeWithFirecrawl(target);
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
    claimCode: v.string(),
    items: v.array(v.object({ name: v.string(), priceCents: v.number(), description: v.optional(v.string()) })),
  },
  handler: async (ctx, { name, hours, claimCode, items }) => {
    const shopId = await ctx.db.insert("shops", {
      name,
      hours,
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
  args: { website: v.optional(v.string()), description: v.optional(v.string()) },
  handler: async (ctx, { website, description }): Promise<{ shopId: Id<"shops">; claimCode: string }> => {
    const site = website?.trim();
    const told = description?.trim().slice(0, 4000);
    if (!site && !told) throw new Error("Give us a website or a few lines about your business");
    if (!process.env.OPENAI_API_KEY) throw new Error("Setup is not available yet");
    const source = [site ? `Website ${site}:\n${await readWebsite(site)}` : "", told ? `Owner's description:\n${told}` : ""].join("\n\n");
    const draft = await draftShop(source);
    const name = (draft.name ?? "").trim() || "My shop";
    const items = (draft.items ?? [])
      .filter((i) => typeof i.name === "string" && i.name.trim() && typeof i.price === "number" && i.price >= 0)
      .slice(0, 25)
      .map((i) => ({ name: i.name.trim(), priceCents: Math.round(i.price * 100), description: i.description ?? undefined }));
    const claimCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const shopId = await ctx.runMutation(internal.onboard.createShop, { name, hours: draft.hours ?? undefined, claimCode, items });
    if (draft.about) await remember(brain.shopNotes(shopId), `About the shop: ${draft.about}`);
    return { shopId, claimCode };
  },
});

/** Everything the web page shows for one shop, in one read. */
export const state = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new Error("Shop not found");
    const [items, orders, arms] = await Promise.all([
      ctx.runQuery(api.items.list, { shopId }),
      ctx.runQuery(api.orders.list, { shopId }),
      ctx.runQuery(api.events.countsToday, { shopId }),
    ]);
    return {
      shop: { name: shop.name, hours: shop.hours ?? null, channelLink: shop.channelLink ?? null, claimCode: shop.ownerId.startsWith("web:") ? shop.ownerId.slice(4) : null },
      items: items.map((i) => ({ name: i.name, priceCents: i.priceCents, available: i.available })),
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
