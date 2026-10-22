/* House Build Ledger — pure data helpers (no DOM).
 * Loaded as a classic <script> in the browser and imported by the Deno tests;
 * either way it exposes `globalThis.Ledger`. */
(function (root) {
  "use strict";

  const CATEGORIES = [
    { id: "land", label: "Land & Registration", icon: "📜" },
    { id: "design", label: "Design & Approvals", icon: "📐" },
    { id: "foundation", label: "Excavation & Foundation", icon: "⛏️" },
    { id: "structure", label: "Structure & Masonry", icon: "🧱" },
    { id: "steel", label: "Steel & Iron", icon: "🔩" },
    { id: "cement", label: "Cement, Sand & Aggregate", icon: "🪣" },
    { id: "labour", label: "Labour & Contractor", icon: "👷" },
    { id: "electrical", label: "Electrical", icon: "💡" },
    { id: "plumbing", label: "Plumbing & Sanitary", icon: "🚿" },
    { id: "woodwork", label: "Doors, Windows & Woodwork", icon: "🚪" },
    { id: "flooring", label: "Tiles & Flooring", icon: "🔲" },
    { id: "finishing", label: "Paint & Finishing", icon: "🎨" },
    { id: "fixtures", label: "Fixtures & Fittings", icon: "🛁" },
    { id: "utilities", label: "Utilities & Connections", icon: "🔌" },
    { id: "transport", label: "Transport & Equipment", icon: "🚚" },
    { id: "other", label: "Other", icon: "📦" },
  ];

  const METHODS = [
    { id: "bank", label: "Bank transfer" },
    { id: "online", label: "Online / mobile wallet" },
    { id: "cheque", label: "Cheque" },
    { id: "cash", label: "Cash" },
    { id: "card", label: "Card" },
    { id: "other", label: "Other" },
  ];

  function findById(list, id) {
    return list.find(function (x) {
      return x.id === id;
    }) || null;
  }

  function category(id) {
    return findById(CATEGORIES, id) || findById(CATEGORIES, "other");
  }

  function method(id) {
    return findById(METHODS, id) || { id: id || "", label: id || "—" };
  }

  // ---------- Money ----------
  // Sums are done in integer cents so 0.1 + 0.2 style drift never shows up.
  function toCents(n) {
    return Math.round(Number(n) * 100);
  }

  function total(payments) {
    let cents = 0;
    payments.forEach(function (p) {
      cents += toCents(p.amount);
    });
    return cents / 100;
  }

  // Accepts "150000", "1,50,000", "150 000.50", "₨ 2,000". Returns NaN if not
  // a positive number.
  function parseAmount(input) {
    const text = String(input == null ? "" : input);
    if (text.indexOf("-") !== -1) return NaN;
    const cleaned = text
      .replace(/[\s,']/g, "")
      .replace(/^[^\d.]+/, "");
    if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
    const n = Math.round(parseFloat(cleaned) * 100) / 100;
    return n > 0 ? n : NaN;
  }

  // ---------- Dates ----------
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toISODate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" +
      pad(d.getDate());
  }

  function isISODate(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const parts = s.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.getMonth() === parts[1] - 1 && d.getDate() === parts[2];
  }

  function monthKey(isoDate) {
    return String(isoDate).slice(0, 7);
  }

  // ---------- Querying ----------
  function sortPayments(payments) {
    // Newest payment date first; same-day entries newest-added first.
    return payments.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.created || 0) - (a.created || 0);
    });
  }

  function filterPayments(payments, f) {
    f = f || {};
    const q = (f.query || "").trim().toLowerCase();
    return payments.filter(function (p) {
      if (f.category && p.category !== f.category) return false;
      if (f.method && p.method !== f.method) return false;
      if (f.from && p.date < f.from) return false;
      if (f.to && p.date > f.to) return false;
      if (q) {
        const hay = [
          p.payee,
          p.reference,
          p.notes,
          category(p.category).label,
          method(p.method).label,
          String(p.amount),
        ].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  // Generic group-by returning [{ key, label, total, count }].
  function groupTotals(payments, keyFn, labelFn) {
    const groups = new Map();
    payments.forEach(function (p) {
      const key = keyFn(p);
      let g = groups.get(key);
      if (!g) {
        g = { key: key, label: labelFn ? labelFn(p) : key, cents: 0, count: 0 };
        groups.set(key, g);
      }
      g.cents += toCents(p.amount);
      g.count += 1;
    });
    return Array.from(groups.values()).map(function (g) {
      return { key: g.key, label: g.label, total: g.cents / 100, count: g.count };
    });
  }

  function byTotalDesc(a, b) {
    return b.total - a.total || String(a.label).localeCompare(String(b.label));
  }

  function byCategory(payments) {
    return groupTotals(payments, function (p) {
      return category(p.category).id;
    }, function (p) {
      return category(p.category).label;
    }).sort(byTotalDesc);
  }

  function byPayee(payments) {
    // Case/space-insensitive so "Ali Traders" and "ali traders " merge.
    return groupTotals(payments, function (p) {
      return (p.payee || "").trim().toLowerCase() || "(unnamed)";
    }, function (p) {
      return (p.payee || "").trim() || "(unnamed)";
    }).sort(byTotalDesc);
  }

  function byMonth(payments) {
    return groupTotals(payments, function (p) {
      return monthKey(p.date);
    }).sort(function (a, b) {
      return a.key < b.key ? 1 : a.key > b.key ? -1 : 0;
    });
  }

  function byMethod(payments) {
    return groupTotals(payments, function (p) {
      return method(p.method).id;
    }, function (p) {
      return method(p.method).label;
    }).sort(byTotalDesc);
  }

  // ---------- Import / export ----------
  function csvCell(value) {
    const s = value == null ? "" : String(value);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(payments) {
    const rows = [[
      "Date",
      "Paid to",
      "Category",
      "Method",
      "Reference",
      "Amount",
      "Notes",
    ]];
    sortPayments(payments).forEach(function (p) {
      rows.push([
        p.date,
        p.payee,
        category(p.category).label,
        method(p.method).label,
        p.reference || "",
        (toCents(p.amount) / 100).toFixed(2),
        p.notes || "",
      ]);
    });
    return rows.map(function (r) {
      return r.map(csvCell).join(",");
    }).join("\r\n") + "\r\n";
  }

  function str(v, max) {
    return typeof v === "string" ? v.trim().slice(0, max) : "";
  }

  // Validates one record from a backup file. Returns a clean payment or null.
  function normalizePayment(raw) {
    if (!raw || typeof raw !== "object") return null;
    const amount = typeof raw.amount === "number"
      ? Math.round(raw.amount * 100) / 100
      : parseAmount(raw.amount);
    if (!(amount > 0) || !isISODate(raw.date)) return null;
    // Ids double as storage keys, so anything outside a safe charset is
    // replaced with a fresh one.
    const id = str(raw.id, 40);
    return {
      id: /^[A-Za-z0-9_~:@+-][A-Za-z0-9_.~:@+-]*$/.test(id)
        ? id
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date: raw.date,
      amount: amount,
      payee: str(raw.payee, 120),
      category: category(raw.category).id,
      method: findById(METHODS, raw.method) ? raw.method : "other",
      reference: str(raw.reference, 80),
      notes: str(raw.notes, 500),
      created: typeof raw.created === "number" ? raw.created : Date.now(),
    };
  }

  function normalizeSettings(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    const budget = typeof raw.budget === "number"
      ? raw.budget
      : parseAmount(raw.budget);
    return {
      projectName: str(raw.projectName, 80),
      budget: budget > 0 ? budget : 0,
      currency: /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : "",
    };
  }

  function makeBackup(payments, settings) {
    return JSON.stringify(
      {
        app: "house-build-ledger",
        version: 1,
        exported: new Date().toISOString(),
        settings: settings,
        payments: payments,
      },
      null,
      2,
    );
  }

  // Throws an Error with a readable message if the file isn't a valid backup.
  function parseBackup(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      throw new Error("That file isn't valid JSON.");
    }
    const list = Array.isArray(data) ? data : data && data.payments;
    if (!Array.isArray(list)) {
      throw new Error("No payments found in that file.");
    }
    const payments = [];
    let skipped = 0;
    list.forEach(function (raw) {
      const p = normalizePayment(raw);
      if (p) payments.push(p);
      else skipped += 1;
    });
    return {
      payments: payments,
      settings: Array.isArray(data) ? null : normalizeSettings(data.settings),
      skipped: skipped,
    };
  }

  root.Ledger = {
    CATEGORIES: CATEGORIES,
    METHODS: METHODS,
    category: category,
    method: method,
    toCents: toCents,
    total: total,
    parseAmount: parseAmount,
    toISODate: toISODate,
    isISODate: isISODate,
    monthKey: monthKey,
    sortPayments: sortPayments,
    filterPayments: filterPayments,
    byCategory: byCategory,
    byPayee: byPayee,
    byMonth: byMonth,
    byMethod: byMethod,
    toCSV: toCSV,
    normalizePayment: normalizePayment,
    normalizeSettings: normalizeSettings,
    makeBackup: makeBackup,
    parseBackup: parseBackup,
  };
})(globalThis);
