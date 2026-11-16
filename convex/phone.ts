import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const TESTS = ["create-shop-and-menu", "order-arrives-live", "accept-then-ready", "arms-counters"] as const;

/** The dashboard asked to run the phone app on a Revyl cloud iPhone: a live session, or one of the saved tests. */
export const request = internalMutation({
  args: { kind: v.union(v.literal("device"), v.literal("store"), v.literal("test")), name: v.optional(v.string()), shopId: v.optional(v.id("shops")) },
  handler: async (ctx, { kind, name, shopId }) => {
    if (kind !== "test" && !shopId) throw new Error("Which shop?");
    if (kind === "test" && !TESTS.includes(name as (typeof TESTS)[number])) throw new Error("Unknown test");
    const waiting = (await ctx.db.query("phoneRuns").order("desc").take(10)).filter((r) => r.status === "queued" || r.status === "running");
    if (waiting.length >= 3) throw new Error("Three runs are already in progress. Wait for one to finish.");
    await ctx.db.insert("phoneRuns", {
      kind,
      name: kind === "test" ? name! : kind === "store" ? "Customer app on iPhone" : "Owner app on iPhone",
      // Deep links: the owner app and the customer app each open straight into this shop.
      target: kind === "store" ? `octopusshop://shop/${shopId}` : kind === "device" ? `octopus://shop/${shopId}` : undefined,
      status: "queued",
    });
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
    return { id: next._id, kind: next.kind, name: next.name, target: next.target ?? "" };
  },
});

export const finish = internalMutation({
  args: { id: v.id("phoneRuns"), status: v.union(v.literal("passed"), v.literal("failed"), v.literal("open")), url: v.optional(v.string()) },
  handler: (ctx, { id, status, url }) => ctx.db.patch(id, { status, url }),
});

/** Live phones end after a while. Runs whose session is no longer alive are marked ended so the dashboard starts a fresh one. */
export const reconcile = internalMutation({
  args: { live: v.array(v.string()) },
  handler: async (ctx, { live }) => {
    for (const run of await ctx.db.query("phoneRuns").order("desc").take(30)) {
      if (run.status === "open" && !live.some((id) => run.url?.includes(id))) await ctx.db.patch(run._id, { status: "ended" });
    }
  },
});
