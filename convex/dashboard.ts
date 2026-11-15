import { query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

type Dashboard = {
  today: { orders: number; paidCents: number; unpaidCents: number; averageCents: number };
  topSellers: { name: string; qty: number }[];
  alerts: string[];
  customers: { name: string; orders: number; spentCents: number; usual: string | null; lastOrderAt: number }[];
};

/** The owner's dashboard for the phone app: today's money, alerts, top sellers and customers. */
export const get = query({
  args: { shopId: v.id("shops") },
  handler: (ctx, { shopId }): Promise<Dashboard> => ctx.runQuery(internal.ownerTools.dashboard, { shopId }),
});
