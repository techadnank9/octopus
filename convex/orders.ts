import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { ARMS, logArm } from "./events";

export const list = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const orders = await ctx.db.query("orders").withIndex("by_shop", (q) => q.eq("shopId", shopId)).order("desc").take(50);
    return Promise.all(
      orders.map(async (o) => {
        const customer = await ctx.db.get(o.customerId);
        return { ...o, customerName: customer?.displayName ?? customer?.channelId ?? "Customer" };
      }),
    );
  },
});

export async function findOrCreateCustomer(ctx: MutationCtx, shopId: Id<"shops">, channelId: string, displayName?: string) {
  const existing = await ctx.db
    .query("customers")
    .withIndex("by_shop_channel", (q) => q.eq("shopId", shopId).eq("channelId", channelId))
    .first();
  if (existing) return existing._id;
  return ctx.db.insert("customers", { shopId, channelId, displayName });
}

/** Builds an order from requested lines. Prices always come from the catalog, never from the caller. */
export async function placeOrder(
  ctx: MutationCtx,
  args: { shopId: Id<"shops">; channelId: string; displayName?: string; requestedTime?: string; lines: { name: string; qty: number }[] },
) {
  if (args.lines.length === 0) throw new Error("Order has no items");
  const catalog = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", args.shopId)).collect();
  const lines = args.lines.map((wanted) => {
    const item = catalog.find((i) => i.available && i.name.toLowerCase() === wanted.name.trim().toLowerCase());
    if (!item) throw new Error(`"${wanted.name}" is not on the menu`);
    const qty = Math.floor(wanted.qty);
    if (qty < 1 || qty > 50) throw new Error(`Quantity for ${item.name} must be between 1 and 50`);
    return { itemId: item._id, name: item.name, qty, priceCents: item.priceCents };
  });
  const totalCents = lines.reduce((sum, l) => sum + l.qty * l.priceCents, 0);
  const customerId = await findOrCreateCustomer(ctx, args.shopId, args.channelId, args.displayName);
  const now = Date.now();
  const orderId = await ctx.db.insert("orders", {
    shopId: args.shopId,
    customerId,
    lines,
    totalCents,
    requestedTime: args.requestedTime,
    status: "new",
    paymentStatus: "unpaid",
    createdAt: now,
  });
  await ctx.db.patch(customerId, { lastOrderAt: now });
  await logArm(ctx, args.shopId, ARMS.takesOrders);
  await logArm(ctx, args.shopId, ARMS.pingsOwner);
  return { orderId, totalCents, lines };
}

export const setStatus = mutation({
  args: { orderId: v.id("orders"), status: v.union(v.literal("accepted"), v.literal("ready"), v.literal("cancelled")) },
  handler: async (ctx, { orderId, status }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    await ctx.db.patch(orderId, { status });
    if (status === "cancelled") return;
    await logArm(ctx, order.shopId, ARMS.tellsCustomerReady);
    // The customer texted first, so we may message them back about their own order.
    await ctx.scheduler.runAfter(0, internal.notify.orderUpdate, { orderId, status });
  },
});

export const markPaidDemo = mutation({
  args: { orderId: v.id("orders") },
  handler: (ctx, { orderId }) => ctx.db.patch(orderId, { paymentStatus: "paid" }),
});

export const markPaidByWebhook = internalMutation({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const id = ctx.db.normalizeId("orders", orderId);
    if (id && (await ctx.db.get(id))) await ctx.db.patch(id, { paymentStatus: "paid" });
  },
});

export const createDemo = mutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const catalog = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).take(2);
    if (catalog.length === 0) throw new Error("Add a menu item first");
    const names = ["Priya", "Sam", "Jordan", "Alex"];
    const displayName = names[Math.floor(Math.random() * names.length)];
    await placeOrder(ctx, {
      shopId,
      channelId: `demo:${displayName.toLowerCase()}`,
      displayName,
      requestedTime: "3 PM",
      lines: catalog.map((item, i) => ({ name: item.name, qty: i === 0 ? 2 : 1 })),
    });
  },
});

export const get = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    const customer = await ctx.db.get(order.customerId);
    const shop = await ctx.db.get(order.shopId);
    return { order, channelId: customer!.channelId, shopName: shop!.name };
  },
});

export const setPaymentLink = internalMutation({
  args: { orderId: v.id("orders"), paymentLink: v.string() },
  handler: async (ctx, { orderId, paymentLink }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    await ctx.db.patch(orderId, { paymentLink });
    await logArm(ctx, order.shopId, ARMS.sendsPayLink);
  },
});
