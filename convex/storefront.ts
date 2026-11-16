/** The customer app every shop gets: menu, cart, order, pay, live status and a chat with the octopus. No backticks or template placeholders inside. */
export const STOREFRONT = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#4B8106">
<title>Order</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet">
<style>
:root { --paper:#FFFFFF; --ink:#121212; --plum:#3A6505; --violet:#4B8106; --coral:#A94F00; --line:#D9DFD3; --muted:#5E6657;
  --display:'Bricolage Grotesque',system-ui,sans-serif; --body:'DM Sans',system-ui,sans-serif; }
* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font:400 17px/1.45 var(--body); padding-bottom:110px; }
h1,h2 { font-family:var(--display); margin:0; letter-spacing:-.02em; }
p { margin:0; }
button,input,textarea { font:inherit; color:inherit; }
button { min-height:44px; }
:focus-visible { outline:3px solid var(--coral); outline-offset:2px; }
.wrap { max-width:560px; margin:0 auto; padding:0 18px; }
header { background:var(--violet); color:var(--paper); padding:28px 0 26px; border-radius:0 0 28px 28px; }
header h1 { font-size:clamp(2rem,9vw,2.8rem); font-weight:800; line-height:1; }
header p { color:var(--paper); margin-top:8px; font-size:.95rem; }
.tabs { display:flex; gap:8px; margin:18px 0 6px; overflow-x:auto; padding:4px; }
.tabs button { flex:1 0 auto; white-space:nowrap; border:1.5px solid var(--line); background:#fff; border-radius:999px; padding:10px; font-weight:700; cursor:pointer; }
.tabs button.on { background:var(--ink); border-color:var(--ink); color:var(--paper); }
.item { display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid #EEEEEE; }
.item .pic { width:64px; height:64px; border-radius:14px; object-fit:cover; background:#fff; border:1px solid var(--line); flex:none; }
.item .name { font-weight:700; }
.item-info { flex:1; min-width:0; overflow-wrap:anywhere; }
.item-heading { display:flex; align-items:center; gap:8px; }
.favourite { flex-shrink:0; width:44px; height:44px; display:grid; place-items:center; border:1.5px solid var(--line); border-radius:50%; background:#fff; color:var(--plum); cursor:pointer; }
.favourite svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:2; }
.favourite[aria-pressed="true"] svg { fill:currentColor; }
.favourites-filter { margin-top:12px; padding:8px 16px; border:1.5px solid var(--line); border-radius:999px; background:#fff; font-weight:700; cursor:pointer; }
.favourites-filter[aria-pressed="true"] { background:var(--ink); border-color:var(--ink); color:var(--paper); }
.item .desc { color:var(--muted); font-size:.85rem; }
.item .price { color:var(--plum); font-weight:700; font-size:.95rem; }
.item.off { opacity:.45; }
.step { margin-left:auto; display:flex; align-items:center; gap:10px; }
.step button { width:44px; height:44px; border-radius:50%; border:1.5px solid var(--line); background:#fff; font-size:1.3rem; font-weight:700; cursor:pointer; line-height:1; }
.step button.add { background:var(--violet); border-color:var(--violet); color:#fff; }
.step span { min-width:1.2ch; text-align:center; font-weight:800; }
.bar { position:fixed; left:0; right:0; bottom:0; padding:12px 18px calc(12px + env(safe-area-inset-bottom)); background:rgba(255,255,255,.94); backdrop-filter:blur(8px); border-top:1px solid var(--line); }
.bar button { width:100%; max-width:524px; margin:0 auto; display:flex; justify-content:space-between; background:var(--violet); color:#fff; border:0; border-radius:18px; padding:16px 20px; font-weight:800; font-size:1.05rem; cursor:pointer; }
.bar button[disabled] { background:#E1E6DC; cursor:default; }
.sheet { position:fixed; inset:0; background:rgba(18,18,18,.5); display:none; align-items:flex-end; z-index:5; }
.sheet.on { display:flex; }
.sheet form { background:var(--paper); width:100%; max-width:560px; margin:0 auto; border-radius:28px 28px 0 0; padding:24px 20px calc(24px + env(safe-area-inset-bottom)); display:grid; gap:12px; }
.sheet h2 { font-size:1.5rem; font-weight:800; }
.sheet .line { display:flex; justify-content:space-between; font-size:.95rem; }
.sheet label { font-size:.85rem; font-weight:700; color:var(--muted); display:grid; gap:6px; }
.sheet input { border:1.5px solid var(--line); border-radius:14px; padding:13px 14px; background:#fff; width:100%; }
.primary { background:var(--violet); color:#fff; border:0; border-radius:16px; padding:15px; font-weight:800; cursor:pointer; text-align:center; text-decoration:none; display:block; }
.ghost { background:none; border:0; color:var(--muted); font-weight:700; cursor:pointer; padding:6px; }
.err { color:#B3261A; font-size:.9rem; min-height:1.2em; }
.status { background:#fff; border:1.5px solid var(--line); border-radius:22px; padding:20px; margin-top:18px; display:grid; gap:14px; }
.status h2 { font-size:1.4rem; font-weight:800; }
.stamps { display:flex; gap:10px; }
.stamp { display:grid; place-items:center; width:44px; height:44px; border:2px solid var(--line); border-radius:50%; font-weight:700; }
.stamp.filled { background:var(--violet); border-color:var(--violet); color:#fff; }
.loyalty-note { font-size:.85rem; color:var(--muted); }
.track { display:flex; gap:6px; }
.track div { flex:1; text-align:center; font-size:.78rem; font-weight:700; color:var(--muted); padding-top:10px; border-top:5px solid var(--line); }
.track div.on { color:var(--ink); border-color:var(--violet); }
.track div.now { border-color:var(--coral); }
.pill { font-size:.75rem; font-weight:700; padding:3px 10px; border-radius:999px; background:#FFE3DF; color:#B3261A; justify-self:start; }
.pill.ok { background:#DDF5E6; color:#136B37; }
.thread { display:flex; flex-direction:column; gap:8px; padding:14px 0; min-height:240px; }
.msg { max-width:86%; padding:10px 14px; border-radius:18px; font-size:.95rem; line-height:1.35; }
.msg.customer { align-self:flex-end; background:var(--violet); color:#fff; border-bottom-right-radius:5px; }
.msg.agent { align-self:flex-start; background:#F1F4ED; border-bottom-left-radius:5px; }
.msg a { color:var(--plum); font-weight:700; display:block; margin-top:4px; }
.typing { font-size:.82rem; color:var(--muted); }
.send { display:flex; gap:8px; }
.send input { flex:1; border:1.5px solid var(--line); border-radius:14px; padding:13px 14px; background:#fff; }
.send button { background:var(--violet); color:#fff; border:0; border-radius:14px; padding:0 18px; font-weight:700; cursor:pointer; }
.fields { display:grid; gap:12px; margin-top:18px; }
.fields label,.search { display:grid; gap:6px; font-size:.85rem; font-weight:700; color:var(--muted); }
.fields input,.fields textarea,.search input { width:100%; min-width:0; border:1.5px solid var(--line); border-radius:14px; padding:13px 14px; background:#fff; }
.fields textarea { min-height:110px; resize:vertical; }
.fields fieldset { border:0; padding:0; margin:0; min-width:0; }
.fields legend { font-size:.85rem; font-weight:700; color:var(--muted); margin-bottom:6px; }
.stars { display:flex; gap:8px; }
.stars button { width:44px; border:1.5px solid var(--line); border-radius:14px; background:#fff; color:var(--muted); font-size:1.5rem; cursor:pointer; }
.stars button.on { background:var(--plum); border-color:var(--plum); color:var(--paper); }
.search { margin-top:18px; }
.menu-count { color:var(--muted); font-size:.85rem; margin-top:8px; }
.empty { color:var(--muted); padding:24px 0; }
footer { text-align:center; color:var(--muted); font-size:.8rem; padding:28px 0 0; }
footer a { color:var(--plum); font-weight:700; }
/* polish pass: targets, focus, rhythm, small screens */
html { -webkit-text-size-adjust:100%; }
body { overflow-wrap:break-word; padding-bottom:calc(104px + env(safe-area-inset-bottom)); }
a,button { -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
h1,h2 { text-wrap:balance; }
header h1 { overflow-wrap:anywhere; }
header p:empty { display:none; }
input,textarea { min-height:48px; }
input::placeholder,textarea::placeholder { color:var(--muted); }
input:focus-visible,textarea:focus-visible { outline-offset:1px; border-color:var(--violet); }
.tabs { gap:6px; margin:16px -4px 4px; scrollbar-width:none; }
.tabs::-webkit-scrollbar { display:none; }
.tabs button { padding:10px 14px; font-size:.95rem; }
.tabs button:focus-visible { outline-offset:1px; }
.search { margin-top:14px; }
.search input { -webkit-appearance:none; appearance:none; font-weight:400; color:var(--ink); }
.favourites-filter { padding:8px 18px; }
.menu-count { margin-top:12px; font-variant-numeric:tabular-nums; }
.item { gap:10px; padding:12px 0; min-height:72px; }
.item:last-child { border-bottom:0; }
.item-heading { justify-content:space-between; }
.item .name { line-height:1.25; }
.item .desc { margin-top:2px; line-height:1.35; }
.item .price { margin-top:2px; font-variant-numeric:tabular-nums; }
.item.off { opacity:1; }
.item.off .name,.item.off .desc,.item.off .item-info .price { color:var(--muted); }
.item.off .step .price { color:var(--muted); white-space:nowrap; }
.step { gap:6px; flex:none; }
.step span { min-width:2ch; font-variant-numeric:tabular-nums; }
.step button,.favourite { display:grid; place-items:center; padding:0; flex:none; }
.step button:active,.favourite:active,.primary:active,.bar button:active { transform:scale(.97); }
.favourite[aria-pressed="true"] { color:var(--coral); border-color:var(--coral); }
.bar { z-index:4; }
.bar button { align-items:center; gap:12px; min-height:56px; font-variant-numeric:tabular-nums; }
.bar button[disabled] { background:#E1E6DC; color:var(--muted); }
.sheet form { max-height:92dvh; overflow-y:auto; overscroll-behavior:contain; gap:14px; }
.sheet .line { gap:12px; padding:4px 0; font-variant-numeric:tabular-nums; }
.sheet .line span:first-child { min-width:0; overflow-wrap:anywhere; }
.primary { min-height:52px; display:flex; align-items:center; justify-content:center; width:100%; font-size:1.05rem; }
.primary[disabled] { opacity:.7; cursor:progress; }
.ghost { min-height:44px; padding:10px; width:100%; }
.err:empty { display:none; }
.status p { overflow-wrap:anywhere; }
.track div { font-size:.82rem; }
.pill { padding:4px 10px; }
.thread { min-height:200px; }
.thread:empty { min-height:0; padding:0; }
.msg { overflow-wrap:anywhere; }
.typing { font-weight:700; color:var(--plum); }
.send { position:sticky; bottom:calc(92px + env(safe-area-inset-bottom)); background:var(--paper); padding:8px 0; }
.send input { min-width:0; }
.send button { min-height:48px; padding:0 20px; flex:none; }
.stars button { height:48px; flex:1; max-width:56px; padding:0; }
.empty { border:1.5px dashed var(--line); border-radius:16px; padding:22px 18px; text-align:center; margin-top:14px; text-wrap:balance; }
footer { padding-top:32px; }
footer a { display:inline-block; padding:12px 2px; margin:-12px 0; }
@media (max-width:380px) { .wrap { padding:0 14px; } .bar { padding-left:14px; padding-right:14px; } .item { gap:8px; } .step { gap:4px; } }
@media (prefers-reduced-motion:reduce) { * { animation:none !important; transition:none !important; scroll-behavior:auto !important; } }
[hidden] { display:none !important; }
</style>
</head>
<body>
<header><div class="wrap"><h1 id="shopName">Loading</h1><p id="shopHours"></p></div></header>
<div class="wrap">
  <div class="tabs" role="tablist" aria-label="Shop">
    <button id="tabMenu" class="on" role="tab" aria-controls="menuView" aria-selected="true">Menu</button>
    <button id="tabChat" role="tab" aria-controls="chatView" aria-selected="false" tabindex="-1">Ask the octopus</button>
    <button id="tabBook" role="tab" aria-controls="bookView" aria-selected="false" tabindex="-1">Book</button>
    <button id="tabReview" role="tab" aria-controls="reviewView" aria-selected="false" tabindex="-1">Review</button>
  </div>
  <section id="menuView" role="tabpanel" aria-labelledby="tabMenu">
    <div id="status"></div>
    <section class="status" aria-labelledby="loyaltyTitle">
      <h2 id="loyaltyTitle" tabindex="-1">Your stamp card</h2>
      <p>One stamp per order placed here. Five stamps earn one free item at pickup.</p>
      <div class="stamps" id="loyaltyStamps" aria-hidden="true"></div>
      <p id="loyaltyProgress" role="status"></p>
      <button type="button" class="primary" id="redeemLoyalty" hidden>Redeem a free item</button>
      <p class="loyalty-note">Saved in this browser for this shop. Show the card to the shop before redeeming; online prices stay the same.</p>
      <p class="err" id="loyaltyErr" role="alert"></p>
    </section>
    <label class="search">Search the menu<input id="menuSearch" type="search" placeholder="Search the menu"></label>
    <button type="button" class="favourites-filter" id="favouritesFilter" aria-pressed="false" aria-controls="menu">Favourites</button>
    <button type="button" class="ghost" id="allItems" hidden>Show full menu</button>
    <p class="menu-count" id="menuCount" hidden></p>
    <div id="menu"></div>
  </section>
  <section id="chatView" role="tabpanel" aria-labelledby="tabChat" hidden>
    <div class="thread" id="thread"></div>
    <form class="send" id="chatForm"><input id="chatInput" placeholder="Do you have oat milk?" aria-label="Message the shop"><button>Send</button></form>
  </section>
  <section id="bookView" role="tabpanel" aria-labelledby="tabBook" hidden>
    <form class="status fields" id="bookForm">
      <label>Your name<input id="bookName" autocomplete="given-name" required maxlength="40"></label>
      <label>What for<input id="bookService" placeholder="Pickup, haircut, table for two" required></label>
      <label>When<input id="bookWhen" placeholder="Tomorrow 5 PM" required></label>
      <p class="err" id="bookErr" role="alert"></p>
      <button class="primary" id="bookSubmit">Book it</button>
    </form>
    <div id="bookResult" role="status"><p class="status" id="bookConfirmation" hidden></p></div>
  </section>
  <section id="reviewView" role="tabpanel" aria-labelledby="tabReview" hidden>
    <form class="status fields" id="reviewForm">
      <fieldset><legend>Your rating</legend><div class="stars" id="stars">
        <button type="button" class="on" data-rating="1" aria-label="1 star" aria-pressed="false">&#9733;</button>
        <button type="button" class="on" data-rating="2" aria-label="2 stars" aria-pressed="false">&#9733;</button>
        <button type="button" class="on" data-rating="3" aria-label="3 stars" aria-pressed="false">&#9733;</button>
        <button type="button" class="on" data-rating="4" aria-label="4 stars" aria-pressed="false">&#9733;</button>
        <button type="button" class="on" data-rating="5" aria-label="5 stars" aria-pressed="true">&#9733;</button>
      </div></fieldset>
      <label>What did you think?<textarea id="reviewText"></textarea></label>
      <p class="err" id="reviewErr" role="alert"></p>
      <button class="primary" id="reviewSubmit">Send review</button>
    </form>
    <div id="reviewResult" role="status"><p class="status" id="reviewConfirmation" hidden></p></div>
  </section>
  <footer>Run by <a id="home" href="/">Octopus</a>. Eight arms, one shop, zero staff.</footer>
</div>
<div class="bar" id="bar"><button id="checkout" disabled><span id="count">Add something</span><span id="total"></span></button></div>
<div class="sheet" id="sheet"><form id="orderForm">
  <h2>Your order</h2>
  <div id="summary"></div>
  <label>Your name<input id="who" autocomplete="given-name" required maxlength="40"></label>
  <label>Pickup time (optional)<input id="when" placeholder="3 PM" maxlength="40"></label>
  <p class="err" id="err" role="alert"></p>
  <button class="primary" id="place">Place order</button>
  <button type="button" class="ghost" id="back">Keep browsing</button>
</form></div>

<script>
const API = window.OCTOPUS_API || '';
const $ = (id) => document.getElementById(id);
let currency = 'usd';
const money = (c) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(c / 100);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shopId = new URLSearchParams(location.search).get('id');
let session = localStorage.getItem('octopusSession');
if (!session) { session = Math.random().toString(36).slice(2, 12); localStorage.setItem('octopusSession', session); }
const orderKey = 'octopusOrder:' + shopId;
const loyaltyKey = 'octopusLoyalty:' + shopId;
let loyalty = { orders: [], redeemed: 0 };
function loadLoyalty() {
  try {
    const saved = JSON.parse(localStorage.getItem(loyaltyKey));
    if (!saved) loyalty = { orders: [], redeemed: 0 };
    else if (Array.isArray(saved.orders) && saved.orders.every((id) => typeof id === 'string') && Number.isSafeInteger(saved.redeemed) && saved.redeemed >= 0 && saved.redeemed * 5 <= new Set(saved.orders).size) {
      loyalty = { orders: Array.from(new Set(saved.orders)), redeemed: saved.redeemed };
    }
  } catch {}
}
loadLoyalty();
const favouritesKey = 'octopusFavourites:' + shopId;
let favourites = new Set(), favouritesOnly = false;
try {
  const saved = JSON.parse(localStorage.getItem(favouritesKey) || '[]');
  if (Array.isArray(saved)) favourites = new Set(saved.filter((name) => typeof name === 'string'));
} catch {}
let items = [], cart = {}, orderId = localStorage.getItem(orderKey), messages = [];
$('home').href = window.OCTOPUS_ROOT || '/';

async function call(path, body) {
  const res = await fetch(API + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function drawLoyalty() {
  const balance = loyalty.orders.length - loyalty.redeemed * 5;
  const rewards = Math.floor(balance / 5);
  $('loyaltyStamps').innerHTML = [1, 2, 3, 4, 5].map((n) => '<span class="stamp' + (n <= balance ? ' filled' : '') + '">' + n + '</span>').join('');
  $('loyaltyProgress').textContent = rewards ? rewards + (rewards === 1 ? ' free item ready' : ' free items ready') + ' · ' + balance + ' stamps collected' : balance + ' of 5 stamps · ' + (5 - balance) + ' to your next free item';
  $('redeemLoyalty').hidden = !rewards;
}

function saveLoyalty(next) {
  try {
    localStorage.setItem(loyaltyKey, JSON.stringify(next));
    loyalty = next;
    $('loyaltyErr').textContent = '';
    drawLoyalty();
  } catch {
    $('loyaltyErr').textContent = 'Your stamp card could not be updated. Please ask the shop for help and allow browser storage for future stamps.';
  }
}

$('redeemLoyalty').onclick = () => {
  loadLoyalty();
  drawLoyalty();
  if (loyalty.orders.length - loyalty.redeemed * 5 < 5) return;
  if (!window.confirm('Is the shop ready to give you your free item? Redeeming uses 5 stamps.')) return;
  loadLoyalty();
  if (loyalty.orders.length - loyalty.redeemed * 5 < 5) { drawLoyalty(); return; }
  saveLoyalty({ orders: loyalty.orders, redeemed: loyalty.redeemed + 1 });
  $('loyaltyTitle').focus();
};
window.addEventListener('storage', (e) => {
  if (e.key === loyaltyKey || e.key === null) { loadLoyalty(); drawLoyalty(); }
});

function drawMenu() {
  const query = $('menuSearch').value.trim().toLowerCase();
  const matches = items.filter((i) => i.name.toLowerCase().includes(query) && (!favouritesOnly || favourites.has(i.name)));
  const savedCount = items.filter((i) => favourites.has(i.name)).length;
  $('favouritesFilter').textContent = 'Favourites (' + savedCount + ')';
  $('allItems').hidden = !favouritesOnly;
  $('menuCount').hidden = !favouritesOnly && items.length <= 12;
  $('menuCount').textContent = favouritesOnly ? matches.length + ' of ' + savedCount + ' favourites' : items.length + ' items';
  $('menu').innerHTML = matches.length ? matches.map((i) => {
    const n = cart[i.name] || 0;
    const stepper = !i.available ? '<span class="price">Sold out</span>'
      : '<div class="step">' + (n ? '<button data-n="' + esc(i.name) + '" data-d="-1" aria-label="Remove one ' + esc(i.name) + '">−</button><span>' + n + '</span>' : '') + '<button class="add" data-n="' + esc(i.name) + '" data-d="1" aria-label="Add ' + esc(i.name) + '">+</button></div>';
    const heart = '<button type="button" class="favourite" data-favourite="' + esc(i.name) + '" aria-label="Favourite ' + esc(i.name) + '" aria-pressed="' + favourites.has(i.name) + '"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button>';
    return '<div class="item' + (i.available ? '' : ' off') + '">' + (i.imageUrl ? '<img class="pic" loading="lazy" alt="" src="' + esc(i.imageUrl) + '">' : '') + '<div class="item-info"><div class="item-heading"><div class="name">' + esc(i.name) + '</div>' + heart + '</div>' + (i.description ? '<div class="desc">' + esc(i.description) + '</div>' : '') + '<div class="price">' + money(i.priceCents) + (i.available && i.stock !== null && i.stock <= 3 ? ' · only ' + i.stock + ' left' : '') + '</div></div>' + (i.available ? stepper : '<div class="step">' + stepper + '</div>') + '</div>';
  }).join('') : '<p class="empty" role="status">' + (query ? 'Nothing matches' : favouritesOnly ? 'No favourites yet. Tap a heart on the menu to save an item.' : 'The menu is being set up. Ask the octopus what is available.') + '</p>';
  const lines = items.filter((i) => cart[i.name]);
  const count = lines.reduce((t, i) => t + cart[i.name], 0);
  const total = lines.reduce((t, i) => t + cart[i.name] * i.priceCents, 0);
  $('checkout').disabled = !count;
  $('count').textContent = count ? 'Review order (' + count + ')' : 'Add something';
  $('total').textContent = count ? money(total) : '';
  $('summary').innerHTML = lines.map((i) => '<div class="line"><span>' + cart[i.name] + ' × ' + esc(i.name) + '</span><b>' + money(cart[i.name] * i.priceCents) + '</b></div>').join('') + '<div class="line" style="margin-top:8px;font-weight:800"><span>Total</span><span>' + money(total) + '</span></div>';
}

function drawStatus(o) {
  if (!o) { $('status').innerHTML = ''; return; }
  const stage = o.status === 'ready' ? 2 : o.status === 'accepted' ? 1 : 0;
  const names = ['Sent', 'Accepted', 'Ready'];
  const head = o.status === 'cancelled' ? 'Order cancelled' : stage === 2 ? 'Your order is ready' : stage === 1 ? 'The shop is on it' : 'Order sent to the shop';
  $('status').innerHTML = '<div class="status"><h2>' + head + '</h2><p>' + esc(o.lines.join(', ')) + (o.requestedTime ? ', ' + esc(o.requestedTime) : '') + ' <b>' + money(o.totalCents) + '</b></p>'
    + '<div class="track">' + names.map((n, k) => '<div class="' + (k <= stage ? 'on' : '') + (k === stage ? ' now' : '') + '">' + n + '</div>').join('') + '</div>'
    + '<span class="pill' + (o.paid ? ' ok' : '') + '">' + (o.paid ? 'Paid' : 'Not paid yet') + '</span>'
    + (o.paid && o.status === 'ready' ? '<p>Show this screen when you pick up.</p>' : '')
    + (!o.paid && o.paymentLink ? '<a class="primary" target="_blank" rel="noopener" href="' + esc(o.paymentLink) + '">Pay ' + money(o.totalCents) + '</a>' : '')
    + (stage === 2 || o.status === 'cancelled' ? '<button class="ghost" id="again">Start a new order</button>' : '') + '</div>';
  const again = $('again');
  if (again) again.onclick = () => { localStorage.removeItem(orderKey); orderId = null; drawStatus(null); };
}

async function refresh() {
  try {
    const s = await call('/public/store?shopId=' + encodeURIComponent(shopId) + (orderId ? '&orderId=' + encodeURIComponent(orderId) : ''));
    document.title = 'Order from ' + s.shop.name;
    const moneyChanged = currency !== s.shop.currency;
    currency = s.shop.currency || 'usd';
    $('shopName').textContent = s.shop.name;
    $('shopHours').textContent = 'Order ahead by tapping, or ask the octopus';
    const changed = JSON.stringify(s.items) !== JSON.stringify(items);
    items = s.items;
    items.forEach((i) => { if (!i.available) delete cart[i.name]; });
    if (changed || moneyChanged) drawMenu();
    drawStatus(s.order);
  } catch (err) { $('shopName').textContent = 'Shop not found'; }
}

$('menuSearch').addEventListener('input', drawMenu);
$('favouritesFilter').onclick = () => {
  favouritesOnly = !favouritesOnly;
  $('favouritesFilter').setAttribute('aria-pressed', String(favouritesOnly));
  drawMenu();
};
$('allItems').onclick = () => {
  favouritesOnly = false;
  $('menuSearch').value = '';
  $('favouritesFilter').setAttribute('aria-pressed', 'false');
  drawMenu();
  $('favouritesFilter').focus();
};
$('menu').addEventListener('click', (e) => {
  const heart = e.target.closest('button[data-favourite]');
  if (heart) {
    const name = heart.dataset.favourite;
    if (favourites.has(name)) favourites.delete(name); else favourites.add(name);
    try { localStorage.setItem(favouritesKey, JSON.stringify(Array.from(favourites))); } catch {}
    drawMenu();
    const next = Array.from($('menu').querySelectorAll('[data-favourite]')).find((b) => b.dataset.favourite === name);
    (next || $('favouritesFilter')).focus();
    return;
  }
  const b = e.target.closest('button[data-n]');
  if (!b) return;
  const n = (cart[b.dataset.n] || 0) + Number(b.dataset.d);
  const it = items.find((i) => i.name === b.dataset.n);
  const max = it && it.stock !== null ? it.stock : 20;
  if (n > 0) cart[b.dataset.n] = Math.min(n, max); else delete cart[b.dataset.n];
  drawMenu();
});
$('checkout').onclick = () => { $('who').value = localStorage.getItem('octopusName') || ''; $('sheet').classList.add('on'); };
$('back').onclick = () => $('sheet').classList.remove('on');
$('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('err').textContent = ''; $('place').disabled = true; $('place').textContent = 'Placing order';
  try {
    localStorage.setItem('octopusName', $('who').value.trim());
    const placed = await call('/public/placeOrder', { shopId: shopId, session: session, name: $('who').value.trim(), requestedTime: $('when').value.trim(),
      lines: Object.keys(cart).map((name) => ({ name: name, qty: cart[name] })) });
    orderId = placed.orderId; localStorage.setItem(orderKey, orderId);
    loadLoyalty();
    if (!loyalty.orders.includes(orderId)) saveLoyalty({ orders: loyalty.orders.concat(orderId), redeemed: loyalty.redeemed });
    cart = {}; drawMenu(); $('sheet').classList.remove('on');
    await refresh(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) { $('err').textContent = err.message; }
  $('place').disabled = false; $('place').textContent = 'Place order';
});

function drawThread(waiting) {
  $('thread').innerHTML = (messages.length ? '' : '<p class="empty">Ask about the menu, order by message, or say "same as last time".</p>')
    + messages.map((m) => '<div class="msg ' + m.role + '">' + esc(m.text) + (m.link ? '<a target="_blank" rel="noopener" href="' + esc(m.link) + '">Pay now</a>' : '') + '</div>').join('')
    + (waiting ? '<div class="typing">Octopus is typing</div>' : '');
  window.scrollTo({ top: document.body.scrollHeight });
}
$('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('chatInput').value.trim();
  if (!text) return;
  $('chatInput').value = '';
  messages = messages.concat([{ role: 'customer', text: text }]); drawThread(true);
  try { messages = (await call('/public/chat', { shopId: shopId, session: session, text: text })).messages; }
  catch (err) { messages = messages.concat([{ role: 'agent', text: err.message }]); }
  drawThread(false);
});
$('bookName').value = localStorage.getItem('octopusName') || '';
$('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('bookName').value.trim(), service = $('bookService').value.trim(), when = $('bookWhen').value.trim();
  $('bookErr').textContent = ''; $('bookConfirmation').hidden = true; $('bookSubmit').disabled = true;
  try {
    await call('/public/book', { shopId: shopId, session: session, name: name, service: service, when: when });
    $('bookForm').reset();
    $('bookConfirmation').textContent = 'Booked: ' + service + ', ' + when + '. We will remind you.';
    $('bookConfirmation').hidden = false;
  } catch (err) { $('bookErr').textContent = err.message; }
  $('bookSubmit').disabled = false;
});

let rating = 5;
function drawRating() {
  $('stars').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.rating) <= rating);
    b.setAttribute('aria-pressed', String(Number(b.dataset.rating) === rating));
  });
}
$('stars').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-rating]');
  if (!b) return;
  rating = Number(b.dataset.rating); drawRating();
});
$('reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('reviewErr').textContent = ''; $('reviewConfirmation').hidden = true; $('reviewSubmit').disabled = true;
  try {
    await call('/public/review', { shopId: shopId, session: session, rating: rating, text: $('reviewText').value.trim() });
    $('reviewForm').reset(); rating = 5; drawRating();
    $('reviewConfirmation').textContent = 'Thank you. The shop will see this.';
    $('reviewConfirmation').hidden = false;
  } catch (err) { $('reviewErr').textContent = err.message; }
  $('reviewSubmit').disabled = false;
});

const tabs = ['Menu', 'Chat', 'Book', 'Review'];
function show(tab) {
  tabs.forEach((name) => {
    const selected = name === tab;
    $(name.toLowerCase() + 'View').hidden = !selected;
    $('tab' + name).classList.toggle('on', selected);
    $('tab' + name).setAttribute('aria-selected', String(selected));
    $('tab' + name).tabIndex = selected ? 0 : -1;
  });
  $('bar').hidden = tab !== 'Menu';
  if (tab === 'Chat') call('/public/chat', { shopId: shopId, session: session }).then((d) => { messages = d.messages; drawThread(false); }).catch(() => drawThread(false));
}
tabs.forEach((name, index) => {
  $('tab' + name).onclick = () => show(name);
  $('tab' + name).onkeydown = (e) => {
    let next;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault(); show(tabs[next]); $('tab' + tabs[next]).focus();
  };
});

drawLoyalty();
drawMenu();
refresh();
setInterval(refresh, 2500);
</script>
</body>
</html>`;
