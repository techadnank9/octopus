import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ARMS, logArm } from "./events";
import { placeOrder } from "./orders";

/** The demo runs one shop, so the text agent may omit shopId. */
export const resolveShop = internalQuery({
  args: { shopId: v.optional(v.string()) },
  handler: async (ctx, { shopId }) => {
    // The text lines serve one shop: the one named in DEMO_SHOP_ID, else the newest.
    const id = ctx.db.normalizeId("shops", shopId ?? process.env.DEMO_SHOP_ID ?? "");
    const shop = id ? await ctx.db.get(id) : await ctx.db.query("shops").order("desc").first();
    if (!shop) throw new Error("No shop found");
    return shop._id;
  },
});

export const getMenu = internalMutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    const items = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
    await logArm(ctx, shopId, ARMS.answersQuestions);
    return {
      shopName: shop!.name,
      hours: shop!.hours ?? null,
      currency: shop!.currency ?? "usd",
      items: items
        .filter((i) => i.available)
        .map((i) => ({ name: i.name, price: (i.priceCents / 100).toFixed(2), description: i.description ?? null })),
    };
  },
});

export const createOrder = internalMutation({
  args: {
    shopId: v.id("shops"),
    channelId: v.string(),
    requestedTime: v.optional(v.string()),
    lines: v.array(v.object({ name: v.string(), qty: v.number() })),
  },
  handler: async (ctx, args) => {
    const { orderId, totalCents, lines } = await placeOrder(ctx, args);
    return { orderId, total: (totalCents / 100).toFixed(2), lines: lines.map((l) => `${l.qty} x ${l.name}`) };
  },
});

export const getOrderStatus = internalQuery({
  args: { shopId: v.id("shops"), channelId: v.string() },
  handler: async (ctx, { shopId, channelId }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_shop_channel", (q) => q.eq("shopId", shopId).eq("channelId", channelId))
      .first();
    const order = customer && (await ctx.db.query("orders").withIndex("by_customer", (q) => q.eq("customerId", customer._id)).order("desc").first());
    if (!order) return { found: false as const };
    return { found: true as const, orderId: order._id, status: order.status, paymentStatus: order.paymentStatus, total: (order.totalCents / 100).toFixed(2) };
  },
});

export const getCustomerMemory = internalMutation({
  args: { shopId: v.id("shops"), channelId: v.string() },
  handler: async (ctx, { shopId, channelId }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_shop_channel", (q) => q.eq("shopId", shopId).eq("channelId", channelId))
      .first();
    if (!customer) return { known: false as const };
    const last = await ctx.db.query("orders").withIndex("by_customer", (q) => q.eq("customerId", customer._id)).order("desc").first();
    await logArm(ctx, shopId, ARMS.remembersRegulars);
    return {
      known: true as const,
      usualOrder: last ? last.lines.map((l) => ({ name: l.name, qty: l.qty })) : null,
      notes: customer.notes ?? [],
    };
  },
});

export const saveCustomerMemory = internalMutation({
  args: { shopId: v.id("shops"), channelId: v.string(), note: v.string() },
  handler: async (ctx, { shopId, channelId, note }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_shop_channel", (q) => q.eq("shopId", shopId).eq("channelId", channelId))
      .first();
    if (!customer) throw new Error("Unknown customer");
    await ctx.db.patch(customer._id, { notes: [...(customer.notes ?? []), note.slice(0, 300)].slice(-20) });
    return { saved: true };
  },
});
