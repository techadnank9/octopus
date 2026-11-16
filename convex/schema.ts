import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const orderLine = v.object({
  itemId: v.id("items"),
  name: v.string(),
  qty: v.number(),
  priceCents: v.number(),
});

export default defineSchema({
  shops: defineTable({
    name: v.string(),
    ownerId: v.string(),
    hours: v.optional(v.string()),
    channelLink: v.optional(v.string()),
    /** ISO 4217 code in lower case, such as "usd" or "eur". Dollars when absent. */
    currency: v.optional(v.string()),
    /** Sales tax or VAT included in prices, in percent. */
    taxRate: v.optional(v.number()),
    /** What the octopus learned about the brand, as shown on the dashboard. The same facts live in Supermemory. */
    brand: v.optional(v.object({ voice: v.string(), facts: v.array(v.string()) })),
    /** The last invoice number handed out, so numbers run in order with no gaps. */
    invoiceSeq: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  items: defineTable({
    shopId: v.id("shops"),
    name: v.string(),
    priceCents: v.number(),
    description: v.optional(v.string()),
    available: v.boolean(),
    /** Shelf the item sits on in the customer app, such as "Rice and grains". */
    category: v.optional(v.string()),
    /** Product photo taken from the shop's own website. */
    imageUrl: v.optional(v.string()),
    /** Units left. Absent means the shop does not count this item. */
    stock: v.optional(v.number()),
    /** Reorder when stock falls to this many. Three when absent. */
    reorderPoint: v.optional(v.number()),
  }).index("by_shop", ["shopId"]),

  customers: defineTable({
    shopId: v.id("shops"),
    channelId: v.string(),
    displayName: v.optional(v.string()),
    lastOrderAt: v.optional(v.number()),
    notes: v.optional(v.array(v.string())),
  }).index("by_shop_channel", ["shopId", "channelId"]),

  orders: defineTable({
    shopId: v.id("shops"),
    customerId: v.id("customers"),
    lines: v.array(orderLine),
    totalCents: v.number(),
    requestedTime: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("accepted"), v.literal("ready"), v.literal("cancelled")),
    paymentStatus: v.union(v.literal("unpaid"), v.literal("paid")),
    paymentLink: v.optional(v.string()),
    /** Set the first time an invoice is made for the order. */
    invoiceNumber: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_shop", ["shopId"])
    .index("by_customer", ["customerId"]),

  messages: defineTable({
    shopId: v.id("shops"),
    channelId: v.string(),
    role: v.union(v.literal("customer"), v.literal("agent")),
    text: v.string(),
    link: v.optional(v.string()),
  }).index("by_thread", ["shopId", "channelId"]),

  bookings: defineTable({
    shopId: v.id("shops"),
    customerId: v.id("customers"),
    service: v.string(),
    when: v.string(),
    status: v.union(v.literal("booked"), v.literal("cancelled")),
    reminded: v.boolean(),
  }).index("by_shop", ["shopId"]),

  reviews: defineTable({
    shopId: v.id("shops"),
    customerId: v.id("customers"),
    rating: v.number(),
    text: v.string(),
    reply: v.optional(v.string()),
  }).index("by_shop", ["shopId"]),

  features: defineTable({
    shopId: v.id("shops"),
    request: v.string(),
    threadId: v.optional(v.string()),
    status: v.union(v.literal("building"), v.literal("built"), v.literal("live"), v.literal("failed")),
    detail: v.optional(v.string()),
    polls: v.number(),
  }).index("by_shop", ["shopId"]),

  phoneRuns: defineTable({
    kind: v.union(v.literal("device"), v.literal("store"), v.literal("test")),
    name: v.string(),
    /** For a customer-app run: the page the cloud iPhone opens in Safari. */
    target: v.optional(v.string()),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("passed"), v.literal("failed"), v.literal("open"), v.literal("ended")),
    url: v.optional(v.string()),
  }),

  events: defineTable({
    shopId: v.id("shops"),
    arm: v.number(),
    createdAt: v.number(),
  }).index("by_shop_time", ["shopId", "createdAt"]),
});
