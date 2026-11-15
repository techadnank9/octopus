import { action, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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

type Suite = {
  sales: { id: string; at: number; customer: string; items: string; totalCents: number; paid: boolean }[];
  tax: { rate: number; grossCents: number; taxCents: number; netCents: number };
  receipts: number;
  unpaid: number;
  bookings: { id: string; customer: string; service: string; when: string; status: string; reminded: boolean }[];
  reviews: { id: string; customer: string; rating: number; text: string; reply: string | null }[];
  reorder: { name: string; left: number }[];
  audience: { all: number; quiet: number };
};

/** Bookings, reviews, books, tax and reorder list for the phone app. */
export const suite = query({
  args: { shopId: v.id("shops") },
  handler: (ctx, { shopId }): Promise<Suite> => ctx.runQuery(internal.suite.overview, { shopId }),
});

/** The dashboard's buttons, for the phone app. Returns a short sentence saying what happened. */
export const run = action({
  args: {
    shopId: v.id("shops"),
    action: v.union(
      v.literal("announce"), v.literal("winback"), v.literal("chaseUnpaid"), v.literal("askReviews"),
      v.literal("remind"), v.literal("cancelBooking"), v.literal("replyReview"), v.literal("setTax"), v.literal("dailyTotal"),
    ),
    id: v.optional(v.string()),
    text: v.optional(v.string()),
    rate: v.optional(v.number()),
  },
  handler: async (ctx, { shopId, action: what, id, text, rate }): Promise<string> => {
    const people = (n: number) => `${n} ${n === 1 ? "customer" : "customers"}`;
    switch (what) {
      case "announce":
        return `Announcement sent to ${people((await ctx.runAction(internal.suite.broadcast, { shopId, group: "all", text })).sent)}.`;
      case "winback":
        return `Win-back text sent to ${people((await ctx.runAction(internal.suite.broadcast, { shopId, group: "quiet" })).sent)}.`;
      case "chaseUnpaid":
        return `Payment reminder sent to ${people((await ctx.runAction(internal.suite.broadcast, { shopId, group: "unpaid" })).sent)}.`;
      case "askReviews":
        return `Review request sent to ${people((await ctx.runAction(internal.suite.broadcast, { shopId, group: "happy" })).sent)}.`;
      case "remind":
        await ctx.runAction(internal.suite.remind, { bookingId: id as Id<"bookings"> });
        return "Reminder sent.";
      case "cancelBooking":
        await ctx.runMutation(internal.suite.cancelBooking, { bookingId: id as Id<"bookings"> });
        return "Booking cancelled.";
      case "replyReview":
        return `Reply sent: ${(await ctx.runAction(internal.suite.replyToReview, { reviewId: id as Id<"reviews"> })).reply}`;
      case "setTax":
        await ctx.runMutation(internal.suite.setTaxRate, { shopId, rate: rate ?? 0 });
        return "Tax rate saved.";
      case "dailyTotal":
        return (await ctx.runAction(internal.suite.sendDailyTotal, { shopId })).text;
    }
  },
});
