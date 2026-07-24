/* ============================================================
   CaseFile — a private, local-first legal case manager.
   All data lives in localStorage; nothing leaves the browser.
   Cloud (Google Drive / Gmail) sync is stubbed for phase 2.
   ============================================================ */

"use strict";

const STORE_KEY = "casefile.data.v1";
const THEME_KEY = "casefile.theme";

/* ---------- Data model ---------- */
const blankData = () => ({
  clients: [],   // {id, name, email, phone, company, notes, createdAt}
  matters: [],   // {id, clientId, number, title, type, status, openedAt, notes}
  documents: [], // {id, matterId, name, type, date, link, notes}
  deadlines: [], // {id, matterId, title, due, done}
  billing: [],   // {id, matterId, date, description, hours, rate}
});

let data = load();
let currentView = "dashboard";
let searchQuery = "";

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blankData();
    return Object.assign(blankData(), JSON.parse(raw));
  } catch {
    return blankData();
  }
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- Small helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + (d.length <= 10 ? "T00:00:00" : ""));
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function daysUntil(d) {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((dt - today) / 86400000);
}
function money(n) {
  return "$" + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function clientName(id) {
  const c = data.clients.find((x) => x.id === id);
  return c ? c.name : "—";
}
function matterLabel(id) {
  const m = data.matters.find((x) => x.id === id);
  return m ? `${m.number} — ${m.title}` : "—";
}

const MATTER_TYPES = ["Litigation", "Corporate", "Real Estate", "Family", "Criminal",
  "Estate/Probate", "Immigration", "IP", "Employment", "Other"];
const DOC_TYPES = ["Pleading", "Correspondence", "Contract", "Evidence", "Court Order",
  "Discovery", "Memo", "Invoice", "Other"];

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), 2600);
}

/* ============================================================
   Rendering
   ============================================================ */
function render() {
  document.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.view === currentView));
  const main = $("#main");
  main.innerHTML = ({
    dashboard: viewDashboard,
    clients: viewClients,
    matters: viewMatters,
    documents: viewDocuments,
    deadlines: viewDeadlines,
    billing: viewBilling,
  }[currentView] || viewDashboard)();
}

function q(list, fields) {
  if (!searchQuery) return list;
  const s = searchQuery.toLowerCase();
  return list.filter((item) =>
    fields.some((f) => String(item[f] ?? "").toLowerCase().includes(s)));
}

/* ---------- Dashboard ---------- */
function viewDashboard() {
  const openMatters = data.matters.filter((m) => m.status === "Open").length;
  const upcoming = data.deadlines
    .filter((d) => !d.done && daysUntil(d.due) !== null && daysUntil(d.due) >= 0)
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  const overdue = data.deadlines.filter((d) => !d.done && daysUntil(d.due) !== null && daysUntil(d.due) < 0);
  const unbilled = data.billing.reduce((s, b) => s + (Number(b.hours) || 0) * (Number(b.rate) || 0), 0);

  const deadlineRows = upcoming.slice(0, 6).map((d) => {
    const n = daysUntil(d.due);
    const badge = n <= 3 ? `<span class="badge soon">${n}d</span>` : `<span class="badge">${n}d</span>`;
    return `<tr><td>${esc(d.title)}</td><td>${esc(matterLabel(d.matterId))}</td>
      <td>${fmtDate(d.due)} ${badge}</td></tr>`;
  }).join("");

  return `
    <div class="view-head"><div><h2>Dashboard</h2>
      <div class="view-sub">A quick view of your practice.</div></div></div>
    <div class="grid stats" style="margin-bottom:22px">
      <div class="card stat"><div class="num">${data.clients.length}</div><div class="label">Clients</div></div>
      <div class="card stat"><div class="num ok">${openMatters}</div><div class="label">Open matters</div></div>
      <div class="card stat"><div class="num ${overdue.length ? "danger" : ""}">${overdue.length}</div><div class="label">Overdue deadlines</div></div>
      <div class="card stat"><div class="num">${data.documents.length}</div><div class="label">Documents</div></div>
      <div class="card stat"><div class="num warn">${money(unbilled)}</div><div class="label">Time value logged</div></div>
    </div>
    ${overdue.length ? `<div class="card" style="border-color:var(--danger);margin-bottom:18px">
      <strong style="color:var(--danger)">⚠ ${overdue.length} overdue deadline${overdue.length > 1 ? "s" : ""}</strong>
      <div class="view-sub">${overdue.slice(0,4).map((d)=>esc(d.title)+" ("+fmtDate(d.due)+")").join(" · ")}</div></div>` : ""}
    <h3 style="margin:6px 0 12px">Upcoming deadlines</h3>
    ${upcoming.length ? `<div class="table-wrap"><table><thead><tr><th>Deadline</th><th>Matter</th><th>Due</th></tr></thead>
      <tbody>${deadlineRows}</tbody></table></div>`
      : `<div class="empty"><div class="big">📅</div><p>No upcoming deadlines.</p></div>`}
  `;
}

/* ---------- Clients ---------- */
function viewClients() {
  const list = q(data.clients, ["name", "email", "company", "phone", "notes"]);
  const cards = list.map((c) => {
    const matters = data.matters.filter((m) => m.clientId === c.id);
    return `<div class="card entity-card">
      <div class="row"><h3>${esc(c.name)}</h3></div>
      ${c.company ? `<div class="meta">${esc(c.company)}</div>` : ""}
      <div class="meta">${esc(c.email || "")}${c.email && c.phone ? " · " : ""}${esc(c.phone || "")}</div>
      <div class="meta" style="margin-top:6px">${matters.length} matter${matters.length !== 1 ? "s" : ""}</div>
      <div class="card-actions">
        <button class="btn small" onclick="openForm('client','${c.id}')">Edit</button>
        <button class="btn small ghost" onclick="goMattersFor('${c.id}')">Matters</button>
        <button class="btn small danger" onclick="remove('clients','${c.id}')">Delete</button>
      </div></div>`;
  }).join("");

  return `
    <div class="view-head"><div><h2>Clients</h2>
      <div class="view-sub">${data.clients.length} total</div></div>
      <button class="btn primary" onclick="openForm('client')">＋ New client</button></div>
    ${list.length ? `<div class="grid cards">${cards}</div>`
      : `<div class="empty"><div class="big">👤</div><p>No clients yet. Add your first client to get started.</p></div>`}
  `;
}

/* ---------- Matters ---------- */
function viewMatters() {
  const list = q(data.matters, ["number", "title", "type", "status", "notes"]);
  const rows = list.map((m) => {
    const badge = m.status === "Open" ? "open" : m.status === "On hold" ? "hold" : "closed";
    const docs = data.documents.filter((d) => d.matterId === m.id).length;
    return `<tr>
      <td><strong>${esc(m.number)}</strong></td>
      <td>${esc(m.title)}</td>
      <td>${esc(clientName(m.clientId))}</td>
      <td>${esc(m.type || "—")}</td>
      <td><span class="badge ${badge}">${esc(m.status)}</span></td>
      <td>${docs}</td>
      <td>
        <button class="btn small" onclick="openForm('matter','${m.id}')">Edit</button>
        <button class="btn small danger" onclick="remove('matters','${m.id}')">Delete</button>
      </td></tr>`;
  }).join("");

  return `
    <div class="view-head"><div><h2>Matters</h2>
      <div class="view-sub">Client → Matter → Documents</div></div>
      <button class="btn primary" onclick="openForm('matter')">＋ New matter</button></div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr>
        <th>No.</th><th>Title</th><th>Client</th><th>Type</th><th>Status</th><th>Docs</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty"><div class="big">📁</div><p>No matters yet.</p></div>`}
  `;
}

/* ---------- Documents ---------- */
function viewDocuments() {
  const list = q(data.documents, ["name", "type", "notes"]);
  const rows = list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map((d) => `<tr>
      <td><strong>${esc(d.name)}</strong>${d.notes ? `<div class="meta">${esc(d.notes)}</div>` : ""}</td>
      <td>${esc(d.type || "—")}</td>
      <td>${esc(matterLabel(d.matterId))}</td>
      <td>${fmtDate(d.date)}</td>
      <td>${d.link ? `<a class="link" href="${esc(d.link)}" target="_blank" rel="noopener">Open ↗</a>` : "—"}</td>
      <td>
        <button class="btn small" onclick="openForm('document','${d.id}')">Edit</button>
        <button class="btn small danger" onclick="remove('documents','${d.id}')">Delete</button>
      </td></tr>`).join("");

  return `
    <div class="view-head"><div><h2>Documents</h2>
      <div class="view-sub">Index of documents by matter. Link to files in Drive or on disk.</div></div>
      <button class="btn primary" onclick="openForm('document')">＋ Add document</button></div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr>
        <th>Name</th><th>Type</th><th>Matter</th><th>Date</th><th>File</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty"><div class="big">📄</div><p>No documents indexed yet.</p></div>`}
  `;
}

/* ---------- Deadlines ---------- */
function viewDeadlines() {
  const list = q(data.deadlines, ["title"])
    .sort((a, b) => (a.done - b.done) || (new Date(a.due || 0) - new Date(b.due || 0)));
  const rows = list.map((d) => {
    const n = daysUntil(d.due);
    let badge = "";
    if (d.done) badge = `<span class="badge closed">Done</span>`;
    else if (n !== null && n < 0) badge = `<span class="badge overdue">${Math.abs(n)}d overdue</span>`;
    else if (n !== null && n <= 7) badge = `<span class="badge soon">in ${n}d</span>`;
    else if (n !== null) badge = `<span class="badge">in ${n}d</span>`;
    return `<tr style="${d.done ? "opacity:.55" : ""}">
      <td><input type="checkbox" ${d.done ? "checked" : ""} onchange="toggleDeadline('${d.id}')"></td>
      <td><strong>${esc(d.title)}</strong></td>
      <td>${esc(matterLabel(d.matterId))}</td>
      <td>${fmtDate(d.due)} ${badge}</td>
      <td>
        <button class="btn small" onclick="openForm('deadline','${d.id}')">Edit</button>
        <button class="btn small danger" onclick="remove('deadlines','${d.id}')">Delete</button>
      </td></tr>`;
  }).join("");

  return `
    <div class="view-head"><div><h2>Deadlines</h2>
      <div class="view-sub">Court dates, filings, and statutes of limitation.</div></div>
      <button class="btn primary" onclick="openForm('deadline')">＋ New deadline</button></div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr>
        <th></th><th>Deadline</th><th>Matter</th><th>Due</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty"><div class="big">📅</div><p>No deadlines tracked.</p></div>`}
  `;
}

/* ---------- Billing ---------- */
function viewBilling() {
  const list = q(data.billing, ["description"])
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const total = list.reduce((s, b) => s + (Number(b.hours) || 0) * (Number(b.rate) || 0), 0);
  const hours = list.reduce((s, b) => s + (Number(b.hours) || 0), 0);
  const rows = list.map((b) => `<tr>
      <td>${fmtDate(b.date)}</td>
      <td>${esc(b.description)}</td>
      <td>${esc(matterLabel(b.matterId))}</td>
      <td>${(Number(b.hours) || 0).toFixed(2)}</td>
      <td>${money(b.rate)}</td>
      <td><strong>${money((Number(b.hours) || 0) * (Number(b.rate) || 0))}</strong></td>
      <td>
        <button class="btn small" onclick="openForm('time','${b.id}')">Edit</button>
        <button class="btn small danger" onclick="remove('billing','${b.id}')">Delete</button>
      </td></tr>`).join("");

  return `
    <div class="view-head"><div><h2>Billing &amp; Time</h2>
      <div class="view-sub">${hours.toFixed(2)} hrs logged · ${money(total)} total value</div></div>
      <button class="btn primary" onclick="openForm('time')">＋ Log time</button></div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr>
        <th>Date</th><th>Description</th><th>Matter</th><th>Hrs</th><th>Rate</th><th>Amount</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty"><div class="big">🧾</div><p>No time entries yet.</p></div>`}
  `;
}

/* ============================================================
   Forms (modal)
   ============================================================ */
function matterOptions(selected) {
  return data.matters.map((m) =>
    `<option value="${m.id}" ${m.id === selected ? "selected" : ""}>${esc(m.number)} — ${esc(m.title)}</option>`).join("");
}
function clientOptions(selected) {
  return data.clients.map((c) =>
    `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${esc(c.name)}</option>`).join("");
}
function selOptions(arr, selected) {
  return arr.map((v) => `<option ${v === selected ? "selected" : ""}>${esc(v)}</option>`).join("");
}

const FORMS = {
  client: {
    title: (r) => (r ? "Edit client" : "New client"),
    fields: (r = {}) => `
      <div class="field"><label>Full name *</label><input name="name" required value="${esc(r.name || "")}"></div>
      <div class="field"><label>Company / organization</label><input name="company" value="${esc(r.company || "")}"></div>
      <div class="field-row">
        <div class="field"><label>Email</label><input name="email" type="email" value="${esc(r.email || "")}"></div>
        <div class="field"><label>Phone</label><input name="phone" value="${esc(r.phone || "")}"></div>
      </div>
      <div class="field"><label>Notes</label><textarea name="notes">${esc(r.notes || "")}</textarea></div>`,
    collection: "clients",
  },
  matter: {
    title: (r) => (r ? "Edit matter" : "New matter"),
    fields: (r = {}) => `
      <div class="field-row">
        <div class="field"><label>Matter number *</label><input name="number" required value="${esc(r.number || suggestMatterNumber())}"></div>
        <div class="field"><label>Status</label><select name="status">${selOptions(["Open", "On hold", "Closed"], r.status || "Open")}</select></div>
      </div>
      <div class="field"><label>Title *</label><input name="title" required value="${esc(r.title || "")}"></div>
      <div class="field-row">
        <div class="field"><label>Client *</label><select name="clientId" required>
          <option value="">— select —</option>${clientOptions(r.clientId)}</select></div>
        <div class="field"><label>Type</label><select name="type">${selOptions(MATTER_TYPES, r.type || "Litigation")}</select></div>
      </div>
      <div class="field"><label>Opened</label><input name="openedAt" type="date" value="${esc(r.openedAt || today())}"></div>
      <div class="field"><label>Notes</label><textarea name="notes">${esc(r.notes || "")}</textarea></div>`,
    collection: "matters",
    validate: (v) => v.clientId ? null : "Please create a client first, then select one.",
  },
  document: {
    title: (r) => (r ? "Edit document" : "Add document"),
    fields: (r = {}) => `
      <div class="field"><label>Document name *</label><input name="name" required value="${esc(r.name || "")}"></div>
      <div class="field-row">
        <div class="field"><label>Type</label><select name="type">${selOptions(DOC_TYPES, r.type || "Correspondence")}</select></div>
        <div class="field"><label>Date</label><input name="date" type="date" value="${esc(r.date || today())}"></div>
      </div>
      <div class="field"><label>Matter *</label><select name="matterId" required>
        <option value="">— select —</option>${matterOptions(r.matterId)}</select></div>
      <div class="field"><label>File link (Google Drive URL or file path)</label><input name="link" placeholder="https://drive.google.com/…" value="${esc(r.link || "")}"></div>
      <div class="field"><label>Notes</label><textarea name="notes">${esc(r.notes || "")}</textarea></div>`,
    collection: "documents",
    validate: (v) => v.matterId ? null : "Please create a matter first, then select one.",
  },
  deadline: {
    title: (r) => (r ? "Edit deadline" : "New deadline"),
    fields: (r = {}) => `
      <div class="field"><label>Deadline *</label><input name="title" required placeholder="e.g. File response to motion" value="${esc(r.title || "")}"></div>
      <div class="field-row">
        <div class="field"><label>Due date *</label><input name="due" type="date" required value="${esc(r.due || "")}"></div>
        <div class="field"><label>Matter</label><select name="matterId">
          <option value="">— none —</option>${matterOptions(r.matterId)}</select></div>
      </div>`,
    collection: "deadlines",
  },
  time: {
    title: (r) => (r ? "Edit time entry" : "Log time"),
    fields: (r = {}) => `
      <div class="field"><label>Description *</label><input name="description" required value="${esc(r.description || "")}"></div>
      <div class="field"><label>Matter *</label><select name="matterId" required>
        <option value="">— select —</option>${matterOptions(r.matterId)}</select></div>
      <div class="field-row">
        <div class="field"><label>Date</label><input name="date" type="date" value="${esc(r.date || today())}"></div>
        <div class="field"><label>Hours</label><input name="hours" type="number" step="0.1" min="0" value="${esc(r.hours ?? "")}"></div>
      </div>
      <div class="field"><label>Rate ($/hr)</label><input name="rate" type="number" step="1" min="0" value="${esc(r.rate ?? "")}"></div>`,
    collection: "billing",
    validate: (v) => v.matterId ? null : "Please select a matter.",
  },
};

let editing = { type: null, id: null };

function openForm(type, id = null) {
  const cfg = FORMS[type];
  if (!cfg) return;
  editing = { type, id };
  const record = id ? data[cfg.collection].find((r) => r.id === id) : null;
  $("#modal-title").textContent = cfg.title(record);
  const form = $("#modal-form");
  form.innerHTML = cfg.fields(record || {}) + `
    <div class="modal-actions">
      <button type="button" class="btn ghost" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn primary">${id ? "Save changes" : "Create"}</button>
    </div>`;
  $("#modal-overlay").classList.remove("hidden");
  const first = form.querySelector("input,select,textarea");
  if (first) first.focus();
}

function closeModal() {
  $("#modal-overlay").classList.add("hidden");
  editing = { type: null, id: null };
}

$("#modal-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const cfg = FORMS[editing.type];
  const values = Object.fromEntries(new FormData(e.target).entries());
  if (cfg.validate) {
    const err = cfg.validate(values);
    if (err) { toast(err); return; }
  }
  const coll = data[cfg.collection];
  if (editing.id) {
    const rec = coll.find((r) => r.id === editing.id);
    Object.assign(rec, values);
    toast("Saved.");
  } else {
    coll.push(Object.assign({ id: uid(), createdAt: new Date().toISOString() }, values));
    toast("Created.");
  }
  save();
  closeModal();
  render();
});

/* ============================================================
   Actions
   ============================================================ */
function remove(collection, id) {
  const labels = { clients: "client", matters: "matter", documents: "document",
    deadlines: "deadline", billing: "time entry" };
  let warn = `Delete this ${labels[collection] || "item"}?`;
  if (collection === "clients") {
    const linked = data.matters.filter((m) => m.clientId === id).length;
    if (linked) warn += `\n\nThis client has ${linked} matter(s), which will keep their records but lose the client link.`;
  }
  if (!confirm(warn)) return;
  data[collection] = data[collection].filter((r) => r.id !== id);
  save();
  render();
  toast("Deleted.");
}

function toggleDeadline(id) {
  const d = data.deadlines.find((x) => x.id === id);
  if (d) { d.done = !d.done; save(); render(); }
}

function goMattersFor(clientId) {
  searchQuery = clientName(clientId);
  $("#global-search").value = searchQuery;
  currentView = "matters";
  render();
}

function suggestMatterNumber() {
  const year = new Date().getFullYear();
  const n = data.matters.filter((m) => (m.number || "").startsWith(String(year))).length + 1;
  return `${year}-${String(n).padStart(4, "0")}`;
}
const today = () => new Date().toISOString().slice(0, 10);

/* ============================================================
   Cloud sync placeholder (phase 2: Google Drive / Gmail)
   ============================================================ */
function initSync() {
  // Phase 2: OAuth into Google Drive to auto-file documents and
  // Gmail to attach client correspondence to matters. Kept as a
  // deliberate stub so no privileged data leaves the device yet.
  $("#sync-status").textContent = "Cloud sync: not connected (local-only)";
}

/* ============================================================
   Wiring
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
$("#theme-toggle").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
});

document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => { currentView = t.dataset.view; render(); }));

$("#global-search").addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  render();
});

$("#modal-close").addEventListener("click", closeModal);
$("#modal-overlay").addEventListener("click", (e) => {
  if (e.target.id === "modal-overlay") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#modal-overlay").classList.contains("hidden")) closeModal();
});

// Seed a tiny demo on very first run so the app isn't empty.
function maybeSeed() {
  if (localStorage.getItem(STORE_KEY)) return;
  const c = { id: uid(), name: "Jane Doe", company: "Doe Holdings LLC", email: "jane@example.com",
    phone: "(555) 010-2233", notes: "Referred by M. Rivera.", createdAt: new Date().toISOString() };
  const m = { id: uid(), clientId: c.id, number: suggestMatterNumber(), title: "Doe v. Acme Corp",
    type: "Litigation", status: "Open", openedAt: today(), notes: "Breach of contract." };
  data.clients.push(c);
  data.matters.push(m);
  data.deadlines.push({ id: uid(), matterId: m.id, title: "File answer to complaint",
    due: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), done: false });
  save();
}

// Expose handlers used in inline onclick attributes.
Object.assign(window, { openForm, closeModal, remove, toggleDeadline, goMattersFor });

initTheme();
maybeSeed();
initSync();
render();
