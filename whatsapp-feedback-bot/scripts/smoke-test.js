// End-to-end smoke test with a mock WhatsApp Cloud API.
// Flow tested: WooCommerce order feed -> scheduler sends template ->
// customer replies rating -> bot asks for comment -> customer comments ->
// request completed and visible in CSV export.
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const DB_FILE = path.join(__dirname, 'smoke-test.db');
if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);

// Configure BEFORE requiring app modules.
process.env.DB_PATH = DB_FILE;
process.env.WHATSAPP_TOKEN = 'test-token';
process.env.PHONE_NUMBER_ID = '123456';
process.env.VERIFY_TOKEN = 'verify-me';
process.env.ADMIN_TOKEN = 'admin-secret';
process.env.WC_WEBHOOK_SECRET = 'wc-secret';
process.env.FEEDBACK_DELAY_HOURS = '0';
process.env.DISCOUNT_CODE = 'RUPOSH10';

const sentMessages = [];
const mockApi = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    sentMessages.push(JSON.parse(body));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ messages: [{ id: `wamid.${sentMessages.length}` }] }));
  });
});

async function main() {
  await new Promise((r) => mockApi.listen(0, r));
  process.env.GRAPH_API_BASE = `http://127.0.0.1:${mockApi.address().port}`;

  const { createApp } = require('../src/server');
  const scheduler = require('../src/scheduler');
  const store = require('../src/db');

  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  // 1. Webhook verification handshake
  const verify = await fetch(
    `${base}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42`
  );
  assert.strictEqual(await verify.text(), '42', 'webhook verification');

  // 2. WooCommerce order arrives (feed mechanism)
  const order = JSON.stringify({
    id: 16660,
    status: 'completed',
    billing: { first_name: 'Aswad', last_name: 'Attar', phone: '07006282510' },
    line_items: [{ name: 'Face Serum' }]
  });
  const signature = crypto.createHmac('sha256', 'wc-secret').update(order).digest('base64');
  const wcRes = await fetch(`${base}/webhook/woocommerce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-WC-Webhook-Signature': signature },
    body: order
  });
  assert.deepStrictEqual(await wcRes.json(), { ok: true, created: true, id: 1 }, 'order accepted');

  // Bad signature must be rejected
  const badRes = await fetch(`${base}/webhook/woocommerce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-WC-Webhook-Signature': 'nope' },
    body: order
  });
  assert.strictEqual(badRes.status, 401, 'invalid signature rejected');

  // Duplicate delivery of the same order must not create a second request
  const dupRes = await fetch(`${base}/webhook/woocommerce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-WC-Webhook-Signature': signature },
    body: order
  });
  assert.strictEqual((await dupRes.json()).duplicate, true, 'duplicate order ignored');

  // 3. Scheduler sends the template message
  await scheduler.tick();
  assert.strictEqual(sentMessages.length, 1, 'one message sent');
  assert.strictEqual(sentMessages[0].type, 'template');
  assert.strictEqual(sentMessages[0].to, '917006282510', 'phone normalized');
  assert.strictEqual(
    sentMessages[0].template.components[0].parameters[1].text,
    'Face Serum',
    'product in template'
  );

  // 4. Customer replies with a rating
  const inbound = (text) =>
    fetch(`${base}/webhook/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [
          {
            changes: [
              { value: { messages: [{ from: '917006282510', type: 'text', text: { body: text } }] } }
            ]
          }
        ]
      })
    });

  await inbound('5');
  await new Promise((r) => setTimeout(r, 200)); // webhook handling is async after the 200 ack
  assert.strictEqual(sentMessages.length, 2, 'comment prompt sent');
  assert.match(sentMessages[1].text.body, /Anything you'd like to tell us/, 'asks for comment');

  // 5. Customer sends a comment
  await inbound('Loved the lavender smell, packaging could be sturdier');
  await new Promise((r) => setTimeout(r, 200));
  assert.strictEqual(sentMessages.length, 3, 'thank-you sent');
  assert.match(sentMessages[2].text.body, /RUPOSH10/, 'discount code included');

  const row = store.allRequests()[0];
  assert.strictEqual(row.status, 'completed');
  assert.strictEqual(row.rating, 5);
  assert.match(row.comment, /lavender/);

  // 6. Manual feed API + CSV export
  const manual = await fetch(`${base}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-secret' },
    body: JSON.stringify({ name: 'Madiha', phone: '9876543210', product: 'Lavender Essential Oil' })
  });
  assert.strictEqual(manual.status, 201, 'manual order created');

  const unauth = await fetch(`${base}/api/orders`, { method: 'POST' });
  assert.strictEqual(unauth.status, 401, 'manual feed requires token');

  const csv = await fetch(`${base}/admin/export.csv?token=admin-secret`);
  const csvText = await csv.text();
  assert.match(csvText, /Face Serum/, 'csv contains order');
  assert.match(csvText, /lavender smell/, 'csv contains comment');

  // 7. Opt-out handling
  await inbound('STOP');
  await new Promise((r) => setTimeout(r, 200));
  assert.strictEqual(store.isOptedOut('917006282510'), true, 'opt-out recorded');

  console.log('✅ smoke test passed — feed, send, rating, comment, export, opt-out all working');
  server.close();
  mockApi.close();
  fs.unlinkSync(DB_FILE);
}

main().catch((err) => {
  console.error('❌ smoke test failed:', err);
  process.exit(1);
});
