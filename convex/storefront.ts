/** The customer app every shop gets: menu, cart, order, pay, live status and a chat with the octopus. No backticks or template placeholders inside. */
export const STOREFRONT = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1B1230">
<title>Order</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet">
<style>
:root { --paper:#FAF7F2; --ink:#1B1230; --plum:#3A1D6E; --violet:#5B2EE5; --coral:#FF6B5E; --line:#D9D0EC; --muted:#6B6282;
  --display:'Bricolage Grotesque',system-ui,sans-serif; --body:'DM Sans',system-ui,sans-serif; }
* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font:400 17px/1.45 var(--body); padding-bottom:110px; }
h1,h2 { font-family:var(--display); margin:0; letter-spacing:-.02em; }
p { margin:0; }
button,input { font:inherit; color:inherit; }
:focus-visible { outline:3px solid var(--coral); outline-offset:2px; }
.wrap { max-width:560px; margin:0 auto; padding:0 18px; }
header { background:var(--ink); color:var(--paper); padding:28px 0 26px; border-radius:0 0 28px 28px; }
header h1 { font-size:clamp(2rem,9vw,2.8rem); font-weight:800; line-height:1; }
header p { color:#CFC6E6; margin-top:8px; font-size:.95rem; }
.tabs { display:flex; gap:8px; margin:18px 0 6px; }
.tabs button { flex:1; border:1.5px solid var(--line); background:#fff; border-radius:999px; padding:10px; font-weight:700; cursor:pointer; }
.tabs button.on { background:var(--ink); border-color:var(--ink); color:var(--paper); }
.item { display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid #EEE8F7; }
.item .name { font-weight:700; }
.item .desc { color:var(--muted); font-size:.85rem; }
.item .price { color:var(--plum); font-weight:700; font-size:.95rem; }
.item.off { opacity:.45; }
.step { margin-left:auto; display:flex; align-items:center; gap:10px; }
.step button { width:40px; height:40px; border-radius:50%; border:1.5px solid var(--line); background:#fff; font-size:1.3rem; font-weight:700; cursor:pointer; line-height:1; }
.step button.add { background:var(--violet); border-color:var(--violet); color:#fff; }
.step span { min-width:1.2ch; text-align:center; font-weight:800; }
.bar { position:fixed; left:0; right:0; bottom:0; padding:12px 18px calc(12px + env(safe-area-inset-bottom)); background:rgba(250,247,242,.94); backdrop-filter:blur(8px); border-top:1px solid var(--line); }
.bar button { width:100%; max-width:524px; margin:0 auto; display:flex; justify-content:space-between; background:var(--violet); color:#fff; border:0; border-radius:18px; padding:16px 20px; font-weight:800; font-size:1.05rem; cursor:pointer; }
.bar button[disabled] { background:#C9C1DE; cursor:default; }
.sheet { position:fixed; inset:0; background:rgba(27,18,48,.5); display:none; align-items:flex-end; z-index:5; }
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
.track { display:flex; gap:6px; }
.track div { flex:1; text-align:center; font-size:.78rem; font-weight:700; color:var(--muted); padding-top:10px; border-top:5px solid var(--line); }
.track div.on { color:var(--ink); border-color:var(--violet); }
.track div.now { border-color:var(--coral); }
.pill { font-size:.75rem; font-weight:700; padding:3px 10px; border-radius:999px; background:#FFE3DF; color:#B3261A; justify-self:start; }
.pill.ok { background:#DDF5E6; color:#136B37; }
.thread { display:flex; flex-direction:column; gap:8px; padding:14px 0; min-height:240px; }
.msg { max-width:86%; padding:10px 14px; border-radius:18px; font-size:.95rem; line-height:1.35; }
.msg.customer { align-self:flex-end; background:var(--violet); color:#fff; border-bottom-right-radius:5px; }
.msg.agent { align-self:flex-start; background:#EEEAF5; border-bottom-left-radius:5px; }
.msg a { color:var(--violet); font-weight:700; display:block; margin-top:4px; }
.typing { font-size:.82rem; color:var(--muted); }
.send { display:flex; gap:8px; }
.send input { flex:1; border:1.5px solid var(--line); border-radius:14px; padding:13px 14px; background:#fff; }
.send button { background:var(--violet); color:#fff; border:0; border-radius:14px; padding:0 18px; font-weight:700; cursor:pointer; }
.empty { color:var(--muted); padding:24px 0; }
footer { text-align:center; color:var(--muted); font-size:.8rem; padding:28px 0 0; }
footer a { color:var(--plum); font-weight:700; }
[hidden] { display:none !important; }
</style>
</head>
<body>
<header><div class="wrap"><h1 id="shopName">Loading</h1><p id="shopHours"></p></div></header>
<div class="wrap">
  <div class="tabs" role="tablist"><button id="tabMenu" class="on">Menu</button><button id="tabChat">Ask the octopus</button></div>
  <section id="menuView">
    <div id="status"></div>
    <div id="menu"></div>
  </section>
  <section id="chatView" hidden>
    <div class="thread" id="thread"></div>
    <form class="send" id="chatForm"><input id="chatInput" placeholder="Do you have oat milk?" aria-label="Message the shop"><button>Send</button></form>
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
let items = [], cart = {}, orderId = localStorage.getItem(orderKey), messages = [];
if (window.OCTOPUS_API) $('home').href = './..';

async function call(path, body) {
  const res = await fetch(API + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function drawMenu() {
  $('menu').innerHTML = items.length ? items.map((i) => {
    const n = cart[i.name] || 0;
    const stepper = !i.available ? '<span class="price">Sold out</span>'
      : '<div class="step">' + (n ? '<button data-n="' + esc(i.name) + '" data-d="-1" aria-label="Remove one ' + esc(i.name) + '">−</button><span>' + n + '</span>' : '') + '<button class="add" data-n="' + esc(i.name) + '" data-d="1" aria-label="Add ' + esc(i.name) + '">+</button></div>';
    return '<div class="item' + (i.available ? '' : ' off') + '"><div><div class="name">' + esc(i.name) + '</div>' + (i.description ? '<div class="desc">' + esc(i.description) + '</div>' : '') + '<div class="price">' + money(i.priceCents) + '</div></div>' + (i.available ? stepper : '<div class="step">' + stepper + '</div>') + '</div>';
  }).join('') : '<p class="empty">The menu is being set up. Ask the octopus what is available.</p>';
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

$('menu').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-n]');
  if (!b) return;
  const n = (cart[b.dataset.n] || 0) + Number(b.dataset.d);
  if (n > 0) cart[b.dataset.n] = Math.min(n, 20); else delete cart[b.dataset.n];
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
function show(chat) {
  $('menuView').hidden = chat; $('chatView').hidden = !chat; $('bar').hidden = chat;
  $('tabMenu').classList.toggle('on', !chat); $('tabChat').classList.toggle('on', chat);
  if (chat) call('/public/chat', { shopId: shopId, session: session }).then((d) => { messages = d.messages; drawThread(false); }).catch(() => drawThread(false));
}
$('tabMenu').onclick = () => show(false);
$('tabChat').onclick = () => show(true);

drawMenu();
refresh();
setInterval(refresh, 2500);
</script>
</body>
</html>`;
