import { action, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ARMS, logArm } from "./events";

type Extracted = { name: string; priceCents: number; description?: string };

const PROMPT =
  'Read this menu or price list. Reply with JSON only, no prose: {"items":[{"name":string,"price":number,"description":string|null}]}. ' +
  "price is in the menu's main currency unit, for example 4.5. Skip anything without a clear price. Do not invent items.";

export const generateUploadUrl = mutation({
  args: {},
  handler: (ctx) => ctx.storage.generateUploadUrl(),
});

export const saveExtracted = internalMutation({
  args: {
    shopId: v.id("shops"),
    items: v.array(v.object({ name: v.string(), priceCents: v.number(), description: v.optional(v.string()) })),
  },
  handler: async (ctx, { shopId, items }) => {
    for (const item of items) await ctx.db.insert("items", { shopId, ...item, available: true });
    await logArm(ctx, shopId, ARMS.readsMenu);
  },
});

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function askAnthropic(key: string, image: string, mediaType: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.VISION_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Vision model error ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return body.content[0].text as string;
}

async function askOpenAI(key: string, image: string, mediaType: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.VISION_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Vision model error ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return body.choices[0].message.content as string;
}

function parseItems(text: string): Extracted[] {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as { items: { name: unknown; price: unknown; description?: unknown }[] };
  return parsed.items
    .filter((i) => typeof i.name === "string" && typeof i.price === "number" && i.price >= 0)
    .map((i) => ({
      name: (i.name as string).trim(),
      priceCents: Math.round((i.price as number) * 100),
      description: typeof i.description === "string" && i.description ? i.description : undefined,
    }))
    .filter((i) => i.name.length > 0);
}

export const extract = action({
  args: { shopId: v.id("shops"), storageId: v.id("_storage") },
  handler: async (ctx, { shopId, storageId }): Promise<number> => {
    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Photo not found");
    const image = toBase64(new Uint8Array(await blob.arrayBuffer()));
    const mediaType = blob.type || "image/jpeg";
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!anthropicKey && !openaiKey) throw new Error("Menu reading is not set up yet: no vision model key");
    const text = anthropicKey ? await askAnthropic(anthropicKey, image, mediaType) : await askOpenAI(openaiKey!, image, mediaType);
    const items = parseItems(text);
    if (items.length === 0) throw new Error("Could not find any priced items in that photo");
    await ctx.runMutation(internal.menu.saveExtracted, { shopId, items });
    return items.length;
  },
});
