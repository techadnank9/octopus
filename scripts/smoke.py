"""Exercises every Octopus feature against the live backend on a fresh test shop and prints pass or fail for each.

Usage: python3 scripts/smoke.py   (reads AGENT_SECRET through the Convex CLI for the text-line endpoints)
"""
import json, subprocess, sys, time

BASE = "https://hushed-dove-252.convex.site"
results = []


def call(path, body=None, query=""):
    # curl rather than urllib: this Python install has no certificate bundle.
    cmd = ["curl", "-s", "-m", "150", "-w", "\n%{http_code}", BASE + path + query]
    if body is not None:
        cmd += ["-X", "POST", "-H", "content-type: application/json", "-d", json.dumps(body)]
    text, _, code = subprocess.run(cmd, capture_output=True, text=True).stdout.rpartition("\n")
    if code != "200":
        return {"error": text[:200], "status": int(code or 0)}
    return json.loads(text) if text.startswith(("{", "[")) or text == "null" else text


def check(name, ok, note=""):
    results.append((name, bool(ok), note))
    print(("PASS  " if ok else "FAIL  ") + name + (("   " + str(note)[:150]) if note else ""), flush=True)


def state(shop):
    return call("/public/state", query="?shopId=" + shop)


def last(thread):
    return thread["messages"][-1]["text"] if isinstance(thread, dict) and thread.get("messages") else str(thread)


secret = subprocess.run(["npx", "convex", "env", "get", "AGENT_SECRET"], capture_output=True, text=True).stdout.strip()

# 1. onboarding from a description
made = call("/onboard", {"query": "", "description": "Smoke Test Cafe. Flat white 4.50 USD, iced latte 5 USD, cortado 4 USD, banana bread 3.50 USD."})
shop = made.get("shopId")
check("Onboarding builds a shop", shop, made)
if not shop:
    sys.exit(1)
s = state(shop)
check("Menu extracted with prices", len(s["items"]) == 4 and s["shop"]["currency"] == "usd", [i["name"] for i in s["items"]])
check("Landing, dashboard and customer app pages load", all(isinstance(call(p), str) for p in ["/", "/dashboard?id=" + shop, "/shop?id=" + shop]))

# 2. customer service and ordering by chat
t = call("/public/chat", {"shopId": shop, "session": "smokea", "text": "hi, how much is a cortado?"})
check("Customer service answers from the menu", "4" in last(t), last(t))
call("/public/chat", {"shopId": shop, "session": "smokea", "text": "two flat whites for 3 PM please"})
t = call("/public/chat", {"shopId": shop, "session": "smokea", "text": "yes, place it"})
s = state(shop)
order = s["orders"][0] if s["orders"] else None
check("Order taken by chat with server-side total", order and order["totalCents"] == 900, order)
check("Pay link sent in chat", any(m.get("link") for m in t.get("messages", [])), last(t))

# 3. storefront order, stock rules
call("/public/item", {"shopId": shop, "name": "Banana bread", "stock": 2})
over = call("/public/placeOrder", {"shopId": shop, "session": "smokeb", "name": "Priya", "lines": [{"name": "Banana bread", "qty": 3}]})
check("Stock: over-ordering is refused", "Only 2 left" in str(over), over)
placed = call("/public/placeOrder", {"shopId": shop, "session": "smokeb", "name": "Priya", "requestedTime": "4 PM", "lines": [{"name": "Banana bread", "qty": 2}]})
store = call("/public/store", query="?shopId=%s&orderId=%s" % (shop, placed.get("orderId")))
check("Customer app order with pay link", store.get("order") and store["order"]["paymentLink"], store.get("order"))
s = state(shop)
bread = next(i for i in s["items"] if i["name"] == "Banana bread")
check("Stock: item switches off at zero", bread["stock"] == 0 and not bread["available"], bread)
check("Alerts and reorder list raised", any("sold out" in a for a in s["dashboard"]["alerts"]) and s["suite"]["reorder"], s["dashboard"]["alerts"])
fake = call("/public/placeOrder", {"shopId": shop, "session": "smokeb", "name": "Priya", "lines": [{"name": "Gold bar", "qty": 1}]})
check("Off-menu items are refused", "not on the menu" in str(fake), fake)

# 4. order updates, payment, receipt
oid = placed["orderId"]
call("/public/order", {"orderId": oid, "status": "accepted"})
call("/public/order", {"orderId": oid, "status": "ready"})
call("/public/order", {"orderId": oid, "status": "paid"})
time.sleep(4)
thread = call("/public/chat", {"shopId": shop, "session": "smokeb"})
texts = " | ".join(m["text"] for m in thread["messages"])
check("Order updates reach the customer", "accepted" in texts and "ready" in texts, texts)
check("Receipt sent after payment", "Receipt from" in texts, texts)
store = call("/public/store", query="?shopId=%s&orderId=%s" % (shop, oid))
check("Customer app shows ready and paid", store["order"]["status"] == "ready" and store["order"]["paid"], store["order"])

# 5. owner commands
o = call("/public/owner", {"shopId": shop, "text": "add oat latte for 5.50 and we have 6 cortados left"})
s = state(shop)
names = {i["name"].lower(): i for i in s["items"]}
check("Owner text adds a menu item", "oat latte" in names, last(o))
check("Owner text sets stock", names.get("cortado", {}).get("stock") == 6, names.get("cortado"))
o = call("/public/owner", {"shopId": shop, "text": "tell customers we are out of oat milk today and close at 2 PM"})
time.sleep(5)
t = call("/public/chat", {"shopId": shop, "session": "smokec", "text": "can I get an oat latte at 3 PM?"})
check("Shared memory: customer agent knows what the owner said", "2" in last(t) or "oat" in last(t).lower(), last(t))
o = call("/public/owner", {"shopId": shop, "text": "how much did we make today?"})
check("Owner gets today's numbers", any(c.isdigit() for c in last(o)), last(o))

# 6. memory of regulars
t = call("/public/chat", {"shopId": shop, "session": "smokea", "text": "hi again, the usual please"})
check("Remembers a regular's usual order", "flat white" in last(t).lower(), last(t))

# 7. bookings, reviews, marketing, bookkeeping, tax
call("/public/book", {"shopId": shop, "session": "smokeb", "name": "Priya", "service": "Table for two", "when": "Friday 7 PM"})
call("/public/review", {"shopId": shop, "session": "smokeb", "rating": 5, "text": "Lovely banana bread."})
t = call("/public/chat", {"shopId": shop, "session": "smokec", "text": "book me a pickup for tomorrow 9 AM. Also 4 stars, quick service."})
s = state(shop)
check("Bookings from the customer app and by chat", len(s["suite"]["bookings"]) >= 2, s["suite"]["bookings"])
check("Reviews from the customer app and by chat", len(s["suite"]["reviews"]) >= 2, s["suite"]["reviews"])
bid = s["suite"]["bookings"][-1]["id"]
check("Booking reminder", "error" not in str(call("/public/do", {"shopId": shop, "action": "remind", "id": bid})))
rid = s["suite"]["reviews"][-1]["id"]
rep = call("/public/do", {"shopId": shop, "action": "replyReview", "id": rid})
check("Review reply drafted and sent", isinstance(rep, dict) and rep.get("reply"), rep)
ann = call("/public/do", {"shopId": shop, "action": "announce", "text": "Fresh croissants tomorrow."})
check("Marketing announcement", isinstance(ann, dict) and ann.get("sent", 0) >= 2, ann)
check("Win-back runs", "sent" in str(call("/public/do", {"shopId": shop, "action": "winback"})))
check("Unpaid reminder", call("/public/do", {"shopId": shop, "action": "chaseUnpaid"}).get("sent", 0) >= 1)
check("Review request", "sent" in str(call("/public/do", {"shopId": shop, "action": "askReviews"})))
call("/public/do", {"shopId": shop, "action": "setTax", "rate": 10})
total = call("/public/do", {"shopId": shop, "action": "dailyTotal"})
s = state(shop)
check("Bookkeeping daily total", "orders" in str(total), total)
check("Tax breakdown", s["suite"]["tax"]["rate"] == 10 and s["suite"]["tax"]["taxCents"] > 0, s["suite"]["tax"])
check("Sales log for export", len(s["suite"]["sales"]) >= 2, len(s["suite"]["sales"]))
call("/public/do", {"shopId": shop, "action": "cancelBooking", "id": bid})
check("Booking cancel", any(b["status"] == "cancelled" for b in state(shop)["suite"]["bookings"]))

# 8. text-line tool endpoints (what Keiki calls), pinned to this shop by id
def tool(path, payload):
    return call(path + "?secret=" + secret, {"input": dict(payload, shopId=shop), "context": {"phone": "+15550007777"}})

check("Text line: endpoints reject a wrong secret", call("/agent/getMenu?secret=wrong", {"input": {}}).get("status") == 401)
check("Text line: menu", len(tool("/agent/getMenu", {}).get("items", [])) >= 4)
placed = tool("/agent/createOrder", {"lines": [{"name": "Iced latte", "qty": 1, "priceCents": 1}], "requestedTime": "noon"})
check("Text line: order priced by the server", placed.get("total") == "5.00", placed)
check("Text line: pay link", str(tool("/agent/createPaymentLink", {}).get("url", "")).startswith("https://"))
check("Text line: order status", tool("/agent/getOrderStatus", {}).get("found") is True)
check("Text line: customer memory", tool("/agent/getCustomerMemory", {}).get("known") is True)
check("Owner line: stock by text", "error" not in str(tool("/owner/set_stock", {"name": "Iced latte", "stock": 9})))
check("Owner line: order list", isinstance(tool("/owner/list_orders", {}), list))

failed = [r for r in results if not r[1]]
print("\n%d of %d passed" % (len(results) - len(failed), len(results)))
for name, _, note in failed:
    print("  failed:", name, "|", str(note)[:200])
