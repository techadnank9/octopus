import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { runOwnerTool } from "./owner";
import { addSiteRoutes } from "./site";
import { brain, recall, remember } from "./memory";

type Input = Record<string, unknown>;
type Call = { shopId: Id<"shops">; channelId: string; input: Input };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Accepts our own secret (header, or query for webhook tools that cannot set headers), or the key Keiki sends. */
function authorised(request: Request) {
  const ours = process.env.AGENT_SECRET;
  const keiki = process.env.KEIKI_API_KEY;
  return (
    (!!ours && request.headers.get("x-octopus-secret") === ours) ||
    (!!ours && new URL(request.url).searchParams.get("secret") === ours) ||
    (!!keiki && request.headers.get("x-orchid-api-key") === keiki)
  );
}

/** Keiki posts { input, context: { phone } }. The in-app chat posts the fields flat. */
function tool(run: (ctx: ActionCtx, call: Call) => Promise<unknown>) {
  return httpAction(async (ctx, request) => {
    if (!authorised(request)) return json({ error: "Unauthorised" }, 401);
    try {
      const body = (await request.json()) as { input?: Input; context?: { phone?: string } } & Input;
      const input = body.input ?? body;
      const channelId = body.context?.phone ?? (input.channelId as string | undefined) ?? "";
      const shopId = await ctx.runQuery(internal.agent.resolveShop, { shopId: input.shopId as string | undefined });
      return json(await run(ctx, { shopId, channelId, input }));
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong";
      return json({ error: raw.replace(/^Uncaught Error: /, "").split("\n")[0] }, 400);
    }
  });
}

const needChannel = (channelId: string) => {
  if (!channelId) throw new Error("channelId is required");
  return channelId;
};

const http = httpRouter();

http.route({
  path: "/agent/getMenu",
  method: "POST",
  handler: tool((ctx, { shopId }) => ctx.runMutation(internal.agent.getMenu, { shopId })),
});

http.route({
  path: "/agent/createOrder",
  method: "POST",
  handler: tool(async (ctx, { shopId, channelId, input }) => {
    const placed = await ctx.runMutation(internal.agent.createOrder, {
      shopId,
      channelId: needChannel(channelId),
      requestedTime: typeof input.requestedTime === "string" ? input.requestedTime : undefined,
      lines: (input.lines as { name: string; qty: number }[]).map((l) => ({ name: String(l.name), qty: Number(l.qty) })),
    });
    await remember(brain.customer(shopId, channelId), `Ordered ${placed.lines.join(", ")} for $${placed.total} on ${new Date().toDateString()}.`);
    return placed;
  }),
});

http.route({
  path: "/agent/getOrderStatus",
  method: "POST",
  handler: tool((ctx, { shopId, channelId }) =>
    ctx.runQuery(internal.agent.getOrderStatus, { shopId, channelId: needChannel(channelId) }),
  ),
});

http.route({
  path: "/agent/getCustomerMemory",
  method: "POST",
  handler: tool(async (ctx, { shopId, channelId }) => {
    const known = await ctx.runMutation(internal.agent.getCustomerMemory, { shopId, channelId: needChannel(channelId) });
    const [shopNotes, remembered] = await Promise.all([
      recall(brain.shopNotes(shopId), "what should customers know today"),
      recall(brain.customer(shopId, channelId), "usual order and preferences"),
    ]);
    return { ...known, shopNotes, remembered };
  }),
});

http.route({
  path: "/agent/saveCustomerMemory",
  method: "POST",
  handler: tool(async (ctx, { shopId, channelId, input }) => {
    const note = String(input.note ?? "");
    await remember(brain.customer(shopId, needChannel(channelId)), note);
    return ctx.runMutation(internal.agent.saveCustomerMemory, { shopId, channelId, note });
  }),
});

http.route({
  path: "/agent/createPaymentLink",
  method: "POST",
  handler: tool(async (ctx, { shopId, channelId }) => {
    const latest = await ctx.runQuery(internal.agent.getOrderStatus, { shopId, channelId: needChannel(channelId) });
    const orderId = latest.found ? latest.orderId : undefined;
    if (!orderId) throw new Error("No order to pay for yet");
    return ctx.runAction(internal.payments.createLink, { orderId });
  }),
});

http.route({
  path: "/agent/bookSlot",
  method: "POST",
  handler: tool((ctx, { shopId, channelId, input }) =>
    ctx.runMutation(internal.suite.book, { shopId, channelId: needChannel(channelId), service: String(input.service ?? ""), when: String(input.when ?? "") }),
  ),
});

http.route({
  path: "/agent/leaveReview",
  method: "POST",
  handler: tool((ctx, { shopId, channelId, input }) =>
    ctx.runMutation(internal.suite.leaveReview, { shopId, channelId: needChannel(channelId), rating: Number(input.rating), text: String(input.text ?? "") }),
  ),
});

/** Owner line: one route per tool, same secret. Only give this line to the shop owner. */
for (const name of ["get_menu", "add_item", "update_item", "remove_item", "set_stock", "set_hours", "list_orders", "advance_order", "tell_customers", "today_summary"]) {
  http.route({
    path: `/owner/${name}`,
    method: "POST",
    handler: tool((ctx, { shopId, input }) => runOwnerTool(ctx, shopId, name, input)),
  });
}

/** Standard Webhooks check: HMAC-SHA256 over "id.timestamp.body", base64, sent as "v1,<signature>". */
async function signedByWhop(request: Request, body: string) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const sent = (request.headers.get("webhook-signature") ?? "").split(" ").map((part) => part.split(",")[1]);
  if (!secret || !id || !timestamp) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return sent.includes(expected);
}

http.route({
  path: "/whop/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (!(await signedByWhop(request, body))) return json({ error: "Bad signature" }, 401);
    const event = JSON.parse(body) as { type?: string; data?: { metadata?: { orderId?: string } } };
    const orderId = event.data?.metadata?.orderId;
    if (event.type === "payment.succeeded" && orderId) {
      await ctx.runMutation(internal.orders.markPaidByWebhook, { orderId });
    }
    return json({ ok: true });
  }),
});

addSiteRoutes(http);

export default http;
