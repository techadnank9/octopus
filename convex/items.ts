import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { shopId: v.id("shops") },
  handler: (ctx, { shopId }) =>
    ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect(),
});

export const save = mutation({
  args: { shopId: v.id("shops"), id: v.optional(v.id("items")), name: v.string(), priceCents: v.number() },
  handler: async (ctx, { shopId, id, name, priceCents }) => {
    const clean = { name: name.trim(), priceCents: Math.round(priceCents) };
    if (!clean.name) throw new Error("Item name is required");
    if (clean.priceCents < 0) throw new Error("Price cannot be negative");
    if (id) {
      await ctx.db.patch(id, clean);
      return id;
    }
    return ctx.db.insert("items", { shopId, ...clean, available: true });
  },
});

export const remove = mutation({
  args: { id: v.id("items") },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
