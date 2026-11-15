import { query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const ARMS = {
  takesOrders: 1,
  answersQuestions: 2,
  sendsPayLink: 3,
  remembersRegulars: 4,
  readsMenu: 5,
  pingsOwner: 6,
  tellsCustomerReady: 7,
  dailyTotal: 8,
} as const;

export const logArm = (ctx: MutationCtx, shopId: Id<"shops">, arm: number) =>
  ctx.db.insert("events", { shopId, arm, createdAt: Date.now() });

const DAY_MS = 24 * 60 * 60 * 1000;

export const countsToday = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const since = Date.now() - DAY_MS;
    const events = await ctx.db
      .query("events")
      .withIndex("by_shop_time", (q) => q.eq("shopId", shopId).gte("createdAt", since))
      .collect();
    const counts = Array<number>(8).fill(0);
    for (const e of events) counts[e.arm - 1] += 1;
    return counts;
  },
});
