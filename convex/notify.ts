import { internalAction, internalMutation } from "./_generated/server";
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
