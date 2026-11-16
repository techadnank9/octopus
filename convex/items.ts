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

/** Sets how many units are left, or stops counting when stock is omitted. Zero switches the item off. */
export const setStock = mutation({
  args: { id: v.id("items"), stock: v.optional(v.number()) },
  handler: async (ctx, { id, stock }) => {
    if (stock === undefined) {
      await ctx.db.patch(id, { stock: undefined });
      return null;
    }
    const left = Math.max(0, Math.floor(stock));
    await ctx.db.patch(id, { stock: left, available: left > 0 });
    return null;
  },
});

export const setAvailable = mutation({
  args: { id: v.id("items"), available: v.boolean() },
  handler: async (ctx, { id, available }) => {
    await ctx.db.patch(id, { available });
    return null;
  },
});

/** Moves an item to another shelf. An empty name clears it. */
export const setCategory = mutation({
  args: { id: v.id("items"), category: v.string() },
  handler: async (ctx, { id, category }) => {
    await ctx.db.patch(id, { category: category.trim().slice(0, 40) || undefined });
    return null;
  },
});
