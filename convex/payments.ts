import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const WHOP_API = process.env.WHOP_API_BASE ?? "https://sandbox-api.whop.com/api/v1";

/** Creates a Whop checkout for the total stored on the order. The amount never comes from the caller. */
export const createLink = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<{ url: string; total: string }> => {
    const { order, shopName } = await ctx.runQuery(internal.orders.get, { orderId });
    const total = (order.totalCents / 100).toFixed(2);
    if (order.paymentLink) return { url: order.paymentLink, total };
    const key = process.env.WHOP_API_KEY;
    if (!key) throw new Error("Payments are not set up yet");
    const res = await fetch(`${WHOP_API}/checkout_configurations`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        mode: "payment",
        metadata: { orderId },
        variant: {
          billing_type: "one_time",
          initial_price: order.totalCents / 100,
          currency: "usd",
          title: `${shopName} order`,
          force_create_new_plan: true,
        },
      }),
    });
    if (!res.ok) throw new Error(`Could not create the payment link (${res.status})`);
    const { purchase_url: url } = (await res.json()) as { purchase_url: string };
    await ctx.runMutation(internal.orders.setPaymentLink, { orderId, paymentLink: url });
    return { url, total };
  },
});
