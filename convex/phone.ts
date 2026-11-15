import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const TESTS = ["create-shop-and-menu", "order-arrives-live", "accept-then-ready", "arms-counters"] as const;

/** The dashboard asked to run the phone app on a Revyl cloud iPhone: a live session, or one of the saved tests. */
export const request = internalMutation({
  args: { kind: v.union(v.literal("device"), v.literal("test")), name: v.optional(v.string()) },
  handler: async (ctx, { kind, name }) => {
    if (kind === "test" && !TESTS.includes(name as (typeof TESTS)[number])) throw new Error("Unknown test");
    const waiting = (await ctx.db.query("phoneRuns").order("desc").take(10)).filter((r) => r.status === "queued" || r.status === "running");
    if (waiting.length >= 3) throw new Error("Three runs are already in progress. Wait for one to finish.");
    await ctx.db.insert("phoneRuns", { kind, name: kind === "test" ? name! : "Live iPhone", status: "queued" });
    return { queued: true };
  },
});

export const recent = internalQuery({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("phoneRuns").order("desc").take(6)).map((r) => ({ name: r.name, kind: r.kind, status: r.status, url: r.url ?? null })),
});

/** The runner on the build machine takes the oldest queued run. */
export const claim = internalMutation({
  args: {},
  handler: async (ctx) => {
    const next = (await ctx.db.query("phoneRuns").order("asc").collect()).find((r) => r.status === "queued");
    if (!next) return null;
    await ctx.db.patch(next._id, { status: "running" });
    return { id: next._id, kind: next.kind, name: next.name };
  },
});

export const finish = internalMutation({
  args: { id: v.id("phoneRuns"), status: v.union(v.literal("passed"), v.literal("failed"), v.literal("open")), url: v.optional(v.string()) },
  handler: (ctx, { id, status, url }) => ctx.db.patch(id, { status, url }),
});
