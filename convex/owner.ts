import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { runTurn, tool } from "./agentLoop";
import { brain, remember } from "./memory";

export const OWNER_CHANNEL = "owner:in-app";

const SYSTEM = `You are the octopus that runs a small shop for its owner. The owner texts you and you do the work with your tools, then confirm in one short sentence what changed. Be brief and plain.
Act straight away when the request is clear. Ask one short question only when you truly cannot tell what they mean.
Prices are in the currency get_menu reports. Never invent menu items, orders or totals: read them with your tools.
Anything under "What you remember" is what the owner told you before. Use it.
When the owner mentions something customers should know (a special, closing early, an ingredient running out), call tell_customers.
For "sold out" or "back in stock" use update_item with available. For accepting, readying or cancelling an order use advance_order; the customer is told automatically.`;

const name = { type: "string", description: "Menu item name" };

export const OWNER_TOOLS = [
  tool("get_menu", "The whole menu with prices and what is sold out, plus opening hours."),
  tool("add_item", "Add a menu item.", { name, price: { type: "number" } }, ["name", "price"]),
  tool("update_item", "Change an item's price, name, or whether it is available.", { name, price: { type: "number" }, available: { type: "boolean" }, newName: { type: "string" } }, ["name"]),
  tool("remove_item", "Delete a menu item.", { name }, ["name"]),
  tool("set_hours", "Set the shop's opening hours.", { hours: { type: "string" } }, ["hours"]),
  tool("list_orders", "Today's orders with customer, items, total, status and payment."),
  tool(
    "advance_order",
    "Accept, mark ready, or cancel an order. Without a customer name it takes the newest order that can take that step.",
    { status: { type: "string", enum: ["accepted", "ready", "cancelled"] }, customer: { type: "string" } },
    ["status"],
  ),
  tool(
    "tell_customers",
    "Remember a note that customers should be told when relevant, such as an item running out, a special, or closing early.",
    { note: { type: "string" } },
    ["note"],
  ),
  tool("today_summary", "Today's order count, money collected, money still unpaid and the top seller."),
];

export function runOwnerTool(ctx: ActionCtx, shopId: Id<"shops">, toolName: string, args: Record<string, unknown>) {
  switch (toolName) {
    case "get_menu":
      return ctx.runQuery(internal.ownerTools.menu, { shopId });
    case "add_item":
      return ctx.runMutation(internal.ownerTools.addItem, { shopId, name: String(args.name), price: Number(args.price) });
    case "update_item":
      return ctx.runMutation(internal.ownerTools.updateItem, {
        shopId,
        name: String(args.name),
        price: typeof args.price === "number" ? args.price : undefined,
        available: typeof args.available === "boolean" ? args.available : undefined,
        newName: typeof args.newName === "string" ? args.newName : undefined,
      });
    case "remove_item":
      return ctx.runMutation(internal.ownerTools.removeItem, { shopId, name: String(args.name) });
    case "set_hours":
      return ctx.runMutation(internal.ownerTools.setHours, { shopId, hours: String(args.hours) });
    case "list_orders":
      return ctx.runQuery(internal.ownerTools.listOrders, { shopId });
    case "advance_order": {
      const status = args.status;
      if (status !== "accepted" && status !== "ready" && status !== "cancelled") throw new Error("Unknown status");
      return ctx.runMutation(internal.ownerTools.advanceOrder, { shopId, status, customer: typeof args.customer === "string" ? args.customer : undefined });
    }
    case "tell_customers":
      return remember(brain.shopNotes(shopId), `Note from the owner on ${new Date().toDateString()}: ${String(args.note)}`).then(() => ({ saved: true }));
    case "today_summary":
      return ctx.runMutation(internal.ownerTools.todaySummary, { shopId });
    default:
      throw new Error(`Unknown tool ${toolName}`);
  }
}

/** The owner texts the octopus from inside the app; the work happens through the same tools the text line uses. */
export const send = action({
  args: { shopId: v.id("shops"), text: v.string() },
  handler: (ctx, { shopId, text }) =>
    runTurn(ctx, {
      thread: { shopId, channelId: OWNER_CHANNEL },
      text,
      system: SYSTEM,
      tools: OWNER_TOOLS,
      run: (toolName, args) => runOwnerTool(ctx, shopId, toolName, args),
      recallFrom: [brain.owner(shopId), brain.shopNotes(shopId)],
      learnInto: brain.owner(shopId),
      speaker: "The owner",
    }),
});
