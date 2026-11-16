import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { findOrCreateCustomer } from "./orders";
import { OWNER_CHANNEL } from "./owner";
import { audienceCounts, invoiceLabel, reorderLines, stockPoints, weekOfSales } from "./suite2";

const DAY_MS = 24 * 60 * 60 * 1000;
const QUIET_AFTER_MS = 7 * DAY_MS;

const cash = (shop: Doc<"shops">, cents: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: (shop.currency ?? "usd").toUpperCase() }).format(cents / 100);

/** The parts of the dashboard beyond orders and menu: bookings, reviews, books, tax and what to reorder. */
export const overview = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = (await ctx.db.get(shopId))!;
    const since = Date.now() - DAY_MS;
    const recent = (await ctx.db.query("orders").withIndex("by_shop", (q) => q.eq("shopId", shopId)).order("desc").take(500)).filter((o) => o.status !== "cancelled");
    const orders = recent.filter((o) => o.createdAt >= since);
    const name = async (id: Id<"customers">) => {
      const c = await ctx.db.get(id);
      return c?.displayName ?? c?.channelId ?? "Customer";
    };
    const rate = shop.taxRate ?? 0;
    const gross = orders.reduce((t, o) => t + o.totalCents, 0);
    const tax = Math.round(gross - gross / (1 + rate / 100));
    const bookings = await ctx.db.query("bookings").withIndex("by_shop", (q) => q.eq("shopId", shopId)).order("desc").take(20);
    const reviews = await ctx.db.query("reviews").withIndex("by_shop", (q) => q.eq("shopId", shopId)).order("desc").take(20);
    // The list above shows the newest twenty; the spread of ratings counts every review.
    const allReviews = await ctx.db.query("reviews").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
    const items = await ctx.db.query("items").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
    const customers = await ctx.db.query("customers").withIndex("by_shop_channel", (q) => q.eq("shopId", shopId)).collect();
    return {
      sales: await Promise.all(
        orders.map(async (o) => ({
          id: o._id,
          at: o.createdAt,
          customer: await name(o.customerId),
          items: o.lines.map((l) => `${l.qty} x ${l.name}`).join("; "),
          totalCents: o.totalCents,
          paid: o.paymentStatus === "paid",
          invoice: o.invoiceNumber === undefined ? null : invoiceLabel(o.invoiceNumber),
        })),
      ),
      tax: { rate, grossCents: gross, taxCents: tax, netCents: gross - tax },
      receipts: orders.filter((o) => o.paymentStatus === "paid").length,
      unpaid: orders.filter((o) => o.paymentStatus === "unpaid").length,
      bookings: await Promise.all(
        bookings.map(async (b) => ({ id: b._id, customer: await name(b.customerId), service: b.service, when: b.when, status: b.status, reminded: b.reminded })),
      ),
      reviews: await Promise.all(
        reviews.map(async (r) => ({ id: r._id, customer: await name(r.customerId), rating: r.rating, text: r.text, reply: r.reply ?? null })),
      ),
      ratings: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: allReviews.filter((r) => r.rating === stars).length })),
      unanswered: allReviews.filter((r) => !r.reply).length,
      week: weekOfSales(recent, rate),
      reorder: reorderLines(items),
      stockPoints: stockPoints(items),
      features: (await ctx.db.query("features").withIndex("by_shop", (q) => q.eq("shopId", shopId)).order("desc").take(6)).map((f) => ({
        request: f.request,
        status: f.status,
        detail: f.detail ?? null,
      })),
      audiences: audienceCounts(customers.filter((c) => c.channelId !== OWNER_CHANNEL), recent),
      audience: {
        all: customers.length,
        quiet: customers.filter((c) => (c.lastOrderAt ?? 0) < Date.now() - QUIET_AFTER_MS).length,
      },
    };
  },
});

export const book = internalMutation({
  args: { shopId: v.id("shops"), channelId: v.string(), service: v.string(), when: v.string() },
  handler: async (ctx, { shopId, channelId, service, when }) => {
    if (!service.trim() || !when.trim()) throw new Error("A booking needs a service and a time");
    // One slot, one booking. The times are free text, so the same slot is the same words, whatever the capitals or spacing.
    const slot = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
    const taken = (await ctx.db.query("bookings").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect()).some(
      (b) => b.status === "booked" && slot(b.when) === slot(when),
    );
    if (taken) throw new Error(`${when.trim()} is already booked. Please pick another time.`);
    const customerId = await findOrCreateCustomer(ctx, shopId, channelId);
    await ctx.db.insert("bookings", { shopId, customerId, service: service.trim().slice(0, 80), when: when.trim().slice(0, 60), status: "booked", reminded: false });
    return { booked: true, service: service.trim(), when: when.trim() };
  },
});

export const leaveReview = internalMutation({
  args: { shopId: v.id("shops"), channelId: v.string(), rating: v.number(), text: v.string() },
  handler: async (ctx, { shopId, channelId, rating, text }) => {
    const customerId = await findOrCreateCustomer(ctx, shopId, channelId);
    await ctx.db.insert("reviews", { shopId, customerId, rating: Math.min(5, Math.max(1, Math.round(rating))), text: text.trim().slice(0, 600) });
    return { saved: true };
  },
});

export const setTaxRate = internalMutation({
  args: { shopId: v.id("shops"), rate: v.number() },
  handler: async (ctx, { shopId, rate }) => {
    if (!(rate >= 0 && rate <= 50)) throw new Error("Tax rate must be between 0 and 50 percent");
    await ctx.db.patch(shopId, { taxRate: rate });
  },
});

export const cancelBooking = internalMutation({
  args: { bookingId: v.id("bookings") },
  handler: (ctx, { bookingId }) => ctx.db.patch(bookingId, { status: "cancelled" }),
});

export const patchBooking = internalMutation({
  args: { bookingId: v.id("bookings") },
  handler: (ctx, { bookingId }) => ctx.db.patch(bookingId, { reminded: true }),
});

export const saveReply = internalMutation({
  args: { reviewId: v.id("reviews"), reply: v.string() },
  handler: (ctx, { reviewId, reply }) => ctx.db.patch(reviewId, { reply }),
});

/** Who a message may go to. Everyone here texted or ordered first; nobody is contacted cold. */
export const audience = internalQuery({
  args: { shopId: v.id("shops"), group: v.union(v.literal("all"), v.literal("quiet"), v.literal("unpaid"), v.literal("happy")) },
  handler: async (ctx, { shopId, group }) => {
    const shop = (await ctx.db.get(shopId))!;
    const customers = await ctx.db.query("customers").withIndex("by_shop_channel", (q) => q.eq("shopId", shopId)).collect();
    const out: { customerId: Id<"customers">; extra: string; link?: string }[] = [];
    for (const c of customers) {
      if (c.channelId === OWNER_CHANNEL) continue;
      const orders = await ctx.db.query("orders").withIndex("by_customer", (q) => q.eq("customerId", c._id)).collect();
      const open = orders.filter((o) => o.status !== "cancelled");
      if (group === "all") out.push({ customerId: c._id, extra: "" });
      if (group === "quiet" && (c.lastOrderAt ?? 0) < Date.now() - QUIET_AFTER_MS) out.push({ customerId: c._id, extra: "" });
      if (group === "happy" && open.some((o) => o.status === "ready")) out.push({ customerId: c._id, extra: "" });
      if (group === "unpaid") {
        const owed = open.filter((o) => o.paymentStatus === "unpaid");
        if (owed.length) out.push({ customerId: c._id, extra: cash(shop, owed.reduce((t, o) => t + o.totalCents, 0)), link: owed[owed.length - 1].paymentLink });
      }
    }
    return { shopName: shop.name, targets: out };
  },
});

const TEXTS = {
  quiet: (shop: string) => `We miss you at ${shop}! Text us any time and we'll have your usual ready.`,
  unpaid: (shop: string, amount: string) => `A quick reminder from ${shop}: ${amount} is still open on your order. You can pay with the link below.`,
  happy: (shop: string) => `Thanks for ordering from ${shop}! How was it? Reply with a rating from 1 to 5 and a few words.`,
};

/** Sends one message to a group of customers: an announcement, a win-back, an unpaid reminder or a review request. */
export const broadcast = internalAction({
  args: {
    shopId: v.id("shops"),
    group: v.union(v.literal("all"), v.literal("quiet"), v.literal("unpaid"), v.literal("happy")),
    text: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, group, text }): Promise<{ sent: number }> => {
    const { shopName, targets } = await ctx.runQuery(internal.suite.audience, { shopId, group });
    const custom = text?.trim().slice(0, 500);
    if (group === "all" && !custom) throw new Error("Write the message to send");
    for (const t of targets) {
      const body = custom || (group === "unpaid" ? TEXTS.unpaid(shopName, t.extra) : group === "happy" ? TEXTS.happy(shopName) : TEXTS.quiet(shopName));
      await ctx.runAction(internal.notify.toCustomer, { shopId, customerId: t.customerId, text: body, link: t.link });
    }
    return { sent: targets.length };
  },
});

export const getBooking = internalQuery({ args: { bookingId: v.id("bookings") }, handler: (ctx, { bookingId }) => ctx.db.get(bookingId) });
export const getReview = internalQuery({ args: { reviewId: v.id("reviews") }, handler: (ctx, { reviewId }) => ctx.db.get(reviewId) });

export const remind = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.runQuery(internal.suite.getBooking, { bookingId });
    if (!booking || booking.status !== "booked") throw new Error("That booking is no longer active");
    await ctx.runAction(internal.notify.toCustomer, {
      shopId: booking.shopId,
      customerId: booking.customerId,
      text: `Reminder: your ${booking.service} is booked for ${booking.when}. Reply here if you need to change it.`,
    });
    await ctx.runMutation(internal.suite.patchBooking, { bookingId });
  },
});

/** Drafts a short reply to a review, saves it and sends it to the customer who wrote it. */
export const replyToReview = internalAction({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }): Promise<{ reply: string }> => {
    const review = await ctx.runQuery(internal.suite.getReview, { reviewId });
    if (!review) throw new Error("Review not found");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL ?? "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You reply to a customer review on behalf of a small shop owner. Two sentences at most, warm and specific. If the review is unhappy, apologise once and offer to make it right. No emoji." },
          { role: "user", content: `Rating ${review.rating} out of 5. Review: ${review.text}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Could not draft a reply (${res.status})`);
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const reply = body.choices[0].message.content.trim();
    await ctx.runMutation(internal.suite.saveReply, { reviewId, reply });
    await ctx.runAction(internal.notify.toCustomer, { shopId: review.shopId, customerId: review.customerId, text: reply });
    return { reply };
  },
});

/** Bookkeeping: puts today's total in the owner's thread, as the closing message would. */
export const sendDailyTotal = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const sum = await ctx.runMutation(internal.ownerTools.todaySummary, { shopId });
    const text = `Today so far: ${sum.orders} orders, ${sum.paidTotal} collected, ${sum.unpaidTotal} still unpaid.${sum.topItem ? ` Top seller: ${sum.topItem}.` : ""}`;
    await ctx.runMutation(internal.notify.saveMessage, { shopId, channelId: OWNER_CHANNEL, role: "agent", text });
    return { text };
  },
});

export const nameCustomer = internalMutation({
  args: { shopId: v.id("shops"), channelId: v.string(), name: v.string() },
  handler: async (ctx, { shopId, channelId, name }) => {
    const customerId = await findOrCreateCustomer(ctx, shopId, channelId);
    await ctx.db.patch(customerId, { displayName: name });
  },
});
