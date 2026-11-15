import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const mine = query({
  args: { ownerId: v.string() },
  handler: (ctx, { ownerId }) =>
    ctx.db.query("shops").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first(),
});

export const create = mutation({
  args: { ownerId: v.string(), name: v.string(), hours: v.optional(v.string()) },
  handler: async (ctx, { ownerId, name, hours }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Shop name is required");
    const existing = await ctx.db.query("shops").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first();
    if (existing) return existing._id;
    return ctx.db.insert("shops", {
      ownerId,
      name: trimmed,
      hours: hours?.trim() || undefined,
      channelLink: process.env.SHOP_CHANNEL_LINK,
      createdAt: Date.now(),
    });
  },
});
