import { action, internalQuery, query, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { brain } from "./memory";
import { runTurn, tool, type Thread, type ToolState } from "./agentLoop";
import { v } from "convex/values";

const SYSTEM = `You are the text assistant for a small shop. Introduce yourself once as the shop's octopus. Be short, warm and quick: one or two sentences.
Prices are in the currency get_menu reports; say them in that currency.
Only offer items that get_menu returns. Never invent items, prices or hours.
At the start of a conversation call get_customer_memory. If there is a usual order, offer it: "Same as last time?"
Confirm the full order and total in one message before creating it. Only call create_order after the customer says yes.
Right after create_order, call create_payment_link and tell the customer to pay with the link to confirm. Do not paste the link yourself; it is attached for you.
Anything under "What you remember" is true: shop notes from the owner, and what this customer said or ordered before. Use it.
If asked something you cannot answer, say you will check with the owner. Do not guess.
Never ask for card numbers or other sensitive details. Payment happens only through the link.`;

const TOOLS = [
  tool("get_menu", "The shop name, opening hours and available items with prices."),
  tool("get_customer_memory", "This customer's usual order and notes, if they ordered before."),
  tool("get_order_status", "Status of this customer's latest order."),
  tool(
    "create_order",
    "Place the confirmed order. Prices are set by the shop, not by you.",
    {
      lines: {
        type: "array",
        items: { type: "object", properties: { name: { type: "string" }, qty: { type: "number" } }, required: ["name", "qty"] },
      },
      requestedTime: { type: "string", description: "Pickup time as the customer said it" },
    },
    ["lines"],
  ),
  tool("create_payment_link", "Create the payment link for this customer's latest order."),
  tool("save_customer_memory", "Remember one fact about this customer.", { note: { type: "string" } }, ["note"]),
];

export const thread = query({
  args: { shopId: v.id("shops"), channelId: v.string() },
  handler: (ctx, { shopId, channelId }) =>
    ctx.db.query("messages").withIndex("by_thread", (q) => q.eq("shopId", shopId).eq("channelId", channelId)).collect(),
});

export const recent = internalQuery({
  args: { shopId: v.id("shops"), channelId: v.string() },
  handler: async (ctx, { shopId, channelId }) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("shopId", shopId).eq("channelId", channelId))
      .order("desc")
      .take(20);
    return rows.reverse().map((m) => ({ role: m.role === "customer" ? "user" : "assistant", content: m.text }));
  },
});

async function runTool(ctx: ActionCtx, t: Thread, name: string, args: Record<string, unknown>, state: ToolState) {
  switch (name) {
    case "get_menu":
      return ctx.runMutation(internal.agent.getMenu, { shopId: t.shopId });
    case "get_customer_memory":
      return ctx.runMutation(internal.agent.getCustomerMemory, t);
    case "get_order_status":
      return ctx.runQuery(internal.agent.getOrderStatus, t);
    case "create_order":
      return ctx.runMutation(internal.agent.createOrder, {
        ...t,
        requestedTime: typeof args.requestedTime === "string" ? args.requestedTime : undefined,
        lines: (args.lines as { name: string; qty: number }[]).map((l) => ({ name: String(l.name), qty: Number(l.qty) })),
      });
    case "create_payment_link": {
      const latest = await ctx.runQuery(internal.agent.getOrderStatus, t);
      if (!latest.found) throw new Error("No order to pay for yet");
      const { url, total } = await ctx.runAction(internal.payments.createLink, { orderId: latest.orderId });
      state.link = url;
      return { created: true, total };
    }
    case "save_customer_memory":
      return ctx.runMutation(internal.agent.saveCustomerMemory, { ...t, note: String(args.note ?? "") });
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

/** In-app customer chat: the same tools the text agent uses, run against the same catalog and orders. */
export const send = action({
  args: { shopId: v.id("shops"), channelId: v.string(), text: v.string() },
  handler: (ctx, { shopId, channelId, text }) => {
    const thread = { shopId, channelId };
    return runTurn(ctx, {
      thread,
      text,
      system: SYSTEM,
      tools: TOOLS,
      run: (name, args, state) => runTool(ctx, thread, name, args, state),
      recallFrom: [brain.shopNotes(shopId), brain.customer(shopId, channelId)],
      learnInto: brain.customer(shopId, channelId),
      speaker: "The customer",
    });
  },
});
