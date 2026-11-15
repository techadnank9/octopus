// All content for the plan page. Facts about sponsor APIs come from their docs, read 15 Nov 2026.

export const ARMS = [
  'Takes orders by text',
  'Answers customer questions',
  'Sends the pay link',
  'Remembers every regular',
  'Reads your menu from a photo',
  'Pings you when an order lands',
  'Tells customers when the order is ready',
  "Sends you the day's total at closing",
];

export const MENU = [
  ['Flat white', 450], ['Iced latte', 500], ['Cortado', 400],
  ['Banana bread', 350], ['Almond croissant', 425],
];

// One list drives the phones, the step list and the diagram.
// owner: screen to show. chat: message to add. arms: counters to bump. path: diagram edges to light.
export const STEPS = [
  { title: 'Owner names the shop', what: 'Maya types her shop name and taps Continue.',
    how: 'Mutation shops.create writes one row. No sign-in: a device id stands in for the owner.',
    owner: 'welcome', path: ['app-convex'] },
  { title: 'Owner photographs the menu', what: 'One photo. Items and prices appear as a list she can fix.',
    how: 'Photo goes to Convex file storage. An action sends it to a vision model and saves items. Prices stored as cents.',
    owner: 'menu', arms: [5], path: ['app-convex', 'convex-vision'] },
  { title: 'The shop gets a text link', what: 'A QR code and a link she can post: "Text us to order".',
    how: 'Link is the Keiki join link for this agent, saved on the shop row and drawn as a QR in the app.',
    owner: 'number', path: ['app-convex'] },
  { title: 'A customer texts', what: '"two flat whites for 3 PM"',
    how: 'Keiki runs the agent turn. It calls our getMenu tool, a Convex HTTP action guarded by a secret header.',
    chat: ['me', 'two flat whites for 3 PM'], arms: [2], path: ['cust-keiki', 'keiki-convex'] },
  { title: 'The agent confirms the order', what: 'Full order and total in one message, from the real menu only.',
    how: 'Agent prompt forbids inventing items. Total shown is the server total returned by the tool.',
    chat: ['bot', "Hi, I'm Maya's octopus. 2 × Flat white, $9.00, pickup at 3 PM. Shall I place it?"], path: ['cust-keiki'] },
  { title: 'Customer says yes', what: 'The order is created and a pay link comes straight back.',
    how: 'createOrder re-prices every line from the catalog. createPaymentLink asks Whop for a checkout with our orderId in metadata.',
    chat: ['me', 'yes please'], chat2: ['bot', 'Placed. Pay here to confirm: whop.com/checkout/ch_8Tq…', 'link'],
    arms: [1, 3], path: ['keiki-convex', 'convex-whop'] },
  { title: "The owner's phone dings", what: 'The order slides in at the top of Orders, marked unpaid.',
    how: 'The Orders screen is a live Convex query. No polling, no push service needed for the demo.',
    owner: 'orders', order: 'new', ding: true, arms: [6], path: ['app-convex'] },
  { title: 'Customer pays', what: 'The card flips to Paid on its own.',
    how: 'Whop calls our webhook on payment.succeeded. We check the signature and set paymentStatus to paid.',
    owner: 'orders', order: 'paid', path: ['convex-whop', 'app-convex'] },
  { title: 'Owner taps Accept, then Ready', what: 'The customer gets a text at each tap.',
    how: 'Each status change sends a notice to the Keiki agent for that conversation, which words the text.',
    owner: 'orders', order: 'ready', chat: ['bot', 'Maya accepted your order.'], chat2: ['bot', 'Your flat whites are ready. See you in a sec!'],
    arms: [7], path: ['app-convex', 'keiki-convex', 'cust-keiki'] },
  { title: 'Next day, the same customer texts', what: 'The agent offers the usual.',
    how: 'getCustomerMemory searches Supermemory in a space named for this shop and this customer.',
    chat: ['me', 'hey, can I order?'], chat2: ['bot', 'Welcome back! Same as last time? 2 × Flat white, $9.00.'],
    arms: [4, 2], path: ['cust-keiki', 'keiki-convex', 'convex-memory'] },
  { title: 'Close on the Arms screen', what: 'Eight rows, each with a live count for today.',
    how: 'Every tool call and status change writes an events row with an arm number. The screen counts them.',
    owner: 'arms', path: ['app-convex'] },
];

export const SPONSORS = [
  { name: 'Convex', req: true, role: 'The whole backend',
    use: 'Tables, live queries for the Orders screen, HTTP actions the text agent calls, file storage for the menu photo, a scheduled job for the closing total.',
    fact: 'HTTP actions are served from the .convex.site address. Photo upload is three steps: get upload URL, POST the bytes, save the storage id.',
    arms: [5, 6, 8] },
  { name: 'Keiki', req: false, role: 'The text line and the agent that answers it',
    use: 'Keiki hosts the agent loop. We register six webhook tools that point at Convex and set the system prompt. The shop link is the Keiki join link.',
    fact: 'Sign-up is invite-only and plans are not yet purchasable. Outbound is a "notice" the agent rewords, not a verbatim text. Sender id arrives as context.phone.',
    risk: 'Biggest risk today. Ask the Keiki team in the room for access now.', arms: [1, 2, 7] },
  { name: 'Whop', req: false, role: 'The pay link',
    use: 'One checkout per order for the server-computed total, with our orderId in metadata. A webhook marks the order paid.',
    fact: 'Sandbox exists with its own keys and the 4242 test card. Event is payment.succeeded, signed with the Standard Webhooks scheme.',
    arms: [3] },
  { name: 'Supermemory', req: false, role: 'Remembering regulars',
    use: 'One memory space per customer per shop. We save the order after it is placed and search it when they text again.',
    fact: 'Saving is asynchronous. We ask for instant processing so "same as last time" works seconds later, and keep the last order in Convex as backup.',
    arms: [4] },
  { name: 'Capy', req: true, role: 'Six builders at once',
    use: 'Each agent gets one slice of the build order, works on its own branch and opens a pull request. Files do not overlap.',
    fact: 'Cloud threads need a paid plan or balance. Their machines cannot run a phone simulator, so device checks stay with Revyl.',
    arms: [] },
  { name: 'Revyl', req: true, role: 'Testing on a real build',
    use: 'Four plain-language flows, rerun after every merge: create shop, order arrives, accept and ready, counters move.',
    fact: 'Needs a real build, not Expo Go: a simulator .app or an .apk. Free tier is 1,200 device minutes a month.',
    arms: [] },
  { name: 'Candle', skip: true, role: 'Not used',
    use: 'A daily challenge for couples and friends. It has no job in a shop app, so adding it would be decoration.', fact: '', arms: [] },
];

export const NODES = {
  app:    { x: 40,  y: 70,  w: 220, h: 120, label: "Owner's app", sub: 'Expo, React Native', kind: 'ours',
            detail: 'Five screens: welcome, snap menu, shop number, orders, arms. Talks to Convex only. The Orders screen subscribes to a live query, so a new order appears without refresh. Sound and haptic fire when the list grows.' },
  cust:   { x: 40,  y: 410, w: 220, h: 120, label: 'Customer', sub: 'iMessage or other channel', kind: 'people',
            detail: 'No app to install. They scan the QR or tap the link, which opens their messages with the first text ready. We only ever message people who texted first.' },
  keiki:  { x: 330, y: 410, w: 210, h: 120, label: 'Keiki agent', sub: 'hosts the conversation', kind: 'sponsor',
            detail: 'Runs the agent loop for us. Holds the system prompt and six webhook tools. Each tool call arrives at Convex with the sender in context.phone. Our backend sends it a notice when an order is accepted or ready.' },
  convex: { x: 390, y: 60,  w: 250, h: 250, label: 'Convex', sub: 'data, live queries, files', kind: 'sponsor',
            detail: 'Five tables. Queries and mutations for the app. HTTP actions for the agent, each checking a shared secret header. Actions for the vision call, Whop and Supermemory. Every price is recomputed here; nothing the agent sends is trusted.' },
  vision: { x: 760, y: 40,  w: 200, h: 90,  label: 'Vision model', sub: 'menu photo to items', kind: 'ext',
            detail: 'One call with the photo and a strict JSON shape: name, price, optional description. Bad reads are fixed by hand in the editable list.' },
  whop:   { x: 760, y: 200, w: 200, h: 90,  label: 'Whop', sub: 'pay link, paid signal', kind: 'sponsor',
            detail: 'POST checkout_configurations with the amount and our orderId in metadata, returns a purchase URL. payment.succeeded webhook comes back to a Convex HTTP action, signature checked, order marked paid.' },
  memory: { x: 760, y: 360, w: 200, h: 90,  label: 'Supermemory', sub: 'what each regular orders', kind: 'sponsor',
            detail: 'Space name is shop id plus customer id. Add after each order, search when they return. Fallback: last order per customer straight from the orders table.' },
};

export const EDGES = [
  ['app-convex', 'app', 'convex', 'live data'],
  ['cust-keiki', 'cust', 'keiki', 'texts'],
  ['keiki-convex', 'keiki', 'convex', 'tools, notices'],
  ['convex-vision', 'convex', 'vision', 'photo'],
  ['convex-whop', 'convex', 'whop', 'pay'],
  ['convex-memory', 'convex', 'memory', 'memory'],
];

export const TABLES = [
  ['shops', ['name', 'ownerId', 'hours?', 'channelLink', 'createdAt']],
  ['items', ['shopId', 'name', 'priceCents', 'description?', 'available']],
  ['customers', ['shopId', 'channelId', 'displayName?', 'lastOrderAt?']],
  ['orders', ['shopId', 'customerId', 'lines[]', 'totalCents', 'requestedTime?', 'status', 'paymentStatus', 'paymentLink?', 'createdAt']],
  ['events', ['shopId', 'arm 1 to 8', 'createdAt']],
];

export const ENDPOINTS = [
  ['getMenu', 'shopId', 'Available items with prices, and the hours.'],
  ['createOrder', 'shopId, channelId, lines, requestedTime', 'Checks every item against the catalog, prices it on the server, returns orderId and total.'],
  ['createPaymentLink', 'orderId', 'Whop checkout URL for the stored total.'],
  ['getOrderStatus', 'orderId or channelId', "That customer's latest order status."],
  ['getCustomerMemory', 'shopId, channelId', 'Usual order and notes.'],
  ['saveCustomerMemory', 'shopId, channelId, note', 'Stores one new fact.'],
  ['whop webhook', 'signed event', 'Marks the order paid. Ignores repeats.'],
];

export const TIMELINE = [
  ['1:45', 'Scaffold and schema', 'Expo shell, five empty screens, Convex schema from this page, one seeded shop. Keiki access chased in parallel.', 'me'],
  ['2:15', 'Six agents start', 'Orders screen, snap menu, agent endpoints, Whop link, memory, shop number and arms. One branch each.', 'capy'],
  ['3:00', 'Keiki cut-off', 'No working channel by now means the in-app customer chat ships instead, on the same endpoints.', 'gate'],
  ['3:30', 'Merge and test', 'Branches land one by one. Revyl reruns the four flows after each.', 'revyl'],
  ['4:00', 'Whop cut-off', 'No live sandbox payment by now means a labelled "Mark paid (demo)" button.', 'gate'],
  ['4:15', 'Polish on a real phone', 'Order ding, haptic, slide-in. The 3D octopus on Welcome and Arms. Known-good menu photo saved.', 'me'],
  ['5:00', 'Demo works end to end', 'Feature freeze. Only fixes after this.', 'gate'],
  ['5:15', 'Rehearse and submit', 'Three-minute script, twice, with a second phone. Submit before 6:00.', 'me'],
];

export const AGENTS = [
  ['A', 'Shell and Orders', 'Navigation, live Orders list, Accept and Ready, ding'],
  ['B', 'Snap menu', 'Photo upload, extraction, editable catalog'],
  ['C', 'Agent endpoints and texts', 'getMenu, createOrder, getOrderStatus, accepted and ready notices'],
  ['D', 'Pay link', 'Whop checkout, signed webhook, paid status'],
  ['E', 'Memory', 'Supermemory add and search, Convex fallback'],
  ['F', 'Shop number and Arms', 'QR screen, share, eight live counters'],
];

export const TESTS = [
  'Create a shop, pick a menu photo, see at least three items, save.',
  'Open Orders, receive a new order, see it appear without refreshing.',
  'Tap Accept, then Ready, and see the status change.',
  'Open Arms and see counters above zero after an order.',
];

export const FALLBACKS = [
  ['Keiki not live by 3:00', 'In-app customer chat on the same endpoints, demoed on two phones.'],
  ['Whop not live by 4:00', 'Sandbox link, or a clearly labelled demo button.'],
  ['Menu read is wrong', 'Owner fixes it in the editable list. One known-good photo on hand.'],
  ['Supermemory slow', 'Last order per customer from Convex.'],
  ['3D drops frames on the phone', 'A pre-rendered loop of the same model.'],
];

export const DECISIONS = [
  { q: 'Keiki is invite-only. How do we get in?',
    pick: 'Ask the Keiki team at the event now, and build the in-app chat first so the demo never depends on it',
    alt: "Their docs show an invite code aimed at AI assistants. I haven't used it; it's yours to try at sign-up if you want" },
  { q: 'Brand colour',
    pick: 'Deep purple body with coral suckers, as on the octopus above, on off-white',
    alt: 'Coral body with purple accents' },
  { q: '3D octopus inside the phone app',
    pick: 'Reuse this page\'s scene in the app through a web view on Welcome and Arms. Same code, works in Expo Go',
    alt: 'Native 3D with react-three-fiber. Nicer, but known crashes on simulators and more setup' },
  { q: 'Capy needs a paid plan and Revyl needs a real build',
    pick: 'You sign up for both and connect the repo; I prepare the six task briefs, the setup file and the four test files',
    alt: 'I run the six slices as local parallel agents and you paste the same briefs into Capy for the record' },
  { q: 'Outbound texts are reworded by the agent',
    pick: 'Accept it. Send short notices like "order accepted, tell the customer"',
    alt: 'Run our own agent loop through Keiki\'s external harness for exact wording. Too slow for today' },
];
