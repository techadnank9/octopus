import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type Input = Record<string, unknown>;
type Call = { shopId: Id<"shops">; channelId: string; input: Input };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Accepts our own secret header, or the key Keiki sends with each webhook tool call. */
function authorised(request: Request) {
  const ours = process.env.AGENT_SECRET;
  const keiki = process.env.KEIKI_API_KEY;
  return (
    (!!ours && request.headers.get("x-octopus-secret") === ours) ||
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
  handler: tool((ctx, { shopId, channelId, input }) =>
    ctx.runMutation(internal.agent.createOrder, {
      shopId,
      channelId: needChannel(channelId),
      requestedTime: typeof input.requestedTime === "string" ? input.requestedTime : undefined,
      lines: (input.lines as { name: string; qty: number }[]).map((l) => ({ name: String(l.name), qty: Number(l.qty) })),
    }),
  ),
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
  handler: tool((ctx, { shopId, channelId }) =>
    ctx.runMutation(internal.agent.getCustomerMemory, { shopId, channelId: needChannel(channelId) }),
  ),
});

http.route({
  path: "/agent/saveCustomerMemory",
  method: "POST",
  handler: tool((ctx, { shopId, channelId, input }) =>
    ctx.runMutation(internal.agent.saveCustomerMemory, { shopId, channelId: needChannel(channelId), note: String(input.note ?? "") }),
  ),
});

export default http;
