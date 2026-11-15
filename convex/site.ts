import type { HttpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { cleanError } from "./agentLoop";
import { OWNER_CHANNEL } from "./owner";
import { brain, remember } from "./memory";
import { LANDING } from "./landing";
import { STOREFRONT } from "./storefront";

/** The pages are also hosted on a second address, so the JSON endpoints answer any origin. They carry no cookies. */
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET, POST, OPTIONS" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });

const html = (page: string) => httpAction(async () => new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } }));
const preflight = httpAction(async () => new Response(null, { status: 204, headers: CORS }));

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

/** One thread and one customer record per browser, shared by the storefront cart and its chat. */
const webChannel = (body: Body) => `demo:web-${String(body.session ?? "visitor").replace(/[^a-z0-9]/gi, "").slice(0, 24)}`;

async function threadOf(ctx: ActionCtx, shopId: Id<"shops">, channelId: string) {
  const messages = await ctx.runQuery(api.chat.thread, { shopId, channelId });
  return { messages: messages.map((m) => ({ role: m.role, text: m.text, link: m.link ?? null })) };
}

export function addSiteRoutes(http: HttpRouter) {
  http.route({
    path: "/",
    method: "GET",
    handler: html(LANDING),
  });

  http.route({ path: "/shop", method: "GET", handler: html(STOREFRONT) });
  http.route({ path: "/dashboard", method: "GET", handler: html(LANDING) });

  for (const path of ["/onboard", "/public/chat", "/public/owner", "/public/order", "/public/placeOrder", "/public/item"]) {
    http.route({ path, method: "OPTIONS", handler: preflight });
  }

  http.route({
    path: "/public/item",
    method: "POST",
    handler: page(async (ctx, body) => {
      const shopId = shopOf(body);
      const name = String(body.name ?? "");
      if (body.remove === true) return ctx.runMutation(internal.ownerTools.removeItem, { shopId, name });
      if (body.create === true) return ctx.runMutation(internal.ownerTools.addItem, { shopId, name, price: Number(body.price) });
      if ("stock" in body) await ctx.runMutation(internal.ownerTools.setStock, { shopId, name, stock: typeof body.stock === "number" ? body.stock : null });
      if (typeof body.price === "number" || typeof body.available === "boolean") {
        await ctx.runMutation(internal.ownerTools.updateItem, {
          shopId,
          name,
          price: typeof body.price === "number" ? body.price : undefined,
          available: typeof body.available === "boolean" ? body.available : undefined,
        });
      }
      return { ok: true };
    }),
  });

  http.route({
    path: "/public/store",
    method: "GET",
    handler: page((ctx, body) =>
      ctx.runQuery(internal.onboard.store, { shopId: shopOf(body), orderId: typeof body.orderId === "string" ? body.orderId : undefined }),
    ),
  });

  http.route({
    path: "/public/placeOrder",
    method: "POST",
    handler: page(async (ctx, body) => {
      const shopId = shopOf(body);
      const name = String(body.name ?? "").trim().slice(0, 40);
      if (!name) throw new Error("Tell us your name so the shop knows who the order is for");
      const orderId = await ctx.runMutation(internal.orders.placeFromStore, {
        shopId,
        channelId: webChannel(body),
        displayName: name,
        requestedTime: typeof body.requestedTime === "string" && body.requestedTime.trim() ? body.requestedTime.trim().slice(0, 40) : undefined,
        lines: (body.lines as { name: string; qty: number }[]).map((l) => ({ name: String(l.name), qty: Number(l.qty) })),
      });
      // The order stands even if the pay link cannot be made; the shop can still take payment at pickup.
      await ctx.runAction(internal.payments.createLink, { orderId }).catch(() => null);
      const ordered = (body.lines as { name: string; qty: number }[]).map((l) => `${l.qty} x ${l.name}`).join(", ");
      await remember(brain.customer(shopId, webChannel(body)), `${name} ordered ${ordered} in the customer app on ${new Date().toDateString()}.`);
      return { orderId };
    }),
  });

  http.route({
    path: "/onboard",
    method: "POST",
    handler: page(async (ctx, body) => {
      return ctx.runAction(internal.onboard.fromWeb, {
        query: typeof body.query === "string" ? body.query : undefined,
        website: typeof body.website === "string" ? body.website : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
      });
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
      const channelId = webChannel(body);
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
