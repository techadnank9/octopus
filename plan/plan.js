import { ARMS, MENU, STEPS, SPONSORS, NODES, EDGES, TABLES, ENDPOINTS, TIMELINE, AGENTS, TESTS, FALLBACKS, DECISIONS } from './plan-data.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const money = (c) => '$' + (c / 100).toFixed(2);
const GLB = 'assets/octopus.glb';
const STILL = 'assets/octopus-concept.png';

/* ---------- 3D octopus ---------- */
let octo = { pulse() {}, setMood() {} };
(async () => {
  const stage = $('octo');
  try {
    const { mountOctopus } = await import('./octo3d.js');
    octo = mountOctopus(stage, { glbUrl: GLB });
    await octo.ready;
  } catch (err) {
    console.warn('3D scene unavailable, showing still image', err);
    stage.innerHTML = `<img src="${STILL}" alt="Octopus" style="width:100%;height:100%;object-fit:contain">`;
  }
})();

/* ---------- hero arms ---------- */
ARMS.forEach((label, i) => {
  const li = el('li', '', `<span class="n">${i + 1}</span><span>${label}${i === 7 ? '<span class="soon">may ship as coming soon</span>' : ''}</span>`);
  li.addEventListener('mouseenter', () => octo.pulse(i));
  $('armList').append(li);
});

/* ---------- demo state ---------- */
let step = 0, timer = null, ownerOverride = null;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function stateAt(i) {
  const s = { owner: 'welcome', order: null, chat: [], arms: Array(8).fill(0) };
  STEPS.slice(0, i + 1).forEach((st, k) => {
    if (st.owner) s.owner = st.owner;
    if (st.order) s.order = st.order;
    if (k === 9) s.chat.push(['day', 'Next day']);
    if (st.chat) s.chat.push(st.chat);
    if (st.chat2) s.chat.push(st.chat2);
    (st.arms || []).forEach((a) => s.arms[a - 1]++);
  });
  return s;
}

const qr = () => {
  const n = 21, cells = [];
  const finder = (x, y) => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let on;
    if (finder(x, y)) { const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y; on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5); }
    else on = ((x * 7 + y * 13 + x * y) % 5) < 2;
    if (on) cells.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`);
  }
  return `<svg viewBox="0 0 ${n} ${n}" fill="#1B1230">${cells.join('')}</svg>`;
};

const VIEWS = {
  welcome: () => `<img class="mini-octo" src="${STILL}" alt="" style="object-fit:contain">
    <h4>Name your shop</h4><p class="hint">That's all we need to start.</p>
    <div class="field"><small>Shop name</small>Maya's Coffee Cart</div>
    <div class="field"><small>Opening hours (optional)</small>7 AM to 4 PM</div>
    <div class="cta">Continue</div>`,
  menu: () => `<h4>Snap your menu</h4>
    <div class="snap">Reading chalkboard photo</div>
    <div class="rows">${MENU.map(([n, p], k) => `<div class="row" style="animation-delay:${0.5 + k * 0.15}s"><span>${n}</span><b>${money(p)}</b></div>`).join('')}</div>
    <div class="cta">Save menu</div>`,
  number: () => `<h4>Your shop number</h4><p class="hint">Customers scan or tap, then text.</p>
    <div class="qr">${qr()}</div><p class="link">Text us to order</p>
    <div class="field"><small>Link</small>keiki.link/K-7QF2MD</div><div class="cta">Share</div>`,
  orders: (s) => {
    const o = s.order;
    const live = !o ? '<p class="hint">No orders yet. Share your shop number to get the first one.</p>' : `
      <div class="order ${o === 'new' ? 'fresh' : ''}">
        <div class="who"><span>Priya</span><span class="pill ${o === 'new' ? '' : 'ok'}">${o === 'new' ? 'Unpaid' : 'Paid'}</span></div>
        <div class="what">2 × Flat white, pickup 3 PM<br><b>${money(900)}</b></div>
        <div class="acts"><span class="${o === 'ready' ? 'done' : 'go'}">${o === 'ready' ? 'Accepted' : 'Accept'}</span><span class="${o === 'ready' ? 'done' : ''}">Ready${o === 'ready' ? ' ✓' : ''}</span></div>
      </div>`;
    return `<h4>Orders</h4>${live}
      <div class="order old"><div class="who"><span>Sam</span><span class="pill ok">Paid</span></div><div class="what">1 × Cortado, 1 × Banana bread<br><b>${money(750)}</b></div><div class="acts"><span class="done">Accepted</span><span class="done">Ready ✓</span></div></div>`;
  },
  arms: (s) => `<h4>Arms</h4><p class="hint">What your octopus did today.</p><div>` +
    ARMS.map((a, k) => `<div class="armrow ${s.arms[k] ? 'lit' : ''}"><i></i><span>${a}</span><span class="c ${STEPS[step].arms?.includes(k + 1) ? 'bump' : ''}">${k === 7 ? 'soon' : s.arms[k]}</span></div>`).join('') + '</div>',
};
const TABS = [['orders', 'Orders'], ['menu', 'Menu'], ['number', 'Number'], ['arms', 'Arms']];

function ding() {
  if (!$('sound').checked) return;
  try {
    const ac = ding.ac || (ding.ac = new AudioContext());
    [880, 1318.5].forEach((f, k) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + k * 0.12;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.65);
    });
  } catch { /* audio blocked until first tap */ }
}

function render(announce) {
  const s = stateAt(step), st = STEPS[step];
  const view = ownerOverride || s.owner;
  $('ownerScreen').innerHTML = `<div class="view">${VIEWS[view](s)}</div>`;
  $('ownerTabs').innerHTML = '';
  TABS.forEach(([id, label]) => {
    const b = el('button', view === id ? 'on' : '', label);
    b.onclick = () => { ownerOverride = id; render(); };
    $('ownerTabs').append(b);
  });
  $('thread').innerHTML = s.chat.map(([who, text, extra]) => who === 'day' ? `<div class="day">${text}</div>` : `<div class="msg ${who} ${extra || ''}">${text}</div>`).join('');
  [...$('steps').children].forEach((li, k) => { li.classList.toggle('on', k === step); li.classList.toggle('past', k < step); });
  document.querySelectorAll('#arch .edge, #arch .elabel').forEach((e) => e.classList.toggle('lit', st.path.includes(e.dataset.id)));
  $('caption').innerHTML = `<div><span class="k">Step ${step + 1}: what happens</span><b>${st.title}</b>${st.what}</div><div><span class="k">How it's built</span><br>${st.how}</div>`;
  if (announce) {
    if (st.ding) ding();
    (st.arms || []).forEach((a) => octo.pulse(a - 1));
    octo.setMood(st.ding ? 'happy' : st.chat ? 'busy' : 'idle');
  }
}
function go(i, announce = true) { step = (i + STEPS.length) % STEPS.length; ownerOverride = null; render(announce); }
function stop() { clearInterval(timer); timer = null; $('play').textContent = 'Play demo'; }
$('play').onclick = () => {
  if (timer) return stop();
  go(step === STEPS.length - 1 ? 0 : step);
  $('play').textContent = 'Pause';
  timer = setInterval(() => { if (step === STEPS.length - 1) stop(); else go(step + 1); }, reduce ? 3500 : 2800);
};
$('next').onclick = () => { stop(); go(step + 1); };
$('prev').onclick = () => { stop(); go(step - 1); };
STEPS.forEach((st, k) => {
  const li = el('li', '', `<b>${st.title}</b><span>${st.what}</span>`);
  li.tabIndex = 0;
  li.onclick = () => { stop(); go(k); };
  li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.onclick(); } };
  $('steps').append(li);
});

/* ---------- sponsors ---------- */
SPONSORS.forEach((s) => {
  const tag = s.skip ? '<span class="tag opt">Skipped</span>' : s.req ? '<span class="tag">Required</span>' : '<span class="tag opt">Optional</span>';
  $('sponsorGrid').append(el('article', 'sp' + (s.skip ? ' skip' : ''), `
    <header><h3>${s.name}</h3>${tag}</header><p class="role">${s.role}</p><p class="use">${s.use}</p>
    ${s.fact ? `<p class="fact">${s.fact}</p>` : ''}${s.risk ? `<p class="risk">${s.risk}</p>` : ''}
    ${s.arms.length ? `<p class="armtags">Powers arm ${s.arms.join(', ')}</p>` : ''}`));
});

/* ---------- architecture ---------- */
const anchors = {
  'app-convex': [260, 130, 390, 150], 'cust-keiki': [260, 470, 330, 470], 'keiki-convex': [450, 410, 480, 310],
  'convex-vision': [640, 110, 760, 85], 'convex-whop': [640, 200, 760, 245], 'convex-memory': [640, 285, 760, 400],
};
const svg = $('arch');
svg.innerHTML = EDGES.map(([id, , , label]) => {
  const [x1, y1, x2, y2] = anchors[id];
  const vertical = Math.abs(x2 - x1) < 60;
  return `<line class="edge" data-id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
    <text class="elabel" data-id="${id}" x="${(x1 + x2) / 2 + (vertical ? 14 : 0)}" y="${(y1 + y2) / 2 + (vertical ? 4 : -10)}" text-anchor="${vertical ? 'start' : 'middle'}">${label}</text>`;
}).join('') + Object.entries(NODES).map(([id, n]) => `
  <g class="node ${n.kind}" data-id="${id}" tabindex="0" role="button" aria-label="${n.label}">
    <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="18"/>
    <text x="${n.x + 18}" y="${n.y + 38}">${n.label}</text>
    <text class="s" x="${n.x + 18}" y="${n.y + 62}">${n.sub}</text>
  </g>`).join('') + `
  <g class="build"><rect x="40" y="552" width="920" height="40" rx="12"/>
  <text x="58" y="577">While building: six Capy agents, one branch each, open pull requests. Revyl reruns four flows on a real build after every merge.</text></g>`;
function showNode(id) {
  const n = NODES[id];
  svg.querySelectorAll('.node').forEach((g) => g.classList.toggle('sel', g.dataset.id === id));
  $('detail').innerHTML = `<h3>${n.label}</h3><p>${n.detail}</p>`;
}
svg.querySelectorAll('.node').forEach((g) => {
  g.onclick = () => showNode(g.dataset.id);
  g.onkeydown = (e) => { if (e.key === 'Enter') showNode(g.dataset.id); };
});
showNode('convex');

/* ---------- reference lists ---------- */
TABLES.forEach(([name, cols]) => $('tables').append(el('div', 'tbl', `<b>${name}</b>${cols.map((c) => `<span>${c}</span>`).join('')}`)));
ENDPOINTS.forEach(([n, a, d]) => $('endpoints').append(el('div', 'ep', `<b>${n}</b><span>${a}</span><span>${d}</span>`)));
TIMELINE.forEach(([t, title, d, kind]) => $('timeline').append(el('div', 'tick ' + kind, `<time>${t}</time><b>${title}</b><p>${d}</p>`)));
AGENTS.forEach(([l, t, d]) => $('agents').append(el('div', 'ag', `<i>${l}</i><div><b>${t}</b><span>${d}</span></div>`)));
TESTS.forEach((t) => $('tests').append(el('li', '', t)));
FALLBACKS.forEach(([a, b]) => $('fallbacks').append(el('li', '', `<b>${a}</b><span>${b}</span>`)));
DECISIONS.forEach((d) => $('decisions').append(el('div', 'dec', `<h3>${d.q}</h3><div class="pick"><small>My pick</small>${d.pick}</div><div class="alt"><small>Other option</small>${d.alt}</div>`)));

render(false);
