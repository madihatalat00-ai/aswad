const crypto = require('node:crypto');
const express = require('express');
const { config } = require('./config');
const store = require('./db');
const { normalizePhone } = require('./phone');
const { handleInboundMessage } = require('./conversation');

function scheduleTime() {
  return Date.now() + config.feedbackDelayHours * 60 * 60 * 1000;
}

function isAdmin(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.token;
  return !!config.adminToken && token === config.adminToken;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createApp() {
  const app = express();
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    })
  );

  app.get('/health', (req, res) => res.json({ ok: true }));

  // ---- WhatsApp Cloud API webhook -------------------------------------

  // Meta calls this once to verify the webhook URL.
  app.get('/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    if (mode === 'subscribe' && token === config.verifyToken) {
      return res.status(200).send(req.query['hub.challenge']);
    }
    res.sendStatus(403);
  });

  // Inbound customer messages and delivery statuses.
  app.post('/webhook/whatsapp', (req, res) => {
    res.sendStatus(200); // Ack immediately; Meta retries on non-2xx.
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        for (const message of change.value?.messages || []) {
          handleInboundMessage(message).catch((err) =>
            console.error('[webhook] failed to handle message:', err.message)
          );
        }
      }
    }
  });

  // ---- Feed source 1: WooCommerce order webhook ------------------------

  app.post('/webhook/woocommerce', (req, res) => {
    if (config.wcWebhookSecret) {
      const signature = req.headers['x-wc-webhook-signature'];
      const expected = crypto
        .createHmac('sha256', config.wcWebhookSecret)
        .update(req.rawBody || Buffer.alloc(0))
        .digest('base64');
      const valid =
        signature &&
        signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      if (!valid) return res.status(401).json({ error: 'invalid signature' });
    }

    const order = req.body || {};
    // WooCommerce sends a ping with only webhook_id when the webhook is created.
    if (order.webhook_id && !order.id) return res.json({ ok: true, ping: true });

    if (String(order.status) !== config.wcTriggerStatus) {
      return res.json({ ok: true, skipped: `status is '${order.status}', waiting for '${config.wcTriggerStatus}'` });
    }

    const phone = normalizePhone(order.billing?.phone);
    if (!phone) return res.json({ ok: true, skipped: 'no valid phone on order' });
    if (store.isOptedOut(phone)) return res.json({ ok: true, skipped: 'customer opted out' });

    const name = [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(' ') || 'there';
    const product = (order.line_items || []).map((item) => item.name).join(', ') || 'your order';

    const result = store.createRequest({
      orderId: String(order.id),
      source: 'woocommerce',
      customerName: name,
      phone,
      product,
      scheduledAt: scheduleTime()
    });
    res.json({ ok: true, ...result });
  });

  // ---- Feed source 2: manual / other channels (Instagram, offline) -----

  app.post('/api/orders', (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });

    const { orderId, name, phone: rawPhone, product, delayHours } = req.body || {};
    const phone = normalizePhone(rawPhone);
    if (!phone) return res.status(400).json({ error: 'valid phone is required' });
    if (!product) return res.status(400).json({ error: 'product is required' });
    if (store.isOptedOut(phone)) return res.status(409).json({ error: 'customer opted out' });

    const delay = delayHours !== undefined ? parseFloat(delayHours) : config.feedbackDelayHours;
    const result = store.createRequest({
      orderId: orderId ? String(orderId) : null,
      source: 'manual',
      customerName: name || 'there',
      phone,
      product,
      scheduledAt: Date.now() + delay * 60 * 60 * 1000
    });
    res.status(result.created ? 201 : 200).json(result);
  });

  // ---- Admin dashboard --------------------------------------------------

  app.get('/admin', (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized. Append ?token=YOUR_ADMIN_TOKEN');
    const { byStatus, avgRating, ratingsCount } = store.stats();
    const rows = store.allRequests();
    const statusLine = byStatus.map((s) => `${s.status}: ${s.count}`).join(' · ') || 'no requests yet';
    const table = rows
      .map(
        (r) => `<tr>
          <td>${r.id}</td><td>${escapeHtml(r.order_id || '—')}</td><td>${escapeHtml(r.customer_name)}</td>
          <td>${escapeHtml(r.phone)}</td><td>${escapeHtml(r.product)}</td><td>${escapeHtml(r.status)}</td>
          <td>${r.rating ?? ''}</td><td>${escapeHtml(r.comment || '')}</td>
          <td>${new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')}</td>
        </tr>`
      )
      .join('');
    res.send(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(config.brandName)} Feedback</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:2rem;color:#222}
        table{border-collapse:collapse;width:100%;font-size:.9rem}
        th,td{border:1px solid #ddd;padding:.4rem .6rem;text-align:left;vertical-align:top}
        th{background:#f5f0fa} .stats{margin-bottom:1rem;color:#555}
        h1{color:#6b4d8f}
      </style>
      <h1>${escapeHtml(config.brandName)} — Customer Feedback</h1>
      <p class="stats">Average rating: <strong>${avgRating ? avgRating.toFixed(2) : '—'}</strong>
        (${ratingsCount} rating${ratingsCount === 1 ? '' : 's'}) &nbsp;|&nbsp; ${escapeHtml(statusLine)}
        &nbsp;|&nbsp; <a href="/admin/export.csv?token=${encodeURIComponent(req.query.token || '')}">Export CSV</a></p>
      <table><tr><th>#</th><th>Order</th><th>Customer</th><th>Phone</th><th>Product</th>
        <th>Status</th><th>Rating</th><th>Comment</th><th>Created (UTC)</th></tr>${table}</table>`);
  });

  app.get('/admin/export.csv', (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const rows = store.allRequests();
    const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'id,order_id,source,customer_name,phone,product,status,rating,comment,created_at,sent_at';
    const lines = rows.map((r) =>
      [
        r.id, r.order_id, r.source, r.customer_name, r.phone, r.product, r.status, r.rating, r.comment,
        new Date(r.created_at).toISOString(),
        r.sent_at ? new Date(r.sent_at).toISOString() : ''
      ]
        .map(csvCell)
        .join(',')
    );
    res.type('text/csv').attachment('feedback.csv').send([header, ...lines].join('\n'));
  });

  return app;
}

module.exports = { createApp };
