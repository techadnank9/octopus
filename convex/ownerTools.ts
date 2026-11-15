import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ARMS, logArm } from "./events";

const DAY_MS = 24 * 60 * 60 * 1000;
const money = (cents: number) => (cents / 100).toFixed(2);

async function findItem(ctx: QueryCtx, shopId: Id<"shops">, name: string) {
  const items = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
  const wanted = name.trim().toLowerCase();
  const item = items.find((i) => i.name.toLowerCase() === wanted) ?? items.find((i) => i.name.toLowerCase().includes(wanted));
  if (!item) throw new Error(`No menu item called "${name}"`);
  return item;
}

async function todaysOrders(ctx: QueryCtx, shopId: Id<"shops">) {
  const since = Date.now() - DAY_MS;
  const orders = await ctx.db.query("orders").withIndex("by_shop", (q) => q.eq("shopId", shopId)).order("desc").take(100);
  return orders.filter((o) => o.createdAt >= since);
}

export const menu = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    const items = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
    return { shopName: shop!.name, hours: shop!.hours ?? null, items: items.map((i) => ({ name: i.name, price: money(i.priceCents), available: i.available })) };
  },
});

export const addItem = internalMutation({
  args: { shopId: v.id("shops"), name: v.string(), price: v.number() },
  handler: async (ctx, { shopId, name, price }) => {
    if (!name.trim()) throw new Error("Item name is required");
    if (!(price >= 0)) throw new Error("Price must be zero or more");
    await ctx.db.insert("items", { shopId, name: name.trim(), priceCents: Math.round(price * 100), available: true });
    return { added: name.trim(), price: money(Math.round(price * 100)) };
  },
});

export const updateItem = internalMutation({
  args: { shopId: v.id("shops"), name: v.string(), price: v.optional(v.number()), available: v.optional(v.boolean()), newName: v.optional(v.string()) },
  handler: async (ctx, { shopId, name, price, available, newName }) => {
    const item = await findItem(ctx, shopId, name);
    if (price !== undefined && !(price >= 0)) throw new Error("Price must be zero or more");
    await ctx.db.patch(item._id, {
      ...(price !== undefined ? { priceCents: Math.round(price * 100) } : {}),
      ...(available !== undefined ? { available } : {}),
      ...(newName?.trim() ? { name: newName.trim() } : {}),
    });
    const updated = (await ctx.db.get(item._id))!;
    return { name: updated.name, price: money(updated.priceCents), available: updated.available };
  },
});

export const removeItem = internalMutation({
  args: { shopId: v.id("shops"), name: v.string() },
  handler: async (ctx, { shopId, name }) => {
    const item = await findItem(ctx, shopId, name);
    await ctx.db.delete(item._id);
    return { removed: item.name };
  },
});

export const setHours = internalMutation({
  args: { shopId: v.id("shops"), hours: v.string() },
  handler: async (ctx, { shopId, hours }) => {
    await ctx.db.patch(shopId, { hours: hours.trim() });
    return { hours: hours.trim() };
  },
});

export const listOrders = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const orders = await todaysOrders(ctx, shopId);
    return Promise.all(
      orders.slice(0, 15).map(async (o) => {
        const customer = await ctx.db.get(o.customerId);
        return {
          customer: customer?.displayName ?? customer?.channelId ?? "Customer",
          items: o.lines.map((l) => `${l.qty} x ${l.name}`),
          total: money(o.totalCents),
          status: o.status,
          payment: o.paymentStatus,
          requestedTime: o.requestedTime ?? null,
        };
      }),
    );
  },
});

/** Moves an order on. With no customer given it takes the newest order that can take that step. */
export const advanceOrder = internalMutation({
  args: { shopId: v.id("shops"), status: v.union(v.literal("accepted"), v.literal("ready"), v.literal("cancelled")), customer: v.optional(v.string()) },
  handler: async (ctx, { shopId, status, customer }) => {
    const from = status === "accepted" ? ["new"] : status === "ready" ? ["new", "accepted"] : ["new", "accepted"];
    const wanted = customer?.trim().toLowerCase();
    for (const order of await todaysOrders(ctx, shopId)) {
      if (!from.includes(order.status)) continue;
      const who = await ctx.db.get(order.customerId);
      const name = who?.displayName ?? who?.channelId ?? "Customer";
      if (wanted && !name.toLowerCase().includes(wanted)) continue;
      await ctx.db.patch(order._id, { status });
      if (status !== "cancelled") {
        await logArm(ctx, shopId, ARMS.tellsCustomerReady);
        await ctx.scheduler.runAfter(0, internal.notify.orderUpdate, { orderId: order._id, status });
      }
      return { customer: name, status, items: order.lines.map((l) => `${l.qty} x ${l.name}`) };
    }
    throw new Error(wanted ? `No open order for "${customer}"` : "No open order to update");
  },
});

export const todaySummary = internalMutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const orders = (await todaysOrders(ctx, shopId)).filter((o) => o.status !== "cancelled");
    const sold = new Map<string, number>();
    for (const o of orders) for (const l of o.lines) sold.set(l.name, (sold.get(l.name) ?? 0) + l.qty);
    const top = [...sold.entries()].sort((a, b) => b[1] - a[1])[0];
    const sum = (paid: boolean) => orders.filter((o) => (o.paymentStatus === "paid") === paid).reduce((t, o) => t + o.totalCents, 0);
    await logArm(ctx, shopId, ARMS.dailyTotal);
    return { orders: orders.length, paidTotal: money(sum(true)), unpaidTotal: money(sum(false)), topItem: top ? `${top[0]} (${top[1]})` : null };
  },
});
