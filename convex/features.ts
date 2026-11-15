import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { OWNER_CHANNEL } from "./owner";

const CAPY = "https://api.capy.ai/api/v1";
const POLL_MS = 20_000;
const GIVE_UP_AFTER = 45; // polls, about fifteen minutes

const brief = (request: string) => `A shop owner asked for this feature in their customers' ordering app:

"${request}"

1. Build it in this repository following AGENTS.md exactly: edit only convex/storefront.ts and keep everything that exists working. Make the simplest sensible version. Do not ask questions.
2. Run the check in AGENTS.md until it prints ok.
3. Review your own diff as a second pass, as a strict reviewer would: broken ids, anything that could stop the page loading, accessibility, leftovers. Fix what you find and run the check again.
4. Open one pull request against the default branch titled "Customer app: <the feature in a few words>", with a short body saying what you built and what you checked.`;

export const create = internalMutation({
  args: { shopId: v.id("shops"), request: v.string() },
  handler: (ctx, { shopId, request }) => ctx.db.insert("features", { shopId, request, status: "building", polls: 0 }),
});

export const patch = internalMutation({
  args: {
    id: v.id("features"),
    threadId: v.optional(v.string()),
    status: v.optional(v.union(v.literal("building"), v.literal("built"), v.literal("live"), v.literal("failed"))),
    detail: v.optional(v.string()),
    polls: v.optional(v.number()),
  },
  handler: (ctx, { id, ...fields }) => ctx.db.patch(id, fields),
});

export const get = internalQuery({ args: { id: v.id("features") }, handler: (ctx, { id }) => ctx.db.get(id) });

/** Requests the coding agent has finished that still need merging and deploying. */
export const awaitingRelease = internalQuery({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("features").collect()).filter((f) => f.status === "built").map((f) => ({ id: f._id, request: f.request })),
});

/** The owner asked for a customer-app feature: hand it to a Capy coding agent and keep watching it. */
export const start = internalAction({
  args: { shopId: v.id("shops"), request: v.string() },
  handler: async (ctx, { shopId, request }): Promise<{ started: boolean; note: string }> => {
    const key = process.env.CAPY_API_KEY;
    const projectId = process.env.CAPY_PROJECT_ID;
    if (!key || !projectId) throw new Error("Feature building is not set up yet");
    const wanted = request.trim().slice(0, 600);
    if (wanted.length < 8) throw new Error("Describe the feature in a sentence");
    const id = await ctx.runMutation(internal.features.create, { shopId, request: wanted });
    const res = await fetch(`${CAPY}/threads`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ requestId: crypto.randomUUID(), projectId, title: `Customer app: ${wanted.slice(0, 60)}`, message: brief(wanted) }),
    });
    if (!res.ok) {
      const detail = `Capy did not accept the task (${res.status})`;
      await ctx.runMutation(internal.features.patch, { id, status: "failed", detail });
      throw new Error(detail);
    }
    const thread = (await res.json()) as { id?: string; threadId?: string; thread?: { id: string } };
    await ctx.runMutation(internal.features.patch, { id, threadId: thread.id ?? thread.threadId ?? thread.thread?.id });
    await ctx.scheduler.runAfter(POLL_MS, internal.features.poll, { id });
    return { started: true, note: "A coding agent is building, reviewing and releasing it now. The owner gets a message when it is live, usually within ten minutes." };
  },
});

/** Checks on the Capy thread until it stops working, then hands the result to the release step. */
export const poll = internalAction({
  args: { id: v.id("features") },
  handler: async (ctx, { id }) => {
    const feature = await ctx.runQuery(internal.features.get, { id });
    if (!feature || feature.status !== "building" || !feature.threadId) return;
    const res = await fetch(`${CAPY}/threads/${feature.threadId}`, { headers: { authorization: `Bearer ${process.env.CAPY_API_KEY}` } });
    const thread = res.ok ? ((await res.json()) as { status?: string }) : {};
    const polls = feature.polls + 1;
    if (thread.status === "failed" || polls > GIVE_UP_AFTER) {
      const detail = thread.status === "failed" ? "The coding agent could not finish." : "The build took too long.";
      await ctx.runMutation(internal.features.finish, { id, ok: false, detail });
      return;
    }
    if (thread.status === "idle" || thread.status === "waiting") {
      await ctx.runMutation(internal.features.patch, { id, status: "built", polls });
      return;
    }
    await ctx.runMutation(internal.features.patch, { id, polls });
    await ctx.scheduler.runAfter(POLL_MS, internal.features.poll, { id });
  },
});

/** Closes a request and tells the owner: live after merge and deploy, or left alone because a check failed. */
export const finish = internalMutation({
  args: { id: v.id("features"), ok: v.boolean(), detail: v.string() },
  handler: async (ctx, { id, ok, detail }) => {
    const feature = await ctx.db.get(id);
    if (!feature) return;
    await ctx.db.patch(id, { status: ok ? "live" : "failed", detail });
    await ctx.db.insert("messages", {
      shopId: feature.shopId,
      channelId: OWNER_CHANNEL,
      role: "agent",
      text: ok
        ? `Done. "${feature.request}" is live in your customer app. It was built, reviewed, merged and deployed. ${detail}`
        : `I could not ship "${feature.request}", so your customer app is unchanged. ${detail}`,
    });
  },
});
