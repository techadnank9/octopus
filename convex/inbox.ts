import { action, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { OWNER_CHANNEL } from "./owner";

/** Words that mean a customer is unhappy or the octopus handed the question to the owner. */
const UPSET = /\b(complain|complaint|refund|wrong|late|missing|cold|stale|damaged|broken|bad|terrible|awful|disappoint|rude|never again|not happy|unhappy|money back|overcharged|expired)\b/i;
const HANDED_OVER = /check with the owner/i;

type Conversation = {
  channelId: string;
  customer: string;
  lastText: string;
  lastFromCustomer: boolean;
  lastAt: number;
  messages: number;
  needsYou: boolean;
  reason: string | null;
};

/** The owner's inbox: one row per customer conversation, the ones that need a person first. */
export const list = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<Conversation[]> => {
    const messages = await ctx.db.query("messages").withIndex("by_thread", (q) => q.eq("shopId", shopId)).collect();
    const threads = new Map<string, typeof messages>();
    for (const m of messages) {
      if (m.channelId === OWNER_CHANNEL) continue;
      threads.set(m.channelId, [...(threads.get(m.channelId) ?? []), m]);
    }
    const rows: Conversation[] = [];
    for (const [channelId, thread] of threads) {
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_shop_channel", (q) => q.eq("shopId", shopId).eq("channelId", channelId))
        .first();
      const last = thread[thread.length - 1];
      // Only what happened since the owner last stepped in counts, so a handled complaint drops down the list.
      const lastOwner = thread.map((m) => m.fromOwner === true).lastIndexOf(true);
      const open = thread.slice(lastOwner + 1);
      const upset = open.find((m) => m.role === "customer" && UPSET.test(m.text));
      const handed = open.find((m) => m.role === "agent" && HANDED_OVER.test(m.text));
      rows.push({
        channelId,
        customer: customer?.displayName ?? (channelId.startsWith("demo:") ? "Guest" : channelId),
        lastText: last.text.slice(0, 140),
        lastFromCustomer: last.role === "customer",
        lastAt: last._creationTime,
        messages: thread.length,
        needsYou: !!(upset || handed),
        reason: upset ? "Complaint" : handed ? "Octopus could not answer" : null,
      });
    }
    return rows.sort((a, b) => Number(b.needsYou) - Number(a.needsYou) || b.lastAt - a.lastAt);
  },
});

/** The owner answers a customer personally. It lands in the same conversation the octopus is having. */
export const reply = action({
  args: { shopId: v.id("shops"), channelId: v.string(), text: v.string() },
  handler: async (ctx, { shopId, channelId, text }) => {
    const clean = text.trim().slice(0, 1000);
    if (!clean) throw new Error("Write a reply first");
    if (channelId === OWNER_CHANNEL) throw new Error("That is your own conversation");
    await ctx.runMutation(internal.notify.saveMessage, { shopId, channelId, role: "agent", text: clean, fromOwner: true });
    return null;
  },
});
