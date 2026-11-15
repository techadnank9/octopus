import type { HttpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { cleanError } from "./agentLoop";
import { OWNER_CHANNEL } from "./owner";
import { LANDING } from "./landing";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Body = Record<string, unknown>;

/** Public JSON endpoint for the landing page. A shop id is only known to the person who set that shop up. */
function page(run: (ctx: ActionCtx, body: Body) => Promise<unknown>) {
  return httpAction(async (ctx, request) => {
    try {
      const body = request.method === "POST" ? ((await request.json()) as Body) : Object.fromEntries(new URL(request.url).searchParams);
      return json(await run(ctx, body));
    } catch (err) {
      return json({ error: cleanError(err) }, 400);
    }
  });
}

const shopOf = (body: Body) => String(body.shopId ?? "") as Id<"shops">;

async function threadOf(ctx: ActionCtx, shopId: Id<"shops">, channelId: string) {
  const messages = await ctx.runQuery(api.chat.thread, { shopId, channelId });
  return { messages: messages.map((m) => ({ role: m.role, text: m.text, link: m.link ?? null })) };
}

export function addSiteRoutes(http: HttpRouter) {
  http.route({
    path: "/",
    method: "GET",
    handler: httpAction(async () => new Response(LANDING, { headers: { "content-type": "text/html; charset=utf-8" } })),
  });

  http.route({
    path: "/onboard",
    method: "POST",
    handler: page(async (ctx, body) => {
      const { shopId, claimCode } = await ctx.runAction(internal.onboard.fromWeb, {
        website: typeof body.website === "string" ? body.website : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
      });
      return { shopId, claimCode };
    }),
  });

  http.route({
    path: "/public/state",
    method: "GET",
    handler: page((ctx, body) => ctx.runQuery(internal.onboard.state, { shopId: shopOf(body) })),
  });

  http.route({
    path: "/public/chat",
    method: "POST",
    handler: page(async (ctx, body) => {
      const shopId = shopOf(body);
      const channelId = `demo:web-${String(body.session ?? "visitor").replace(/[^a-z0-9]/gi, "").slice(0, 24)}`;
      if (body.text) await ctx.runAction(api.chat.send, { shopId, channelId, text: String(body.text) });
      return threadOf(ctx, shopId, channelId);
    }),
  });

  http.route({
    path: "/public/owner",
    method: "POST",
    handler: page(async (ctx, body) => {
      const shopId = shopOf(body);
      if (body.text) await ctx.runAction(api.owner.send, { shopId, text: String(body.text) });
      return threadOf(ctx, shopId, OWNER_CHANNEL);
    }),
  });

  http.route({
    path: "/public/order",
    method: "POST",
    handler: page(async (ctx, body) => {
      const orderId = String(body.orderId) as Id<"orders">;
      if (body.status === "paid") await ctx.runMutation(api.orders.markPaidDemo, { orderId });
      else if (body.status === "accepted" || body.status === "ready") await ctx.runMutation(api.orders.setStatus, { orderId, status: body.status });
      else throw new Error("Unknown status");
      return { ok: true };
    }),
  });
}
