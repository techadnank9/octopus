import { internalMutation, mutation, query } from "./_generated/server";
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

/** Points every shop at the current text line. Run after the channel link changes. */
export const refreshChannelLink = internalMutation({
  args: {},
  handler: async (ctx) => {
    const link = process.env.SHOP_CHANNEL_LINK;
    for (const shop of await ctx.db.query("shops").collect()) await ctx.db.patch(shop._id, { channelLink: link });
  },
});
