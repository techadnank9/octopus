import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { OWNER_CHANNEL } from "./owner";

export const invoiceLabel = (n: number) => `INV-${String(n).padStart(4, "0")}`;

const cash = (currency: string | undefined, cents: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: (currency ?? "usd").toUpperCase() }).format(cents / 100);

/** Gives an order the shop's next invoice number the first time one is needed. A mutation, so two requests can never share a number. */
export const numberInvoice = internalMutation({
  args: { shopId: v.id("shops"), orderId: v.id("orders") },
  handler: async (ctx, { shopId, orderId }) => {
    const [shop, order] = [await ctx.db.get(shopId), await ctx.db.get(orderId)];
    if (!shop || !order || order.shopId !== shopId) throw new Error("Order not found");
    let number = order.invoiceNumber;
    if (number === undefined) {
      number = (shop.invoiceSeq ?? 0) + 1;
      await ctx.db.patch(shopId, { invoiceSeq: number });
      await ctx.db.patch(orderId, { invoiceNumber: number });
    }
    return { number, order, shopName: shop.name, currency: shop.currency, taxRate: shop.taxRate ?? 0 };
  },
});

/** Messages the customer their invoice. Every figure comes from the stored order, none from the caller. */
export const sendInvoice = internalAction({
  args: { shopId: v.id("shops"), orderId: v.id("orders") },
  handler: async (ctx, args): Promise<{ invoice: string; text: string }> => {
    const { number, order, shopName, currency, taxRate } = await ctx.runMutation(internal.suite2.numberInvoice, args);
    const paid = order.paymentStatus === "paid";
    const tax = Math.round(order.totalCents - order.totalCents / (1 + taxRate / 100));
    const text = [
      `Invoice ${invoiceLabel(number)} from ${shopName}`,
      ...order.lines.map((l) => `${l.qty} x ${l.name}: ${cash(currency, l.qty * l.priceCents)}`),
      `Tax included (${taxRate}%): ${cash(currency, tax)}`,
      `Total: ${cash(currency, order.totalCents)}`,
      paid ? "Paid. Thank you!" : order.paymentLink ? "Payment due. You can pay with the link below." : "Payment due at pickup.",
    ].join("\n");
    await ctx.runAction(internal.notify.toCustomer, { shopId: args.shopId, customerId: order.customerId, text, link: paid ? undefined : order.paymentLink });
    return { invoice: invoiceLabel(number), text };
  },
});

const DEFAULT_REORDER_POINT = 3;
const pointOf = (item: Doc<"items">) => item.reorderPoint ?? DEFAULT_REORDER_POINT;

/** Counted items at or under their reorder point. The suggestion restocks to three times that point, enough to stop the same item coming straight back. */
export const reorderLines = (items: Doc<"items">[]) =>
  items
    .filter((i) => i.stock !== undefined && i.stock <= pointOf(i))
    .map((i) => ({ name: i.name, left: i.stock!, point: pointOf(i), suggest: Math.max(pointOf(i), 1) * 3 - i.stock! }));

/** Every counted item with its reorder point, for the owner to adjust. */
export const stockPoints = (items: Doc<"items">[]) =>
  items.filter((i) => i.stock !== undefined).map((i) => ({ name: i.name, left: i.stock!, point: pointOf(i) }));

export const setReorderPoint = internalMutation({
  args: { shopId: v.id("shops"), name: v.string(), point: v.number() },
  handler: async (ctx, { shopId, name, point }) => {
    if (!(point >= 0 && point <= 999)) throw new Error("Reorder point must be between 0 and 999");
    const items = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
    const item = items.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
    if (!item) throw new Error(`No menu item called "${name}"`);
    await ctx.db.patch(item._id, { reorderPoint: Math.floor(point) });
    return { name: item.name, point: Math.floor(point) };
  },
});

export const reorderList = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new Error("Shop not found");
    const items = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
    return { shopName: shop.name, lines: reorderLines(items) };
  },
});

/** Writes a purchase list the owner can forward to a supplier as it stands, and keeps a copy in their thread. */
export const draftReorder = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<{ text: string; items: number }> => {
    const { shopName, lines } = await ctx.runQuery(internal.suite2.reorderList, { shopId });
    if (lines.length === 0) return { text: "Nothing is at its reorder point right now.", items: 0 };
    const text = [`Purchase list for ${shopName}:`, ...lines.map((l) => `${l.name}: ${l.left} left, buy ${l.suggest}`)].join("\n");
    await ctx.runMutation(internal.notify.saveMessage, { shopId, channelId: OWNER_CHANNEL, role: "agent", text });
    return { text, items: lines.length };
  },
});

export const dueReminders = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) =>
    (await ctx.db.query("bookings").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect()).filter((b) => b.status === "booked" && !b.reminded).map((b) => b._id),
});

/** Reminds everyone with a live booking who has not had a reminder yet, so nobody is told twice. */
export const remindAll = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<{ sent: number }> => {
    const due = await ctx.runQuery(internal.suite2.dueReminders, { shopId });
    for (const bookingId of due) await ctx.runAction(internal.suite.remind, { bookingId });
    return { sent: due.length };
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many people each kind of message would reach, so the owner sees the size of a group before texting it. */
export function audienceCounts(customers: Doc<"customers">[], orders: Doc<"orders">[]) {
  const now = Date.now();
  const known = new Set(customers.map((c) => c._id));
  const who = (keep: (o: Doc<"orders">) => boolean) => new Set(orders.filter((o) => keep(o) && known.has(o.customerId)).map((o) => o.customerId)).size;
  return {
    all: customers.length,
    quiet: customers.filter((c) => (c.lastOrderAt ?? 0) < now - 7 * DAY_MS).length,
    unpaid: who((o) => o.paymentStatus === "unpaid"),
    today: who((o) => o.createdAt >= now - DAY_MS),
  };
}

export const specialBrief = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new Error("Shop not found");
    const orders = await ctx.db.query("orders").withIndex("by_shop", (q) => q.eq("shopId", shopId)).order("desc").take(200);
    const sold = new Map<string, number>();
    for (const o of orders) if (o.status !== "cancelled") for (const l of o.lines) sold.set(l.name, (sold.get(l.name) ?? 0) + l.qty);
    // Only something on sale now is worth announcing: the best seller still available, or any item when nothing has sold yet.
    const onSale = (await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect()).filter((i) => i.available).map((i) => i.name);
    const top = [...sold.entries()].sort((a, b) => b[1] - a[1]).find(([name]) => onSale.includes(name))?.[0];
    return { shopName: shop.name, voice: shop.brand?.voice ?? "warm and friendly", feature: top ? `the best seller, ${top}` : (onSale[0] ?? null) };
  },
});

/** Drafts one announcement in the shop's own voice. Nothing is sent: the owner edits it and presses send. */
export const draftSpecial = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<{ text: string }> => {
    const { shopName, voice, feature } = await ctx.runQuery(internal.suite2.specialBrief, { shopId });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL ?? "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You write one short text message a small shop sends to its regulars. Under 160 characters. Plain words, no emoji, no hashtags, no quotation marks. Never invent a price, a discount or a date." },
          { role: "user", content: `Shop: ${shopName}. Brand voice: ${voice}.${feature ? ` Feature ${feature}.` : ""} Write the announcement.` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Could not draft a special (${res.status})`);
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    return { text: body.choices[0].message.content.trim().slice(0, 500) };
  },
});

export const unanswered = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) =>
    (await ctx.db.query("reviews").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect()).filter((r) => !r.reply).map((r) => r._id),
});

/** Answers every review still waiting for a reply. Ten at a time keeps one tap inside the time an action may run. */
export const replyAll = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<{ sent: number }> => {
    const waiting = (await ctx.runQuery(internal.suite2.unanswered, { shopId })).slice(0, 10);
    for (const reviewId of waiting) await ctx.runAction(internal.suite.replyToReview, { reviewId });
    return { sent: waiting.length };
  },
});

/** Seven days of sales, newest first, with the tax inside them. A day is a 24-hour window ending now, as "today" is everywhere else, because a shop has no time zone on record; the page names each day from endsAt in the owner's own zone. */
export function weekOfSales(orders: Doc<"orders">[], taxRate: number) {
  const now = Date.now();
  return Array.from({ length: 7 }, (_, back) => {
    const endsAt = now - back * DAY_MS;
    const sold = orders.filter((o) => o.createdAt > endsAt - DAY_MS && o.createdAt <= endsAt);
    const grossCents = sold.reduce((t, o) => t + o.totalCents, 0);
    const taxCents = Math.round(grossCents - grossCents / (1 + taxRate / 100));
    return { date: new Date(endsAt).toISOString().slice(0, 10), endsAt, orders: sold.length, grossCents, taxCents, netCents: grossCents - taxCents };
  });
}
