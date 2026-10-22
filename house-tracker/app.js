/* House Build Ledger — UI layer.
 * Payments and settings live in localStorage; maths lives in ledger.js. */
(function () {
  "use strict";

  const L = globalThis.Ledger;
  const PAYMENTS_KEY = "housebuild.payments.v1";
  const SETTINGS_KEY = "housebuild.settings.v1";
  const THEME_KEY = "housebuild.theme";

  const CURRENCIES = [
    ["PKR", "Pakistani rupee"],
    ["INR", "Indian rupee"],
    ["BDT", "Bangladeshi taka"],
    ["LKR", "Sri Lankan rupee"],
    ["NPR", "Nepalese rupee"],
    ["AED", "UAE dirham"],
    ["SAR", "Saudi riyal"],
    ["QAR", "Qatari riyal"],
    ["KWD", "Kuwaiti dinar"],
    ["OMR", "Omani rial"],
    ["BHD", "Bahraini dinar"],
    ["USD", "US dollar"],
    ["CAD", "Canadian dollar"],
    ["GBP", "British pound"],
    ["EUR", "Euro"],
    ["AUD", "Australian dollar"],
    ["MYR", "Malaysian ringgit"],
    ["TRY", "Turkish lira"],
    ["NGN", "Nigerian naira"],
    ["KES", "Kenyan shilling"],
    ["ZAR", "South African rand"],
  ];

  const REGION_CURRENCY = {
    PK: "PKR", IN: "INR", BD: "BDT", LK: "LKR", NP: "NPR", AE: "AED",
    SA: "SAR", QA: "QAR", KW: "KWD", OM: "OMR", BH: "BHD", US: "USD",
    CA: "CAD", GB: "GBP", AU: "AUD", MY: "MYR", TR: "TRY", NG: "NGN",
    KE: "KES", ZA: "ZAR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR",
    NL: "EUR", IE: "EUR",
  };

  const $ = function (id) {
    return document.getElementById(id);
  };

  const els = {
    projectTitle: $("projectTitle"),
    totalSpent: $("totalSpent"),
    totalSub: $("totalSub"),
    budgetRemaining: $("budgetRemaining"),
    budgetMeter: $("budgetMeter"),
    budgetFill: $("budgetFill"),
    budgetSub: $("budgetSub"),
    monthSpent: $("monthSpent"),
    monthSub: $("monthSub"),
    topCategory: $("topCategory"),
    topCategorySub: $("topCategorySub"),
    addBtn: $("addBtn"),
    segmented: document.querySelector(".segmented"),
    breakdownList: $("breakdownList"),
    breakdownEmpty: $("breakdownEmpty"),
    filteredTotal: $("filteredTotal"),
    search: $("searchInput"),
    categoryFilter: $("categoryFilter"),
    methodFilter: $("methodFilter"),
    fromFilter: $("fromFilter"),
    toFilter: $("toFilter"),
    clearFilters: $("clearFilters"),
    list: $("paymentList"),
    empty: $("emptyState"),
    emptyText: $("emptyText"),
    exportCsv: $("exportCsv"),
    backupBtn: $("backupBtn"),
    restoreBtn: $("restoreBtn"),
    restoreFile: $("restoreFile"),
    // payment dialog
    paymentDialog: $("paymentDialog"),
    paymentForm: $("paymentForm"),
    paymentDialogTitle: $("paymentDialogTitle"),
    amount: $("amountInput"),
    amountError: $("amountError"),
    currencyHint: $("currencyHint"),
    date: $("dateInput"),
    method: $("methodInput"),
    payee: $("payeeInput"),
    payeeList: $("payeeList"),
    category: $("categoryInput"),
    reference: $("referenceInput"),
    notes: $("notesInput"),
    deleteInDialog: $("deleteInDialog"),
    // settings dialog
    settingsBtn: $("settingsBtn"),
    settingsDialog: $("settingsDialog"),
    settingsForm: $("settingsForm"),
    projectInput: $("projectInput"),
    budgetInput: $("budgetInput"),
    currencyInput: $("currencyInput"),
    themeToggle: $("themeToggle"),
    toast: $("toast"),
    toastText: $("toastText"),
    toastAction: $("toastAction"),
  };

  // ---------- State ----------
  let payments = loadPayments();
  let settings = loadSettings();
  let group = "category";
  let editingId = null;
  let toastTimer = null;
  let toastUndo = null;
  const filters = { query: "", category: "", method: "", from: "", to: "" };

  // ---------- Persistence ----------
  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  function loadPayments() {
    const raw = readJSON(PAYMENTS_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.map(L.normalizePayment).filter(Boolean);
  }

  function loadSettings() {
    const s = L.normalizeSettings(readJSON(SETTINGS_KEY));
    if (!s.currency) s.currency = guessCurrency();
    return s;
  }

  function guessCurrency() {
    const langs = navigator.languages || [navigator.language || ""];
    for (const lang of langs) {
      const region = String(lang).split("-")[1];
      if (region && REGION_CURRENCY[region.toUpperCase()]) {
        return REGION_CURRENCY[region.toUpperCase()];
      }
    }
    return "PKR";
  }

  function save() {
    try {
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_e) {
      toast("Couldn't save — browser storage may be full or blocked.");
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------- Formatting ----------
  const fmtCache = {};
  function money(n) {
    const hasCents = L.toCents(n) % 100 !== 0;
    const key = settings.currency + (hasCents ? ".2" : ".0");
    if (!fmtCache[key]) {
      try {
        fmtCache[key] = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: settings.currency,
          minimumFractionDigits: hasCents ? 2 : 0,
          maximumFractionDigits: hasCents ? 2 : 0,
        });
      } catch (_e) {
        fmtCache[key] = new Intl.NumberFormat(undefined, {
          maximumFractionDigits: 2,
        });
      }
    }
    return fmtCache[key].format(n);
  }

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  function parseISO(iso) {
    const p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2] || 1);
  }

  function monthLabel(key) {
    return parseISO(key + "-01").toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  function longDate(iso) {
    return parseISO(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ---------- Rendering ----------
  function render() {
    els.projectTitle.textContent = settings.projectName || "My House";
    document.title = (settings.projectName || "House") + " — Build Ledger";
    renderSummary();
    renderBreakdown();
    renderPayments();
  }

  function renderSummary() {
    const spent = L.total(payments);
    els.totalSpent.textContent = money(spent);
    if (payments.length) {
      const sorted = L.sortPayments(payments);
      const first = sorted[sorted.length - 1].date;
      els.totalSub.textContent = plural(payments.length, "payment") +
        " since " + longDate(first);
    } else {
      els.totalSub.textContent = "No payments yet";
    }

    // Budget
    els.budgetSub.textContent = "";
    if (settings.budget > 0) {
      const remaining = Math.round((settings.budget - spent) * 100) / 100;
      const pct = Math.round((spent / settings.budget) * 100);
      els.budgetRemaining.textContent = money(Math.abs(remaining));
      els.budgetRemaining.classList.toggle("is-over", remaining < 0);
      els.budgetMeter.hidden = false;
      els.budgetFill.style.width = Math.min(pct, 100) + "%";
      els.budgetMeter.classList.toggle("is-over", remaining < 0);
      els.budgetMeter.classList.toggle("is-warn", remaining >= 0 && pct >= 85);
      els.budgetSub.textContent = remaining < 0
        ? "Over budget · " + pct + "% of " + money(settings.budget)
        : pct + "% used of " + money(settings.budget);
    } else {
      els.budgetRemaining.textContent = "—";
      els.budgetRemaining.classList.remove("is-over");
      els.budgetMeter.hidden = true;
      const link = el("button", "btn btn-link", "Set a budget");
      link.type = "button";
      link.addEventListener("click", openSettings);
      els.budgetSub.appendChild(link);
    }

    // This month
    const thisMonth = L.monthKey(L.toISODate(new Date()));
    const monthPayments = payments.filter(function (p) {
      return L.monthKey(p.date) === thisMonth;
    });
    els.monthSpent.textContent = money(L.total(monthPayments));
    els.monthSub.textContent = monthPayments.length
      ? plural(monthPayments.length, "payment") + " in " + monthLabel(thisMonth)
      : "Nothing yet in " + monthLabel(thisMonth);

    // Top category
    const top = L.byCategory(payments)[0];
    if (top) {
      els.topCategory.textContent = L.category(top.key).icon + " " + top.label;
      els.topCategorySub.textContent = money(top.total) + " · " +
        Math.round((top.total / spent) * 100) + "% of total";
    } else {
      els.topCategory.textContent = "—";
      els.topCategorySub.textContent = " ";
    }
  }

  function breakdownRows() {
    if (group === "payee") return L.byPayee(payments);
    if (group === "month") return L.byMonth(payments);
    if (group === "method") return L.byMethod(payments);
    return L.byCategory(payments);
  }

  function renderBreakdown() {
    const rows = breakdownRows();
    const spent = L.total(payments);
    const max = rows.reduce(function (m, r) {
      return Math.max(m, r.total);
    }, 0);

    els.breakdownList.innerHTML = "";
    els.breakdownEmpty.hidden = rows.length > 0;

    rows.forEach(function (r) {
      const li = el("li");
      const btn = el("button", "bar-row");
      btn.type = "button";
      btn.title = "Show these payments";

      let label = r.label;
      if (group === "category") label = L.category(r.key).icon + " " + label;
      if (group === "month") label = monthLabel(r.key);

      const top = el("div", "bar-top");
      top.appendChild(el("span", "bar-label", label));
      top.appendChild(el("span", "bar-amount", money(r.total)));

      const track = el("div", "bar-track");
      const fill = el("div", "bar-fill");
      fill.style.width = (max ? (r.total / max) * 100 : 0) + "%";
      track.appendChild(fill);

      const meta = el(
        "div",
        "bar-meta",
        plural(r.count, "payment") + " · " +
          (spent ? Math.round((r.total / spent) * 1000) / 10 : 0) + "%",
      );

      btn.appendChild(top);
      btn.appendChild(track);
      btn.appendChild(meta);
      btn.addEventListener("click", function () {
        drillDown(r);
      });
      li.appendChild(btn);
      els.breakdownList.appendChild(li);
    });
  }

  // Clicking a breakdown bar narrows the payment list to that slice.
  function drillDown(row) {
    resetFilters();
    if (group === "category") filters.category = row.key;
    if (group === "method") filters.method = row.key;
    if (group === "payee") filters.query = row.label;
    if (group === "month") {
      const d = parseISO(row.key + "-01");
      filters.from = row.key + "-01";
      filters.to = L.toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    }
    syncFilterInputs();
    renderPayments();
    document.querySelector(".payments").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function hasFilters() {
    return Object.keys(filters).some(function (k) {
      return filters[k];
    });
  }

  function renderPayments() {
    const visible = L.sortPayments(L.filterPayments(payments, filters));
    const filtered = hasFilters();

    els.clearFilters.hidden = !filtered;
    els.filteredTotal.textContent = payments.length
      ? plural(visible.length, "payment") + " · " + money(L.total(visible))
      : "";

    els.list.innerHTML = "";
    let currentMonth = null;
    let ul = null;
    const monthTotals = {};
    L.byMonth(visible).forEach(function (m) {
      monthTotals[m.key] = m;
    });

    visible.forEach(function (p) {
      const mk = L.monthKey(p.date);
      if (mk !== currentMonth) {
        currentMonth = mk;
        const head = el("div", "month-head");
        head.appendChild(el("span", "month-name", monthLabel(mk)));
        head.appendChild(
          el(
            "span",
            "month-total",
            money(monthTotals[mk].total) + " · " +
              plural(monthTotals[mk].count, "payment"),
          ),
        );
        els.list.appendChild(head);
        ul = el("ul", "payment-list");
        els.list.appendChild(ul);
      }
      ul.appendChild(renderPayment(p));
    });

    els.empty.hidden = visible.length > 0;
    if (!visible.length) {
      els.emptyText.innerHTML = "";
      if (payments.length) {
        els.emptyText.textContent = "No payments match these filters.";
      } else {
        els.emptyText.append(
          "No payments yet. Tap ",
          el("strong", null, "Add payment"),
          " to record your first transfer.",
        );
      }
    }
  }

  function renderPayment(p) {
    const cat = L.category(p.category);
    const d = parseISO(p.date);
    const li = el("li");
    const row = el("button", "payment");
    row.type = "button";
    row.title = "Edit payment";

    const day = el("div", "pay-date");
    day.appendChild(el("span", "pay-day", String(d.getDate())));
    day.appendChild(
      el("span", "pay-dow", d.toLocaleDateString(undefined, { weekday: "short" })),
    );

    const main = el("div", "pay-main");
    main.appendChild(el("div", "pay-payee", p.payee || cat.label));
    const meta = el("div", "pay-meta");
    meta.appendChild(el("span", "chip", cat.icon + " " + cat.label));
    meta.appendChild(el("span", "pay-method", L.method(p.method).label));
    if (p.reference) meta.appendChild(el("span", "pay-ref", "#" + p.reference));
    main.appendChild(meta);
    if (p.notes) main.appendChild(el("div", "pay-notes", p.notes));

    row.appendChild(day);
    row.appendChild(main);
    row.appendChild(el("div", "pay-amount", money(p.amount)));
    row.addEventListener("click", function () {
      openPayment(p.id);
    });
    li.appendChild(row);
    return li;
  }

  // ---------- Filters ----------
  function resetFilters() {
    Object.keys(filters).forEach(function (k) {
      filters[k] = "";
    });
  }

  function syncFilterInputs() {
    els.search.value = filters.query;
    els.categoryFilter.value = filters.category;
    els.methodFilter.value = filters.method;
    els.fromFilter.value = filters.from;
    els.toFilter.value = filters.to;
  }

  function readFilterInputs() {
    filters.query = els.search.value;
    filters.category = els.categoryFilter.value;
    filters.method = els.methodFilter.value;
    filters.from = els.fromFilter.value;
    filters.to = els.toFilter.value;
    renderPayments();
  }

  // ---------- Payment dialog ----------
  function fillSelect(select, items, labelFn) {
    items.forEach(function (item) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = labelFn(item);
      select.appendChild(opt);
    });
  }

  function refreshPayeeSuggestions() {
    els.payeeList.innerHTML = "";
    L.byPayee(payments).forEach(function (r) {
      if (r.key === "(unnamed)") return;
      const opt = document.createElement("option");
      opt.value = r.label;
      els.payeeList.appendChild(opt);
    });
  }

  function openPayment(id) {
    const p = id
      ? payments.find(function (x) {
        return x.id === id;
      })
      : null;
    editingId = p ? p.id : null;
    refreshPayeeSuggestions();

    // New payments reuse the last-used method and category for quick entry.
    const last = L.sortPayments(payments)[0];
    els.paymentDialogTitle.textContent = p ? "Edit payment" : "Add payment";
    els.amount.value = p ? String(p.amount) : "";
    els.date.value = p ? p.date : L.toISODate(new Date());
    els.method.value = p ? p.method : (last ? last.method : "bank");
    els.payee.value = p ? p.payee : "";
    els.category.value = p ? p.category : (last ? last.category : "land");
    els.reference.value = p ? p.reference : "";
    els.notes.value = p ? p.notes : "";
    els.currencyHint.textContent = "(" + settings.currency + ")";
    els.amountError.hidden = true;
    els.amount.removeAttribute("aria-invalid");
    els.deleteInDialog.hidden = !p;

    els.paymentDialog.showModal();
    els.amount.focus();
  }

  function savePaymentFromForm() {
    const amount = L.parseAmount(els.amount.value);
    if (!(amount > 0)) {
      els.amountError.hidden = false;
      els.amount.setAttribute("aria-invalid", "true");
      els.amount.focus();
      return;
    }
    const date = L.isISODate(els.date.value)
      ? els.date.value
      : L.toISODate(new Date());
    const data = {
      date: date,
      amount: amount,
      payee: els.payee.value.trim(),
      category: els.category.value,
      method: els.method.value,
      reference: els.reference.value.trim(),
      notes: els.notes.value.trim(),
    };

    if (editingId) {
      payments = payments.map(function (p) {
        return p.id === editingId ? Object.assign({}, p, data) : p;
      });
      toast("Payment updated");
    } else {
      payments.push(
        Object.assign({ id: uid(), created: Date.now() }, data),
      );
      toast("Added " + money(amount) + (data.payee ? " to " + data.payee : ""));
    }
    save();
    els.paymentDialog.close();
    render();
  }

  function deletePayment(id) {
    const index = payments.findIndex(function (p) {
      return p.id === id;
    });
    if (index === -1) return;
    const removed = payments[index];
    payments.splice(index, 1);
    save();
    render();
    toast("Deleted " + money(removed.amount) + " payment", function () {
      payments.push(removed);
      save();
      render();
      toast("Payment restored");
    });
  }

  // ---------- Settings dialog ----------
  function openSettings() {
    els.projectInput.value = settings.projectName;
    els.budgetInput.value = settings.budget ? String(settings.budget) : "";
    els.currencyInput.value = settings.currency;
    els.settingsDialog.showModal();
    els.projectInput.focus();
  }

  function saveSettingsFromForm() {
    const budgetText = els.budgetInput.value.trim();
    const budget = budgetText ? L.parseAmount(budgetText) : 0;
    if (budgetText && !(budget > 0)) {
      toast("Budget must be a number greater than zero.");
      els.budgetInput.focus();
      return;
    }
    settings = {
      projectName: els.projectInput.value.trim(),
      budget: budget || 0,
      currency: els.currencyInput.value,
    };
    save();
    els.settingsDialog.close();
    render();
    toast("Settings saved");
  }

  // ---------- Import / export ----------
  function download(filename, text, type) {
    const blob = new Blob([text], { type: type });
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function fileStem() {
    const name = (settings.projectName || "house").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "house";
    return name + "-payments-" + L.toISODate(new Date());
  }

  function exportCsv() {
    if (!payments.length) {
      toast("Nothing to export yet.");
      return;
    }
    // Leading BOM so Excel opens UTF-8 (₹, ﷼, names) correctly.
    download(fileStem() + ".csv", "﻿" + L.toCSV(payments), "text/csv");
  }

  function backup() {
    download(
      fileStem() + ".json",
      L.makeBackup(payments, settings),
      "application/json",
    );
    toast("Backup downloaded");
  }

  function restore(file) {
    const reader = new FileReader();
    reader.onload = function () {
      let result;
      try {
        result = L.parseBackup(String(reader.result));
      } catch (err) {
        toast(err.message);
        return;
      }
      const msg = "Replace your " + plural(payments.length, "payment") +
        " with " + plural(result.payments.length, "payment") +
        " from this backup?" +
        (result.skipped ? " (" + result.skipped + " invalid rows skipped)" : "");
      if (payments.length && !confirm(msg)) return;
      const before = { payments: payments, settings: settings };
      payments = result.payments;
      if (result.settings) {
        settings = Object.assign({}, result.settings, {
          currency: result.settings.currency || settings.currency,
        });
      }
      save();
      render();
      toast("Restored " + plural(payments.length, "payment"), function () {
        payments = before.payments;
        settings = before.settings;
        save();
        render();
        toast("Restore undone");
      });
    };
    reader.readAsText(file);
  }

  // ---------- Theme ----------
  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (_e) {
      saved = null;
    }
    if (!saved) {
      saved = globalThis.matchMedia &&
          globalThis.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", saved);
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_e) {
      // Theme just won't be remembered; nothing else to do.
    }
  }

  // ---------- Toast ----------
  function toast(msg, undo) {
    els.toastText.textContent = msg;
    toastUndo = undo || null;
    els.toastAction.hidden = !undo;
    els.toast.hidden = false;
    void els.toast.offsetWidth; // restart the transition
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove("show");
      toastUndo = null;
    }, undo ? 6000 : 2600);
  }

  // ---------- Events ----------
  els.addBtn.addEventListener("click", function () {
    openPayment(null);
  });

  els.paymentForm.addEventListener("submit", function (e) {
    e.preventDefault();
    savePaymentFromForm();
  });

  els.amount.addEventListener("input", function () {
    els.amountError.hidden = true;
    els.amount.removeAttribute("aria-invalid");
  });

  els.deleteInDialog.addEventListener("click", function () {
    const id = editingId;
    els.paymentDialog.close();
    deletePayment(id);
  });

  els.settingsBtn.addEventListener("click", openSettings);
  els.settingsForm.addEventListener("submit", function (e) {
    e.preventDefault();
    saveSettingsFromForm();
  });

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.closest("dialog").close();
    });
  });

  document.querySelectorAll("[data-open-settings]").forEach(function (btn) {
    btn.addEventListener("click", openSettings);
  });

  // Close a dialog when its backdrop is clicked.
  [els.paymentDialog, els.settingsDialog].forEach(function (dlg) {
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) dlg.close();
    });
  });

  els.segmented.addEventListener("click", function (e) {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    group = btn.dataset.group;
    els.segmented.querySelectorAll(".seg-btn").forEach(function (b) {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderBreakdown();
  });

  [els.categoryFilter, els.methodFilter, els.fromFilter, els.toFilter]
    .forEach(function (input) {
      input.addEventListener("change", readFilterInputs);
    });
  els.search.addEventListener("input", readFilterInputs);
  els.clearFilters.addEventListener("click", function () {
    resetFilters();
    syncFilterInputs();
    renderPayments();
  });

  els.exportCsv.addEventListener("click", exportCsv);
  els.backupBtn.addEventListener("click", backup);
  els.restoreBtn.addEventListener("click", function () {
    els.restoreFile.click();
  });
  els.restoreFile.addEventListener("change", function () {
    const file = els.restoreFile.files[0];
    els.restoreFile.value = "";
    if (file) restore(file);
  });

  els.toastAction.addEventListener("click", function () {
    const fn = toastUndo;
    toastUndo = null;
    els.toast.classList.remove("show");
    if (fn) fn();
  });

  els.themeToggle.addEventListener("click", toggleTheme);

  // Keep tabs in sync if the ledger is open in two windows.
  globalThis.addEventListener("storage", function (e) {
    if (e.key === PAYMENTS_KEY || e.key === SETTINGS_KEY) {
      payments = loadPayments();
      settings = loadSettings();
      render();
    }
  });

  // ---------- Boot ----------
  fillSelect(els.category, L.CATEGORIES, function (c) {
    return c.icon + " " + c.label;
  });
  fillSelect(els.categoryFilter, L.CATEGORIES, function (c) {
    return c.icon + " " + c.label;
  });
  fillSelect(els.method, L.METHODS, function (m) {
    return m.label;
  });
  fillSelect(els.methodFilter, L.METHODS, function (m) {
    return m.label;
  });
  CURRENCIES.forEach(function (c) {
    const opt = document.createElement("option");
    opt.value = c[0];
    opt.textContent = c[0] + " — " + c[1];
    els.currencyInput.appendChild(opt);
  });
  if (!CURRENCIES.some(function (c) {
    return c[0] === settings.currency;
  })) {
    const opt = document.createElement("option");
    opt.value = settings.currency;
    opt.textContent = settings.currency;
    els.currencyInput.appendChild(opt);
  }

  initTheme();
  render();
})();
