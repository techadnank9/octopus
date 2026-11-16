import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { brain, remember } from "./memory";

/** Functions for the native customer app. `device` is a random id the app keeps, one customer per device per shop. */
const channelOf = (device: string) => `demo:ios-${device.replace(/[^a-z0-9]/gi, "").slice(0, 24)}`;

type Shops = { id: Id<"shops">; name: string; items: number; textLine: boolean }[];
type Store = {
  shop: { name: string; currency: string; hours: string | null };
  items: { name: string; priceCents: number; description: string | null; imageUrl: string | null; available: boolean; stock: number | null }[];
  order: { lines: string[]; totalCents: number; status: string; paid: boolean; paymentLink: string | null; requestedTime: string | null } | null;
};

export const shops = query({
  args: {},
  handler: (ctx): Promise<Shops> => ctx.runQuery(internal.onboard.list, {}),
});

export const get = query({
  args: { shopId: v.id("shops"), orderId: v.optional(v.string()) },
  handler: (ctx, args): Promise<Store> => ctx.runQuery(internal.onboard.store, args),
});

/** The thread this device has with the shop's octopus. Send with `chat:send` using the same channel. */
export const channel = query({
  args: { device: v.string() },
  handler: (_ctx, { device }) => channelOf(device),
});

export const placeOrder = action({
  args: {
    shopId: v.id("shops"),
    device: v.string(),
    name: v.string(),
    requestedTime: v.optional(v.string()),
    lines: v.array(v.object({ name: v.string(), qty: v.number() })),
  },
  handler: async (ctx, { shopId, device, name, requestedTime, lines }): Promise<string> => {
    const who = name.trim().slice(0, 40);
    if (!who) throw new Error("Tell us your name so the shop knows who the order is for");
    const channelId = channelOf(device);
    const orderId = await ctx.runMutation(internal.orders.placeFromStore, {
      shopId,
      channelId,
      displayName: who,
      requestedTime: requestedTime?.trim() ? requestedTime.trim().slice(0, 40) : undefined,
      lines,
    });
    await ctx.runAction(internal.payments.createLink, { orderId }).catch(() => null);
    await remember(brain.customer(shopId, channelId), `${who} ordered ${lines.map((l) => `${l.qty} x ${l.name}`).join(", ")} in the customer app on ${new Date().toDateString()}.`);
    return orderId;
  },
});

export const book = mutation({
  args: { shopId: v.id("shops"), device: v.string(), name: v.string(), service: v.string(), when: v.string() },
  handler: async (ctx, { shopId, device, name, service, when }) => {
    await ctx.runMutation(internal.suite.book, { shopId, channelId: channelOf(device), service, when });
    if (name.trim()) await ctx.runMutation(internal.suite.nameCustomer, { shopId, channelId: channelOf(device), name: name.trim().slice(0, 40) });
    return null;
  },
});

export const review = mutation({
  args: { shopId: v.id("shops"), device: v.string(), rating: v.number(), text: v.string() },
  handler: async (ctx, { shopId, device, rating, text }) => {
    await ctx.runMutation(internal.suite.leaveReview, { shopId, channelId: channelOf(device), rating, text });
    return null;
  },
});
