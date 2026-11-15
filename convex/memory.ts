/** Supermemory is the octopus's brain: what the owner told it, and what each regular likes. */
const API = "https://api.supermemory.ai";
const safe = (part: string) => part.toLowerCase().replace(/[^a-z0-9]+/g, "_");

export const brain = {
  /** Everything the owner said and what was done about it. Never shown to customers. */
  owner: (shopId: string) => `octopus_shop_${safe(shopId)}_owner`,
  /** Notes the owner wants customers to be told, such as "no oat milk today". */
  shopNotes: (shopId: string) => `octopus_shop_${safe(shopId)}_notes`,
  /** One space per customer per shop. */
  customer: (shopId: string, channelId: string) => `octopus_shop_${safe(shopId)}_cust_${safe(channelId)}`,
};

async function call(namespace: string, path: string, body: unknown) {
  const key = process.env.SUPERMEMORY_API_KEY;
  if (!key) return null;
  const res = await fetch(`${API}/ns/${namespace}/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok ? res.json() : null;
}

export async function remember(namespace: string, content: string) {
  await call(namespace, "document", { content: content.slice(0, 2000), dreaming: "instant" });
}

export async function recall(namespace: string, query: string, limit = 4): Promise<string[]> {
  const body = (await call(namespace, "search", { query, limit, searchMode: "hybrid" })) as
    | { results: { memory?: string; chunk?: string }[] }
    | null;
  return (body?.results ?? []).map((hit) => hit.memory ?? hit.chunk ?? "").filter(Boolean);
}
