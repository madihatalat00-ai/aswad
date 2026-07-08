const { DatabaseSync } = require('node:sqlite');
const { config } = require('./config');

const db = new DatabaseSync(config.dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    product TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    scheduled_at INTEGER NOT NULL,
    sent_at INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    rating INTEGER,
    comment TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_order
    ON feedback_requests(source, order_id) WHERE order_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_requests_phone ON feedback_requests(phone);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON feedback_requests(status, scheduled_at);

  CREATE TABLE IF NOT EXISTS opt_outs (
    phone TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );
`);

// Request lifecycle: scheduled -> sent -> rated -> completed
//                    scheduled -> failed (after max attempts) / skipped (opted out)

function now() {
  return Date.now();
}

function createRequest({ orderId = null, source = 'manual', customerName, phone, product, scheduledAt }) {
  const ts = now();
  try {
    const result = db
      .prepare(
        `INSERT INTO feedback_requests
           (order_id, source, customer_name, phone, product, scheduled_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(orderId, source, customerName, phone, product, scheduledAt, ts, ts);
    return { created: true, id: Number(result.lastInsertRowid) };
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return { created: false, duplicate: true };
    }
    throw err;
  }
}

function dueRequests(limit = 20) {
  return db
    .prepare(
      `SELECT r.* FROM feedback_requests r
       LEFT JOIN opt_outs o ON o.phone = r.phone
       WHERE r.status = 'scheduled' AND r.scheduled_at <= ? AND o.phone IS NULL
       ORDER BY r.scheduled_at LIMIT ?`
    )
    .all(now(), limit);
}

function updateRequest(id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE feedback_requests SET ${sets}, updated_at = ? WHERE id = ?`).run(
    ...keys.map((k) => fields[k]),
    now(),
    id
  );
}

// The request this phone number is currently mid-conversation on.
function activeRequestForPhone(phone) {
  return db
    .prepare(
      `SELECT * FROM feedback_requests
       WHERE phone = ? AND status IN ('sent', 'rated')
       ORDER BY sent_at DESC LIMIT 1`
    )
    .get(phone);
}

function markOptedOut(phone) {
  db.prepare('INSERT OR IGNORE INTO opt_outs (phone, created_at) VALUES (?, ?)').run(phone, now());
  db.prepare(
    `UPDATE feedback_requests SET status = 'skipped', updated_at = ?
     WHERE phone = ? AND status IN ('scheduled', 'sent', 'rated')`
  ).run(now(), phone);
}

function isOptedOut(phone) {
  return !!db.prepare('SELECT 1 FROM opt_outs WHERE phone = ?').get(phone);
}

function allRequests() {
  return db.prepare('SELECT * FROM feedback_requests ORDER BY created_at DESC').all();
}

function stats() {
  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS count FROM feedback_requests GROUP BY status')
    .all();
  const rating = db
    .prepare('SELECT AVG(rating) AS avg, COUNT(rating) AS count FROM feedback_requests WHERE rating IS NOT NULL')
    .get();
  return { byStatus, avgRating: rating.avg, ratingsCount: rating.count };
}

module.exports = {
  db,
  createRequest,
  dueRequests,
  updateRequest,
  activeRequestForPhone,
  markOptedOut,
  isOptedOut,
  allRequests,
  stats
};
