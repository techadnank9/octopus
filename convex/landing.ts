/** The public landing page, served from the deployment's own address. No backticks or template placeholders inside. */
export const LANDING = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Octopus: your shop, run by text</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet">
<script type="importmap">
{ "imports": {
  "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/"
} }
</script>
<style>
:root { --paper:#FAF7F2; --ink:#1B1230; --plum:#3A1D6E; --violet:#5B2EE5; --coral:#FF6B5E; --wash:#EFE9FB; --line:#D9D0EC; --muted:#6B6282;
  --display:'Bricolage Grotesque',system-ui,sans-serif; --body:'DM Sans',system-ui,sans-serif; }
* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font:400 17px/1.5 var(--body); }
h1,h2,h3 { font-family:var(--display); margin:0; letter-spacing:-.02em; }
p { margin:0; }
button,input,textarea { font:inherit; color:inherit; }
:focus-visible { outline:3px solid var(--coral); outline-offset:2px; }
.hero { background:var(--ink); color:var(--paper); display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr); gap:32px; padding:36px clamp(20px,5vw,72px) 56px; overflow:hidden; }
.brand { font:600 1.1rem var(--display); display:flex; align-items:center; gap:10px; margin-bottom:36px; }
.brand i { width:12px; height:12px; border-radius:50%; background:var(--coral); box-shadow:0 0 0 5px rgba(255,107,94,.25); }
h1 { font-size:clamp(2.4rem,5vw,4.4rem); line-height:.98; font-weight:800; max-width:12ch; }
.lede { margin:20px 0 28px; color:#CFC6E6; font-size:1.12rem; max-width:44ch; }
form { background:#231840; border:1px solid #3A2C63; border-radius:22px; padding:18px; max-width:560px; display:grid; gap:12px; }
label { font-size:.85rem; font-weight:700; color:#CFC6E6; display:grid; gap:6px; }
input,textarea { background:#150D27; border:1.5px solid #3A2C63; border-radius:14px; padding:13px 14px; color:var(--paper); width:100%; }
textarea { min-height:86px; resize:vertical; }
input::placeholder,textarea::placeholder { color:#7D739C; }
.or { text-align:center; font-size:.82rem; color:#9E93BF; }
.go { background:var(--coral); color:var(--ink); border:0; border-radius:14px; padding:15px; font-weight:800; font-size:1.05rem; cursor:pointer; }
.go[disabled] { opacity:.6; cursor:progress; }
.err { color:#FFB4AC; font-size:.9rem; min-height:1.2em; }
.stage { position:relative; min-height:440px; }
#octo { position:absolute; inset:-30px -60px -30px -30px; cursor:grab; }
.steps { list-style:none; margin:14px 0 0; padding:0; display:grid; gap:6px; font-size:.92rem; color:#9E93BF; }
.steps li.on { color:var(--paper); font-weight:700; }
.steps li.done { color:#8FE0B0; }
main { padding:0 clamp(20px,5vw,72px); }
.gets { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:0; border-top:2px solid var(--ink); margin:56px 0; }
.gets div { padding:20px 24px 24px 0; }
.gets h3 { font-size:1.3rem; font-weight:800; margin-bottom:6px; }
.gets p { color:var(--muted); font-size:.95rem; }
#studio { display:none; padding:48px 0 72px; }
.topbar { display:none; background:var(--ink); color:var(--paper); padding:16px clamp(20px,5vw,72px); align-items:center; gap:18px; flex-wrap:wrap; }
.topbar .brand { margin:0 auto 0 0; }
.topbar a { color:#CFC6E6; font-weight:700; font-size:.92rem; text-decoration:none; border:1px solid #4A3A75; border-radius:999px; padding:8px 14px; }
.topbar a:hover { border-color:var(--coral); color:var(--paper); }
body.dash .hero, body.dash .gets { display:none; }
body.dash .topbar { display:flex; }
body.dash #studio { padding-top:32px; }
.resume { color:#CFC6E6; font-size:.92rem; }
.resume a { color:var(--coral); font-weight:700; }
#studio.on { display:block; }
.shophead { display:flex; flex-wrap:wrap; align-items:end; gap:8px 20px; margin-bottom:28px; }
.shophead h2 { font-size:clamp(2rem,4vw,3.2rem); font-weight:800; }
.shophead span { color:var(--muted); }
.grid { display:grid; grid-template-columns:repeat(12,1fr); gap:20px; }
.panel { background:#fff; border:1px solid var(--line); border-radius:24px; padding:22px; grid-column:span 4; display:flex; flex-direction:column; min-height:0; }
.panel.wide { grid-column:span 8; }
.panel.dark { background:var(--ink); color:var(--paper); border-color:var(--ink); }
.panel h3 { font-size:1.25rem; font-weight:800; margin-bottom:4px; }
.panel .hint { color:var(--muted); font-size:.88rem; margin-bottom:14px; }
.panel.dark .hint { color:#B9AEDA; }
.row { display:flex; justify-content:space-between; gap:12px; padding:9px 0; border-bottom:1px solid #F0EBF8; font-size:.95rem; }
.row b { font-weight:700; }
.row.off { color:var(--muted); text-decoration:line-through; }
.empty { color:var(--muted); font-size:.92rem; }
.qr { width:190px; height:190px; border-radius:16px; background:#fff; padding:10px; align-self:center; margin:6px 0 12px; }
.code { font:800 1.5rem var(--display); letter-spacing:.06em; color:var(--coral); }
.thread { flex:1; min-height:220px; max-height:320px; overflow:auto; display:flex; flex-direction:column; gap:8px; padding:4px 2px 10px; }
.msg { max-width:86%; padding:9px 13px; border-radius:18px; font-size:.92rem; line-height:1.35; }
.msg.customer { align-self:flex-end; background:var(--violet); color:#fff; border-bottom-right-radius:5px; }
.msg.agent { align-self:flex-start; background:#EEEAF5; color:var(--ink); border-bottom-left-radius:5px; }
.msg a { color:var(--violet); font-weight:700; display:block; margin-top:4px; }
.typing { align-self:flex-start; font-size:.82rem; color:var(--muted); }
.send { display:flex; gap:8px; margin-top:8px; }
.send input { background:#fff; color:var(--ink); border-color:var(--line); }
.panel.dark .send input { background:#150D27; color:var(--paper); border-color:#3A2C63; }
.send button { background:var(--violet); color:#fff; border:0; border-radius:14px; padding:0 18px; font-weight:700; cursor:pointer; }
.chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
.chips button { background:none; border:1px solid #4A3A75; color:#CFC6E6; border-radius:999px; padding:6px 12px; font-size:.82rem; cursor:pointer; }
.order { border:1.5px solid var(--line); border-radius:18px; padding:14px; margin-bottom:10px; }
.order.fresh { border-color:var(--coral); box-shadow:0 0 0 4px rgba(255,107,94,.18); animation:drop .6s cubic-bezier(.2,1.3,.4,1); }
@keyframes drop { from { opacity:0; transform:translateY(-24px) scale(.96); } }
.order .top { display:flex; justify-content:space-between; font-weight:700; }
.order .what { color:var(--muted); font-size:.9rem; margin:4px 0 10px; }
.pill { font-size:.72rem; font-weight:700; padding:3px 9px; border-radius:999px; background:#FFE3DF; color:#B3261A; }
.pill.ok { background:#DDF5E6; color:#136B37; }
.acts { display:flex; gap:8px; flex-wrap:wrap; }
.acts button { border:1.5px solid var(--line); background:none; border-radius:12px; padding:8px 14px; font-weight:700; font-size:.85rem; cursor:pointer; }
.acts button.main { background:var(--violet); border-color:var(--violet); color:#fff; }
.acts .state { font-size:.85rem; font-weight:700; color:var(--plum); align-self:center; }
.stats { display:grid; grid-template-columns:repeat(4,1fr); gap:0; border-top:2px solid var(--ink); margin-bottom:8px; }
.stats div { padding:14px 16px 18px 0; }
.stats b { display:block; font:800 clamp(1.6rem,3.4vw,2.4rem) var(--display); letter-spacing:-.03em; }
.stats span { color:var(--muted); font-size:.88rem; }
.alert { display:flex; gap:10px; align-items:center; background:#FFF1EF; border:1px solid #FFC9C2; color:#7A1D14; border-radius:14px; padding:10px 14px; margin-bottom:8px; font-size:.92rem; font-weight:500; }
.alert i { width:8px; height:8px; border-radius:50%; background:var(--coral); flex:none; }
#alerts { margin-bottom:20px; }
.mrow { display:grid; grid-template-columns:minmax(0,1fr) 96px 150px 92px; gap:10px; align-items:center; padding:8px 0; border-bottom:1px solid #F0EBF8; font-size:.95rem; }
.mrow.off .nm { color:var(--muted); text-decoration:line-through; }
.mrow input { border:1.5px solid var(--line); border-radius:10px; padding:7px 9px; background:#fff; color:var(--ink); width:100%; }
.stock { display:flex; align-items:center; gap:6px; }
.stock button, .mrow .tog { border:1.5px solid var(--line); background:#fff; border-radius:10px; padding:6px 10px; font-weight:700; font-size:.82rem; cursor:pointer; color:var(--ink); }
.stock b { min-width:2ch; text-align:center; }
.stock b.low { color:#B3261A; }
.mrow .tog.is { background:var(--ink); border-color:var(--ink); color:var(--paper); }
#addForm input { background:#fff; color:var(--ink); border-color:var(--line); }
.cust { display:grid; grid-template-columns:minmax(0,1fr) 70px 90px minmax(0,1.4fr); gap:10px; padding:9px 0; border-bottom:1px solid #F0EBF8; font-size:.92rem; }
.cust span:last-child { color:var(--muted); }
@media (max-width:700px) { .stats { grid-template-columns:repeat(2,1fr); } .mrow { grid-template-columns:1fr 84px; } .cust { grid-template-columns:1fr 1fr; } }
.arm { display:flex; gap:10px; align-items:center; padding:7px 0; border-bottom:1px solid #F0EBF8; font-size:.9rem; }
.arm b { margin-left:auto; font:800 1.1rem var(--display); color:var(--violet); }
.arm i { width:8px; height:8px; border-radius:50%; background:var(--line); }
.arm.lit i { background:var(--coral); }
footer { background:var(--ink); color:var(--paper); text-align:center; padding:48px 20px; font:800 clamp(1.5rem,4vw,2.6rem) var(--display); }
@media (max-width:980px) { .hero { grid-template-columns:1fr; } .stage { min-height:300px; order:-1; } .panel,.panel.wide { grid-column:span 12; } }
@media (prefers-reduced-motion:reduce) { * { animation:none !important; } }
</style>
</head>
<body>
<nav class="topbar"><p class="brand"><i></i>Octopus</p><a id="navStore" target="_blank" rel="noopener">Open customer app</a><a id="navNew">Set up another shop</a></nav>
<header class="hero">
  <div>
    <p class="brand"><i></i>Octopus</p>
    <h1>Tell us about your shop. Your octopus runs it.</h1>
    <p class="lede">Enter your website or your business name. In about a minute you get a menu, a text line customers can order on, pay links, and an assistant you run by message.</p>
    <form id="build">
      <label>Your business<input id="query" type="text" placeholder="Enter website or name" autocomplete="off" autocapitalize="off"></label>
      <button class="go" id="go">Build my shop</button>
      <p class="err" id="err" role="alert"></p>
      <p class="resume" id="resume" hidden>Already set up? <a id="resumeLink">Open your dashboard</a></p>
      <ol class="steps" id="steps" hidden>
        <li>Finding and reading your site</li><li>Building your menu</li><li>Opening your text line</li><li>Waking your octopus</li>
      </ol>
    </form>
  </div>
  <div class="stage"><div id="octo" aria-label="3D octopus. Drag to turn it."></div></div>
</header>

<main>
  <section class="gets" id="gets">
    <div><h3>Customers text, it answers</h3><p>Questions, orders and pay links, in seconds, at any hour. Only from your real menu.</p></div>
    <div><h3>You text, it does the work</h3><p>"Banana bread is sold out." "Accept Priya's order." "What did we make today?"</p></div>
    <div><h3>It remembers</h3><p>What you told it this morning, and what each regular likes. "Same as last time?"</p></div>
  </section>

  <section id="studio">
    <div class="shophead"><h2 id="shopName"></h2><span id="source"></span></div>
    <div class="stats" id="stats"></div>
    <div id="alerts"></div>
    <div class="grid">
      <div class="panel wide"><h3>Orders</h3><p class="hint">They land here, and on your phone, the moment a customer confirms.</p><div id="orders"></div></div>
      <div class="panel dark"><h3>Tell your octopus</h3><p class="hint">You message, it does the work.</p><p class="hint" id="ownerLine"></p><div class="chips" id="chips"></div><div class="thread" id="ownerThread"></div><form class="send" id="ownerForm"><input id="ownerInput" placeholder="Banana bread is sold out" aria-label="Message your octopus"><button>Send</button></form></div>
      <div class="panel wide"><h3>Menu and stock</h3><p class="hint">Change a price, count what is left, or switch an item off. Counted items go down with every order and switch off at zero.</p><div id="menu"></div><form class="send" id="addForm"><input id="addName" placeholder="New item" aria-label="New item name"><input id="addPrice" placeholder="Price" inputmode="decimal" aria-label="New item price" style="max-width:110px"><button>Add</button></form></div>
      <div class="panel"><h3>Selling today</h3><p class="hint">What is moving, most first.</p><div id="sellers"></div></div>
      <div class="panel wide"><h3>Your customers</h3><p class="hint">Who ordered, how often, and their usual.</p><div id="customers"></div></div>
      <div class="panel"><h3>Your customer app</h3><p class="hint">A storefront made for your shop: menu, cart, pay and live order status. Share the link or the code.</p><img class="qr" id="storeQr" alt="QR code for your customer app"><a id="storeLink" target="_blank" rel="noopener" style="text-align:center;font-weight:700;color:var(--violet)">Open your customer app</a></div>
      <div class="panel"><h3>Your text line</h3><p class="hint">Customers scan this and text. Post it anywhere.</p><img class="qr" id="qr" alt="QR code for your text line"><p id="lineText" style="text-align:center;font-weight:700"></p></div>
      <div class="panel"><h3>Try it as a customer</h3><p class="hint">This is what your customers get when they text.</p><div class="thread" id="custThread"></div><form class="send" id="custForm"><input id="custInput" placeholder="two coffees for 3 PM" aria-label="Message as a customer"><button>Send</button></form></div>
      <div class="panel wide"><h3>What your octopus did today</h3><p class="hint">Eight arms, counted live.</p><div id="arms"></div></div>
      <div class="panel"><h3>Take it with you</h3><p class="hint">Open the Octopus iPhone app and enter this code to run the same shop from your pocket.</p><p class="code" id="claim"></p></div>
    </div>
  </section>
</main>
<footer>Eight arms. One shop. Zero staff.</footer>

<script type="module">
const API = window.OCTOPUS_API || '';
const ROOT = window.OCTOPUS_ROOT || '/';
const STORE = ROOT + (window.OCTOPUS_API ? 'shop/?id=' : 'shop?id=');
const DASH = ROOT + (window.OCTOPUS_API ? 'dashboard/?id=' : 'dashboard?id=');
const $ = (id) => document.getElementById(id);
const ARMS = ['Takes orders by text','Answers customer questions','Sends the pay link','Remembers every regular','Reads your menu','Pings you when an order lands','Tells customers when the order is ready',"Sends you the day's total"];
let currency = 'usd';
const money = (c) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(c / 100);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dashId = new URLSearchParams(location.search).get('id');
let shopId = dashId;
const lastShop = localStorage.getItem('octopusShop');
if (dashId) { document.body.classList.add('dash'); localStorage.setItem('octopusShop', dashId); }
let session = localStorage.getItem('octopusSession');
if (!session) { session = Math.random().toString(36).slice(2, 12); localStorage.setItem('octopusSession', session); }
let seenOrders = null;
let octo = { pulse() {}, setMood() {} };

if (!dashId) import('https://cdn.jsdelivr.net/gh/techadnank9/octopus@plan/plan/octo3d.js')
  .then((m) => { octo = m.mountOctopus($('octo'), { glbUrl: 'https://cdn.jsdelivr.net/gh/techadnank9/octopus@plan/plan/assets/octopus.glb' }); })
  .catch(() => { $('octo').innerHTML = '<img alt="Octopus" style="width:100%;height:100%;object-fit:contain" src="https://cdn.jsdelivr.net/gh/techadnank9/octopus@plan/plan/assets/octopus-concept.png">'; });

async function post(path, body) {
  const res = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function ding() {
  try {
    const ac = ding.ac || (ding.ac = new AudioContext());
    [880, 1318.5].forEach((f, k) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + k * 0.12;
      o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.65);
    });
  } catch (e) { /* sound needs a first tap */ }
}

function showThread(el, messages, waiting) {
  el.innerHTML = messages.map((m) => '<div class="msg ' + m.role + '">' + esc(m.text) + (m.link ? '<a target="_blank" rel="noopener" href="' + esc(m.link) + '">Pay now</a>' : '') + '</div>').join('') + (waiting ? '<div class="typing">Octopus is typing</div>' : '');
  el.scrollTop = el.scrollHeight;
}

function wireChat(formId, inputId, threadId, path, extra) {
  const thread = $(threadId);
  let messages = [];
  const say = async (text) => {
    messages = messages.concat([{ role: 'customer', text: text }]);
    showThread(thread, messages, true);
    try { messages = (await post(path, Object.assign({ shopId: shopId, text: text }, extra))).messages; }
    catch (err) { messages = messages.concat([{ role: 'agent', text: err.message }]); }
    showThread(thread, messages, false);
    refresh();
  };
  $(formId).addEventListener('submit', (e) => { e.preventDefault(); const v = $(inputId).value.trim(); if (v) { $(inputId).value = ''; say(v); } });
  post(path, Object.assign({ shopId: shopId }, extra)).then((d) => { messages = d.messages; showThread(thread, messages, false); }).catch(() => {});
  return say;
}

async function refresh() {
  if (!shopId) return;
  const res = await fetch(API + '/public/state?shopId=' + encodeURIComponent(shopId));
  if (!res.ok) { if (res.status === 400) { localStorage.removeItem('octopusShop'); location.href = ROOT; } return; }
  const s = await res.json();
  currency = s.shop.currency || 'usd';
  $('shopName').textContent = s.shop.name;
  $('source').textContent = localStorage.getItem('octopusSource') || '';
  if (!menuBusy()) $('menu').innerHTML = s.items.length ? s.items.map((i) => {
    const n = esc(i.name);
    const stock = i.stock === null ? '<button data-n="' + n + '" data-a="count">Count stock</button>'
      : '<button data-n="' + n + '" data-a="dec" aria-label="One fewer ' + n + '">−</button><b class="' + (i.stock <= 3 ? 'low' : '') + '">' + i.stock + '</b><button data-n="' + n + '" data-a="inc" aria-label="One more ' + n + '">+</button><button data-n="' + n + '" data-a="uncount" aria-label="Stop counting ' + n + '">×</button>';
    return '<div class="mrow' + (i.available ? '' : ' off') + '"><span class="nm">' + n + '</span><input data-n="' + n + '" data-a="price" inputmode="decimal" aria-label="Price of ' + n + '" value="' + (i.priceCents / 100).toFixed(2) + '"><div class="stock" data-s="' + (i.stock === null ? '' : i.stock) + '">' + stock + '</div><button class="tog' + (i.available ? ' is' : '') + '" data-n="' + n + '" data-a="toggle" data-on="' + (i.available ? 1 : 0) + '">' + (i.available ? 'On sale' : 'Off') + '</button></div>';
  }).join('') : '<p class="empty">No items yet. Add one below, or tell your octopus: "Add flat white for 4.50".</p>';
  const d = s.dashboard;
  $('stats').innerHTML = [[d.today.orders, 'orders today'], [money(d.today.paidCents), 'collected'], [money(d.today.unpaidCents), 'still unpaid'], [money(d.today.averageCents), 'average order']]
    .map((t) => '<div><b>' + t[0] + '</b><span>' + t[1] + '</span></div>').join('');
  $('alerts').innerHTML = d.alerts.map((a) => '<div class="alert"><i></i>' + esc(a) + '</div>').join('');
  $('sellers').innerHTML = d.topSellers.length ? d.topSellers.map((t) => '<div class="row"><span>' + esc(t.name) + '</span><b>' + t.qty + '</b></div>').join('') : '<p class="empty">Nothing sold yet today.</p>';
  $('customers').innerHTML = d.customers.length ? d.customers.map((c) => '<div class="cust"><b>' + esc(c.name) + '</b><span>' + c.orders + (c.orders === 1 ? ' order' : ' orders') + '</span><span>' + money(c.spentCents) + '</span><span>' + esc(c.usual || '') + '</span></div>').join('') : '<p class="empty">Your first customer will show up here.</p>';
  if (s.shop.channelLink) {
    $('qr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=380x380&data=' + encodeURIComponent(s.shop.channelLink);
    const m = /^sms:([^&?]+)[&?]body=(.*)$/.exec(s.shop.channelLink);
    $('lineText').textContent = m ? 'Text ' + decodeURIComponent(m[2]) + ' to ' + m[1] : s.shop.channelLink;
  } else { $('lineText').textContent = 'Your text line is being set up'; }
  const om = s.shop.ownerLink && /^sms:([^&?]+)[&?]body=(.*)$/.exec(s.shop.ownerLink);
  $('ownerLine').textContent = om ? 'Or from your phone: text ' + decodeURIComponent(om[2]) + ' to ' + om[1] : '';
  const storeUrl = new URL(STORE + encodeURIComponent(shopId), location.href).href;
  $('storeLink').href = storeUrl;
  if ($('storeQr').dataset.u !== storeUrl) { $('storeQr').dataset.u = storeUrl; $('storeQr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=380x380&data=' + encodeURIComponent(storeUrl); }
  $('claim').textContent = s.shop.claimCode || 'Already on your phone';
  const ids = s.orders.map((o) => o.id);
  const fresh = seenOrders ? ids.filter((id) => seenOrders.indexOf(id) < 0) : [];
  if (fresh.length) { ding(); octo.setMood('happy'); octo.pulse(); }
  seenOrders = ids;
  $('orders').innerHTML = s.orders.length ? s.orders.map((o) => {
    const acts = o.status === 'new' ? '<button class="main" data-o="' + o.id + '" data-s="accepted">Accept</button>'
      : o.status === 'accepted' ? '<span class="state">Accepted</span><button class="main" data-o="' + o.id + '" data-s="ready">Ready</button>'
      : '<span class="state">' + (o.status === 'ready' ? 'Ready' : 'Cancelled') + '</span>';
    const pay = o.paid ? '' : '<button data-o="' + o.id + '" data-s="paid">Mark paid (demo)</button>';
    return '<div class="order' + (fresh.indexOf(o.id) >= 0 ? ' fresh' : '') + '"><div class="top"><span>' + esc(o.customer) + '</span><span class="pill' + (o.paid ? ' ok' : '') + '">' + (o.paid ? 'Paid' : 'Unpaid') + '</span></div><div class="what">' + esc(o.lines.join(', ')) + (o.requestedTime ? ', ' + esc(o.requestedTime) : '') + ' <b>' + money(o.totalCents) + '</b></div><div class="acts">' + acts + pay + '</div></div>';
  }).join('') : '<p class="empty">No orders yet. Text your line, or try the customer chat.</p>';
  $('arms').innerHTML = ARMS.map((a, k) => '<div class="arm' + (s.arms[k] ? ' lit' : '') + '"><i></i><span>' + a + '</span><b>' + s.arms[k] + '</b></div>').join('');
}

const menuBusy = () => document.activeElement && document.activeElement.closest && document.activeElement.closest('#menu');
async function item(body) {
  try { await post('/public/item', Object.assign({ shopId: shopId }, body)); } catch (err) { alert(err.message); }
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  refresh();
}
$('menu').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-a]');
  if (!b) return;
  const name = b.dataset.n, a = b.dataset.a, now = Number(b.parentElement.dataset.s || 0);
  if (a === 'toggle') item({ name: name, available: b.dataset.on !== '1' });
  if (a === 'count') item({ name: name, stock: 10 });
  if (a === 'uncount') item({ name: name, stock: null });
  if (a === 'inc') item({ name: name, stock: now + 1 });
  if (a === 'dec') item({ name: name, stock: Math.max(0, now - 1) });
});
$('menu').addEventListener('change', (e) => {
  const f = e.target.closest('input[data-a="price"]');
  const price = f ? Number(f.value) : NaN;
  if (f && price >= 0) item({ name: f.dataset.n, price: price });
});
$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('addName').value.trim(), price = Number($('addPrice').value);
  if (!name || !(price >= 0) || $('addPrice').value.trim() === '') return;
  $('addName').value = ''; $('addPrice').value = '';
  item({ create: true, name: name, price: price });
});

$('orders').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-o]');
  if (!b) return;
  b.disabled = true;
  try { await post('/public/order', { orderId: b.dataset.o, status: b.dataset.s }); } catch (err) { alert(err.message); }
  refresh();
});

let wired = false;
function openStudio() {
  $('studio').classList.add('on');
  if (!wired) {
    wired = true;
    wireChat('custForm', 'custInput', 'custThread', '/public/chat', { session: session });
    const tell = wireChat('ownerForm', 'ownerInput', 'ownerThread', '/public/owner', {});
    ['Accept the newest order', 'How much did we make today?', 'What is running low?', 'Tell customers we close early today'].forEach((t) => {
      const c = document.createElement('button'); c.type = 'button'; c.textContent = t; c.onclick = () => tell(t); $('chips').append(c);
    });
    setInterval(refresh, 2500);
  }
  refresh();
}

$('build').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = $('query').value.trim();
  $('err').textContent = '';
  if (!query) { $('err').textContent = 'Enter your website or your business name.'; return; }
  const steps = Array.from($('steps').children);
  $('go').disabled = true; $('go').textContent = 'Building'; $('steps').hidden = false;
  let at = 0; steps.forEach((li) => { li.className = ''; }); steps[0].className = 'on';
  const tick = setInterval(() => { if (at < steps.length - 1) { steps[at].className = 'done'; at += 1; steps[at].className = 'on'; } }, 2200);
  octo.setMood('busy');
  try {
    const made = await post('/onboard', { query: query });
    localStorage.setItem('octopusShop', made.shopId);
    localStorage.setItem('octopusSource', made.source ? 'Read from ' + made.source.replace(/^https?:\/\//, '').replace(/\/$/, '') + '. Wrong site? Set up another shop with the full address.' : 'No website found. Tell your octopus what you sell.');
    seenOrders = null; wired = false;
    steps.forEach((li) => { li.className = 'done'; });
    location.href = DASH + encodeURIComponent(made.shopId);
    return;
    octo.setMood('happy');
  } catch (err) { $('err').textContent = err.message; octo.setMood('idle'); }
  clearInterval(tick);
  $('go').disabled = false; $('go').textContent = 'Build my shop';
});

$('navNew').href = ROOT;
if (dashId) { $('navStore').href = STORE + encodeURIComponent(dashId); openStudio(); }
else if (lastShop) { $('resume').hidden = false; $('resumeLink').href = DASH + encodeURIComponent(lastShop); }
</script>
</body>
</html>`;
