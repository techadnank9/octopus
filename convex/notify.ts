import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const TEXT = {
  accepted: "Your order is accepted. We're on it.",
  ready: "Your order is ready. See you in a sec!",
} as const;

export const saveMessage = internalMutation({
  args: {
    shopId: v.id("shops"),
    channelId: v.string(),
    role: v.union(v.literal("customer"), v.literal("agent")),
    text: v.string(),
    link: v.optional(v.string()),
    fromOwner: v.optional(v.boolean()),
  },
  handler: (ctx, message) => ctx.db.insert("messages", message),
});

/** Tells the customer their order moved on: in-app thread always, Keiki notice when that agent is configured. */
export const orderUpdate = internalAction({
  args: { orderId: v.id("orders"), status: v.union(v.literal("accepted"), v.literal("ready")) },
  handler: async (ctx, { orderId, status }) => {
    const { order, channelId } = await ctx.runQuery(internal.orders.get, { orderId });
    if (channelId.startsWith("demo:")) {
      await ctx.runMutation(internal.notify.saveMessage, { shopId: order.shopId, channelId, role: "agent", text: TEXT[status] });
      return;
    }
    const key = process.env.KEIKI_API_KEY;
    const agentId = process.env.KEIKI_AGENT_ID;
    if (!key || !agentId) return;
    await fetch(`https://onkeiki.com/api/v1/developer/agents/${agentId}/notice`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ phone: channelId, text: `The shop marked this customer's order as ${status}. Tell them now, briefly.` }),
    });
  },
});

export const customerChannel = internalQuery({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => (await ctx.db.get(customerId))?.channelId ?? null,
});

/** Messages a customer who contacted the shop first: in their web or in-app thread, or as a notice on the text line. */
export const toCustomer = internalAction({
  args: { shopId: v.id("shops"), customerId: v.id("customers"), text: v.string(), link: v.optional(v.string()) },
  handler: async (ctx, { shopId, customerId, text, link }) => {
    const channelId = await ctx.runQuery(internal.notify.customerChannel, { customerId });
    if (!channelId) return;
    if (channelId.startsWith("demo:")) {
      await ctx.runMutation(internal.notify.saveMessage, { shopId, channelId, role: "agent", text, link });
      return;
    }
    const key = process.env.KEIKI_API_KEY;
    const agentId = process.env.KEIKI_AGENT_ID;
    if (!key || !agentId) return;
    await fetch(`https://onkeiki.com/api/v1/developer/agents/${agentId}/notice`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ phone: channelId, text: `Tell the customer this now, in these words: ${text}${link ? ` Link: ${link}` : ""}` }),
    });
  },
});

export const receipt = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order, shopName, currency } = await ctx.runQuery(internal.orders.get, { orderId });
    const total = new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() }).format(order.totalCents / 100);
    const lines = order.lines.map((l) => `${l.qty} x ${l.name}`).join(", ");
    await ctx.runAction(internal.notify.toCustomer, {
      shopId: order.shopId,
      customerId: order.customerId,
      text: `Receipt from ${shopName}: ${lines}. Total ${total}, paid. Thank you!`,
    });
  },
});
