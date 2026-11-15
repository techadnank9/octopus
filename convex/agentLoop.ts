import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { recall, remember } from "./memory";

export type Thread = { shopId: Id<"shops">; channelId: string };
export type ToolState = { link?: string };
type ToolCall = { id: string; function: { name: string; arguments: string } };
type ChatMessage = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };

export const tool = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) => ({
  type: "function" as const,
  function: { name, description, parameters: { type: "object", properties, required } },
});

export const cleanError = (err: unknown) =>
  (err instanceof Error ? err.message : "failed").replace(/^Uncaught Error: /, "").split("\n")[0];

async function complete(messages: ChatMessage[], tools: ReturnType<typeof tool>[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.CHAT_MODEL ?? "gpt-4.1-mini", messages, tools }),
  });
  if (!res.ok) throw new Error(`Assistant error ${res.status}`);
  const body = (await res.json()) as { choices: { message: ChatMessage }[] };
  return body.choices[0].message;
}

/** One conversational turn: saves the incoming text, lets the model call tools, saves the reply to the thread. */
export async function runTurn(
  ctx: ActionCtx,
  opts: {
    thread: Thread;
    text: string;
    system: string;
    tools: ReturnType<typeof tool>[];
    run: (name: string, args: Record<string, unknown>, state: ToolState) => Promise<unknown>;
    /** Supermemory spaces to read before answering, and the one this turn is written to afterwards. */
    recallFrom: string[];
    learnInto: string;
    speaker: string;
  },
) {
  const { thread } = opts;
  const clean = opts.text.trim().slice(0, 1000);
  if (!clean) throw new Error("Message is empty");
  if (!process.env.OPENAI_API_KEY) throw new Error("The assistant is not set up yet");
  const history = await ctx.runQuery(internal.chat.recent, thread);
  await ctx.runMutation(internal.notify.saveMessage, { ...thread, role: "customer", text: clean });
  const remembered = (await Promise.all(opts.recallFrom.map((space) => recall(space, clean)))).flat();
  const notes = remembered.map((m) => `- ${m}`).join("\n");
  const system = remembered.length ? `${opts.system}\n\nWhat you remember:\n${notes}` : opts.system;
  const messages: ChatMessage[] = [{ role: "system", content: system }, ...history, { role: "user", content: clean }];
  const state: ToolState = {};
  const reply = async (text: string) => {
    await ctx.runMutation(internal.notify.saveMessage, { ...thread, role: "agent", text, link: state.link });
    await remember(opts.learnInto, `${opts.speaker} said: "${clean}". The octopus replied: "${text}"`);
  };
  for (let turn = 0; turn < 6; turn++) {
    const message = await complete(messages, opts.tools);
    messages.push(message);
    if (!message.tool_calls?.length) {
      await reply(message.content ?? "");
      return null;
    }
    for (const call of message.tool_calls) {
      let result: unknown;
      try {
        result = await opts.run(call.function.name, JSON.parse(call.function.arguments || "{}"), state);
      } catch (err) {
        result = { error: cleanError(err) };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result ?? { ok: true }) });
    }
  }
  await reply("Sorry, I got tangled. Try that again in a moment.");
  return null;
}
