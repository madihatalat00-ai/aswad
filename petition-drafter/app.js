/* Petition Drafter — draft, preview, and export petitions.
 * State lives in localStorage; the preview renders as a formal document
 * that can be printed / saved to PDF, copied, or downloaded as text. */
(function () {
  "use strict";

  var STORAGE_KEY = "petitiondrafter.drafts.v1";
  var ACTIVE_KEY = "petitiondrafter.active";
  var THEME_KEY = "petitiondrafter.theme";

  // ---------- Templates ----------
  var TEMPLATES = {
    court: {
      label: "Civil / General Court Petition",
      hint: "A general petition or application before a court of law.",
      provisionDefault: "Section ___ of the ___ Act",
      heading: "PETITION",
      applicantWord: "Petitioner",
      forum: "court",
    },
    writ: {
      label: "Writ Petition",
      hint: "A constitutional petition invoking the writ jurisdiction of a superior court.",
      provisionDefault: "Article ___ of the Constitution",
      heading: "WRIT PETITION",
      applicantWord: "Petitioner",
      forum: "court",
    },
    bail: {
      label: "Bail Application",
      hint: "An application seeking bail for the applicant/accused.",
      provisionDefault: "Section ___ of the Code of Criminal Procedure",
      heading: "APPLICATION FOR GRANT OF BAIL",
      applicantWord: "Applicant",
      forum: "court",
    },
    public: {
      label: "Public Petition",
      hint: "A petition from citizens to a public authority, with space for signatures.",
      provisionDefault: "",
      heading: "PUBLIC PETITION",
      applicantWord: "Petitioner",
      forum: "public",
    },
  };

  // ---------- DOM refs ----------
  var els = {
    draftSelect: document.getElementById("draftSelect"),
    newDraft: document.getElementById("newDraft"),
    deleteDraft: document.getElementById("deleteDraft"),
    themeToggle: document.getElementById("themeToggle"),
    editor: document.getElementById("editor"),
    type: document.getElementById("typeInput"),
    typeHint: document.getElementById("typeHint"),
    forumCourt: document.getElementById("forumCourt"),
    forumPublic: document.getElementById("forumPublic"),
    partiesCard: document.getElementById("partiesCard"),
    court: document.getElementById("courtInput"),
    location: document.getElementById("locationInput"),
    caseNo: document.getElementById("caseNoInput"),
    provision: document.getElementById("provisionInput"),
    authority: document.getElementById("authorityInput"),
    subject: document.getElementById("subjectInput"),
    petitionerList: document.getElementById("petitionerList"),
    respondentList: document.getElementById("respondentList"),
    factsList: document.getElementById("factsList"),
    groundsList: document.getElementById("groundsList"),
    prayersList: document.getElementById("prayersList"),
    place: document.getElementById("placeInput"),
    date: document.getElementById("dateInput"),
    counsel: document.getElementById("counselInput"),
    verification: document.getElementById("verificationInput"),
    verificationField: document.getElementById("verificationField"),
    deponent: document.getElementById("deponentInput"),
    deponentField: document.getElementById("deponentField"),
    counselField: document.getElementById("counselField"),
    signatoryRowsField: document.getElementById("signatoryRowsField"),
    signatoryRows: document.getElementById("signatoryRowsInput"),
    preview: document.getElementById("preview"),
    saveStatus: document.getElementById("saveStatus"),
    copyBtn: document.getElementById("copyBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    printBtn: document.getElementById("printBtn"),
    toast: document.getElementById("toast"),
  };

  var LISTS = {
    petitioners: { el: els.petitionerList, party: true },
    respondents: { el: els.respondentList, party: true },
    facts: { el: els.factsList, placeholder: "State a fact of the case…" },
    grounds: { el: els.groundsList, placeholder: "State a ground / reason…" },
    prayers: { el: els.prayersList, placeholder: "State a relief sought…" },
  };

  // ---------- State ----------
  var drafts = loadDrafts();
  var activeId = null;
  var saveTimer = null;
  var toastTimer = null;

  // ---------- Persistence ----------
  function loadDrafts() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
      localStorage.setItem(ACTIVE_KEY, activeId || "");
      els.saveStatus.textContent = "Saved";
    } catch (e) {
      els.saveStatus.textContent = "";
      toast("Couldn't save — storage may be full.");
    }
  }

  function scheduleSave() {
    els.saveStatus.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var d = active();
      if (d) d.updatedAt = Date.now();
      persist();
      renderDraftSelect();
    }, 400);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function blankDraft(type) {
    return {
      id: uid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: {
        type: type || "court",
        court: "",
        location: "",
        caseNo: "",
        provision: TEMPLATES[type || "court"].provisionDefault,
        authority: "",
        subject: "",
        petitioners: [{ name: "", detail: "" }],
        respondents: [{ name: "", detail: "" }],
        facts: [""],
        grounds: [""],
        prayers: [""],
        place: "",
        date: "",
        counsel: "",
        verification: true,
        deponent: "",
        signatoryRows: 10,
      },
    };
  }

  function active() {
    for (var i = 0; i < drafts.length; i++) {
      if (drafts[i].id === activeId) return drafts[i];
    }
    return null;
  }

  function draftName(d) {
    var s = (d.data.subject || "").trim();
    if (s) return s.length > 40 ? s.slice(0, 40) + "…" : s;
    return "Untitled " + (TEMPLATES[d.data.type] || TEMPLATES.court).label.toLowerCase();
  }

  // ---------- Draft management ----------
  function renderDraftSelect() {
    var sorted = drafts.slice().sort(function (a, b) {
      return b.updatedAt - a.updatedAt;
    });
    els.draftSelect.innerHTML = "";
    sorted.forEach(function (d) {
      var opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = draftName(d);
      if (d.id === activeId) opt.selected = true;
      els.draftSelect.appendChild(opt);
    });
  }

  function openDraft(id) {
    activeId = id;
    localStorage.setItem(ACTIVE_KEY, activeId || "");
    renderDraftSelect();
    populateEditor();
    renderPreview();
  }

  function createDraft() {
    var d = blankDraft(els.type.value);
    drafts.push(d);
    persist();
    openDraft(d.id);
    toast("New draft started.");
  }

  function deleteDraft() {
    var d = active();
    if (!d) return;
    if (!confirm('Delete draft "' + draftName(d) + '"? This cannot be undone.')) return;
    drafts = drafts.filter(function (x) {
      return x.id !== d.id;
    });
    if (!drafts.length) drafts.push(blankDraft("court"));
    persist();
    openDraft(drafts[0].id);
    toast("Draft deleted.");
  }

  // ---------- Editor <-> state ----------
  function populateEditor() {
    var d = active().data;
    els.type.value = d.type;
    els.court.value = d.court;
    els.location.value = d.location;
    els.caseNo.value = d.caseNo;
    els.provision.value = d.provision;
    els.authority.value = d.authority;
    els.subject.value = d.subject;
    els.place.value = d.place;
    els.date.value = d.date;
    els.counsel.value = d.counsel;
    els.verification.checked = d.verification;
    els.deponent.value = d.deponent;
    els.signatoryRows.value = d.signatoryRows;
    Object.keys(LISTS).forEach(renderList);
    applyTypeToEditor();
  }

  function applyTypeToEditor() {
    var d = active().data;
    var tpl = TEMPLATES[d.type];
    els.typeHint.textContent = tpl.hint;
    var isPublic = tpl.forum === "public";
    els.forumCourt.hidden = isPublic;
    els.forumPublic.hidden = !isPublic;
    els.partiesCard.hidden = isPublic;
    els.counselField.hidden = isPublic;
    els.verificationField.hidden = isPublic;
    els.deponentField.hidden = isPublic || !d.verification;
    els.signatoryRowsField.hidden = !isPublic;
  }

  function renderList(key) {
    var cfg = LISTS[key];
    var items = active().data[key];
    cfg.el.innerHTML = "";
    items.forEach(function (item, i) {
      var row = document.createElement("div");
      row.className = "item-row";

      if (cfg.party) {
        var wrap = document.createElement("div");
        wrap.className = "party-fields";
        var name = document.createElement("input");
        name.type = "text";
        name.placeholder = "Full name";
        name.value = item.name;
        name.addEventListener("input", function () {
          item.name = name.value;
          onEdit();
        });
        var detail = document.createElement("input");
        detail.type = "text";
        detail.placeholder = "Description / address (e.g. son of ___, resident of ___)";
        detail.value = item.detail;
        detail.addEventListener("input", function () {
          item.detail = detail.value;
          onEdit();
        });
        wrap.appendChild(name);
        wrap.appendChild(detail);
        row.appendChild(numBadge(i + 1 + "."));
        row.appendChild(wrap);
      } else {
        var ta = document.createElement("textarea");
        ta.rows = 2;
        ta.placeholder = cfg.placeholder;
        ta.value = item;
        ta.addEventListener("input", function () {
          active().data[key][i] = ta.value;
          onEdit();
        });
        row.appendChild(numBadge(itemLabel(key, i)));
        row.appendChild(ta);
      }

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn-remove";
      remove.title = "Remove";
      remove.textContent = "✕";
      remove.addEventListener("click", function () {
        items.splice(i, 1);
        if (!items.length) items.push(cfg.party ? { name: "", detail: "" } : "");
        renderList(key);
        onEdit();
      });
      row.appendChild(remove);
      cfg.el.appendChild(row);
    });
  }

  function numBadge(text) {
    var span = document.createElement("span");
    span.className = "item-num";
    span.textContent = text;
    return span;
  }

  function itemLabel(key, i) {
    if (key === "grounds") return letter(i) + ".";
    if (key === "prayers") return "(" + roman(i + 1) + ")";
    return i + 1 + ".";
  }

  function letter(i) {
    var s = "";
    i += 1;
    while (i > 0) {
      var rem = (i - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  function roman(n) {
    var table = [
      [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"],
      [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"],
      [5, "v"], [4, "iv"], [1, "i"],
    ];
    var out = "";
    table.forEach(function (pair) {
      while (n >= pair[0]) {
        out += pair[1];
        n -= pair[0];
      }
    });
    return out;
  }

  function onEdit() {
    scheduleSave();
    renderPreview();
  }

  function bindStaticFields() {
    var map = [
      ["court", els.court], ["location", els.location], ["caseNo", els.caseNo],
      ["provision", els.provision], ["authority", els.authority],
      ["subject", els.subject], ["place", els.place], ["date", els.date],
      ["counsel", els.counsel], ["deponent", els.deponent],
    ];
    map.forEach(function (pair) {
      pair[1].addEventListener("input", function () {
        active().data[pair[0]] = pair[1].value;
        onEdit();
      });
    });

    els.verification.addEventListener("change", function () {
      active().data.verification = els.verification.checked;
      applyTypeToEditor();
      onEdit();
    });

    els.signatoryRows.addEventListener("input", function () {
      var n = parseInt(els.signatoryRows.value, 10);
      active().data.signatoryRows = isNaN(n) ? 0 : Math.max(0, Math.min(50, n));
      onEdit();
    });

    els.type.addEventListener("change", function () {
      var d = active().data;
      var prev = TEMPLATES[d.type];
      d.type = els.type.value;
      // Swap in the new template's default provision unless the user wrote their own.
      var untouched = !d.provision.trim() || d.provision === prev.provisionDefault;
      if (untouched) {
        d.provision = TEMPLATES[d.type].provisionDefault;
        els.provision.value = d.provision;
      }
      applyTypeToEditor();
      onEdit();
    });
  }

  // ---------- Preview (HTML) ----------
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escML(s) {
    // escape + preserve line breaks (for multi-line fields)
    return esc(s).replace(/\n/g, "<br>");
  }

  function blank(s, fallback) {
    var t = (s || "").trim();
    return t ? esc(t) : '<span class="placeholder">' + (fallback || "______") + "</span>";
  }

  function nonEmpty(arr) {
    return arr.filter(function (x) {
      return (typeof x === "string" ? x : x.name + x.detail).trim() !== "";
    });
  }

  function isDraftEmpty(d) {
    return (
      !d.court.trim() && !d.authority.trim() && !d.subject.trim() &&
      !nonEmpty(d.petitioners).length && !nonEmpty(d.respondents).length &&
      !nonEmpty(d.facts).length && !nonEmpty(d.grounds).length &&
      !nonEmpty(d.prayers).length
    );
  }

  function renderPreview() {
    var d = active().data;
    if (isDraftEmpty(d)) {
      els.preview.innerHTML =
        '<p class="empty-doc">Start filling in the form — your petition will take shape here.</p>';
      return;
    }
    var tpl = TEMPLATES[d.type];
    els.preview.innerHTML =
      tpl.forum === "public" ? publicDocHtml(d, tpl) : courtDocHtml(d, tpl);
  }

  function partyBlockHtml(parties, role) {
    var list = nonEmpty(parties);
    var html = '<div class="party-block">';
    if (!list.length) {
      html += '<span class="placeholder">______</span>';
    } else if (list.length === 1) {
      html += "<div><strong>" + blank(list[0].name) + "</strong>" +
        (list[0].detail.trim() ? ", " + esc(list[0].detail.trim()) : "") + "</div>";
    } else {
      html += "<ol>";
      list.forEach(function (p) {
        html += "<li><strong>" + blank(p.name) + "</strong>" +
          (p.detail.trim() ? ", " + esc(p.detail.trim()) : "") + "</li>";
      });
      html += "</ol>";
    }
    html += '<div class="party-role">… ' + role + (list.length > 1 ? "s" : "") + "</div></div>";
    return html;
  }

  function courtDocHtml(d, tpl) {
    var h = "";
    h += '<div class="doc-center doc-caption">In the ' + blank(d.court, "[Court name]");
    if (d.location.trim()) h += " at " + esc(d.location.trim());
    h += "</div>";
    h += '<div class="doc-center doc-caseno">' +
      (d.caseNo.trim() ? esc(d.caseNo.trim()) : '<span class="placeholder">___ No. ___ of 20___</span>') +
      "</div>";

    h += "<p><strong>In the matter of:</strong></p>";
    h += partyBlockHtml(d.petitioners, tpl.applicantWord);
    h += '<div class="doc-center doc-versus">VERSUS</div>';
    h += partyBlockHtml(d.respondents, "Respondent");

    h += "<h3>" + esc(tpl.heading) +
      (d.provision.trim() ? " under " + esc(d.provision.trim()) : "") + "</h3>";
    if (d.subject.trim()) {
      h += '<p class="doc-center"><strong>For:</strong> ' + esc(d.subject.trim()) + "</p>";
    }

    h += "<p><strong>Most respectfully sheweth:</strong></p>";
    var facts = nonEmpty(d.facts);
    if (facts.length) {
      h += "<ol>";
      facts.forEach(function (f) {
        h += "<li>" + escML(f.trim()) + "</li>";
      });
      h += "</ol>";
    }

    var grounds = nonEmpty(d.grounds);
    if (grounds.length) {
      h += "<h3>Grounds</h3><ol type=\"A\">";
      grounds.forEach(function (g) {
        h += "<li>" + escML(g.trim()) + "</li>";
      });
      h += "</ol>";
    }

    h += "<h3>Prayer</h3>";
    h += "<p>In view of the foregoing facts and circumstances, it is most respectfully " +
      "prayed that this Hon'ble Court may graciously be pleased to:</p>";
    var prayers = nonEmpty(d.prayers);
    if (prayers.length) {
      h += "<ol type=\"i\">";
      prayers.forEach(function (p) {
        h += "<li>" + escML(p.trim()) + "</li>";
      });
      h += "</ol>";
    }
    h += "<p>and to pass any other order that this Hon'ble Court may deem just and " +
      "proper in the circumstances of the case.</p>";

    h += '<div class="doc-sign"><div>' +
      "<div>Place: " + blank(d.place) + "</div>" +
      "<div>Date: " + blank(d.date) + "</div></div>" +
      '<div class="sign-block"><span class="sign-line">' +
      blank(d.counsel, "&nbsp;") + "</span><div>" +
      (d.counsel.trim() ? "Counsel for the " + tpl.applicantWord + "(s)" : tpl.applicantWord + "(s) / Counsel") +
      "</div></div></div>";

    if (d.verification) {
      h += "<h3>Verification</h3>";
      h += "<p>Verified at " + blank(d.place) + " on " + blank(d.date) +
        " that the contents of the above petition are true and correct to the best of " +
        "my knowledge and belief and that nothing material has been concealed therefrom.</p>";
      h += '<div class="doc-sign"><div></div><div class="sign-block">' +
        '<span class="sign-line">' + blank(d.deponent, "&nbsp;") + "</span>" +
        "<div>Deponent</div></div></div>";
    }
    return h;
  }

  function publicDocHtml(d, tpl) {
    var h = "";
    h += "<p>To,<br>" + (d.authority.trim() ? escML(d.authority.trim()) : '<span class="placeholder">[Authority / addressee]</span>') + "</p>";
    h += "<h3>Public petition" + (d.subject.trim() ? ": " + esc(d.subject.trim()) : "") + "</h3>";
    h += "<p>Respected Sir/Madam,</p>";
    h += "<p>We, the undersigned, most respectfully submit as follows:</p>";

    var facts = nonEmpty(d.facts);
    if (facts.length) {
      h += "<ol>";
      facts.forEach(function (f) {
        h += "<li>" + escML(f.trim()) + "</li>";
      });
      h += "</ol>";
    }

    var grounds = nonEmpty(d.grounds);
    if (grounds.length) {
      h += "<h3>Reasons</h3><ol type=\"A\">";
      grounds.forEach(function (g) {
        h += "<li>" + escML(g.trim()) + "</li>";
      });
      h += "</ol>";
    }

    h += "<h3>Request</h3>";
    h += "<p>We therefore earnestly request that you be pleased to:</p>";
    var prayers = nonEmpty(d.prayers);
    if (prayers.length) {
      h += "<ol type=\"i\">";
      prayers.forEach(function (p) {
        h += "<li>" + escML(p.trim()) + "</li>";
      });
      h += "</ol>";
    }
    h += "<p>and we shall be grateful.</p>";

    h += "<div>Place: " + blank(d.place) + "<br>Date: " + blank(d.date) + "</div>";

    var rows = d.signatoryRows || 0;
    if (rows > 0) {
      h += "<h3>Signatories</h3>";
      h += '<table class="signatories"><thead><tr><th style="width:8%">#</th>' +
        '<th style="width:42%">Name</th><th style="width:30%">Address / CNIC</th>' +
        '<th style="width:20%">Signature</th></tr></thead><tbody>';
      for (var i = 1; i <= rows; i++) {
        h += "<tr><td>" + i + "</td><td></td><td></td><td></td></tr>";
      }
      h += "</tbody></table>";
    }
    return h;
  }

  // ---------- Plain-text export ----------
  function center(text, width) {
    var pad = Math.max(0, Math.floor((width - text.length) / 2));
    return new Array(pad + 1).join(" ") + text;
  }

  function wrap(text, width, indent) {
    var words = text.split(/\s+/);
    var lines = [];
    var line = "";
    words.forEach(function (w) {
      if ((line + " " + w).trim().length > width) {
        lines.push(line);
        line = indent + w;
      } else {
        line = line ? line + " " + w : w;
      }
    });
    if (line.trim()) lines.push(line);
    return lines;
  }

  function plainText() {
    var d = active().data;
    var tpl = TEMPLATES[d.type];
    var W = 72;
    var out = [];

    function push(s) {
      out.push(s);
    }
    function pushWrapped(prefix, text) {
      var indent = new Array(prefix.length + 1).join(" ");
      wrap(prefix + text, W, indent).forEach(push);
      push("");
    }
    function pushList(items, labelFn) {
      nonEmpty(items).forEach(function (item, i) {
        pushWrapped(labelFn(i) + " ", item.trim().replace(/\n+/g, " "));
      });
    }

    if (tpl.forum === "public") {
      push("To,");
      (d.authority || "[Authority]").split("\n").forEach(push);
      push("");
      push(center(("PUBLIC PETITION" + (d.subject ? ": " + d.subject : "")).toUpperCase(), W));
      push("");
      push("Respected Sir/Madam,");
      push("");
      push("We, the undersigned, most respectfully submit as follows:");
      push("");
      pushList(d.facts, function (i) { return i + 1 + "."; });
      if (nonEmpty(d.grounds).length) {
        push(center("REASONS", W));
        push("");
        pushList(d.grounds, function (i) { return letter(i) + "."; });
      }
      push(center("REQUEST", W));
      push("");
      push("We therefore earnestly request that you be pleased to:");
      push("");
      pushList(d.prayers, function (i) { return "(" + roman(i + 1) + ")"; });
      push("and we shall be grateful.");
      push("");
      push("Place: " + (d.place || "______"));
      push("Date:  " + (d.date || "______"));
      push("");
      var rows = d.signatoryRows || 0;
      if (rows > 0) {
        push(center("SIGNATORIES", W));
        push("");
        push("#   Name                          Address / CNIC        Signature");
        push(new Array(W + 1).join("-"));
        for (var i = 1; i <= rows; i++) {
          push(i + ".");
        }
      }
    } else {
      push(center(("IN THE " + (d.court || "[COURT]") +
        (d.location ? " AT " + d.location : "")).toUpperCase(), W));
      push(center(d.caseNo || "___ No. ___ of 20___", W));
      push("");
      push("IN THE MATTER OF:");
      push("");
      nonEmpty(d.petitioners).forEach(function (p, i) {
        pushWrapped(i + 1 + ". ", p.name + (p.detail ? ", " + p.detail : ""));
      });
      push(center("... " + tpl.applicantWord + "(s)", W));
      push("");
      push(center("VERSUS", W));
      push("");
      nonEmpty(d.respondents).forEach(function (p, i) {
        pushWrapped(i + 1 + ". ", p.name + (p.detail ? ", " + p.detail : ""));
      });
      push(center("... Respondent(s)", W));
      push("");
      push(center((tpl.heading + (d.provision ? " UNDER " + d.provision : "")).toUpperCase(), W));
      if (d.subject) push(center("FOR: " + d.subject, W));
      push("");
      push("MOST RESPECTFULLY SHEWETH:");
      push("");
      pushList(d.facts, function (i) { return i + 1 + "."; });
      if (nonEmpty(d.grounds).length) {
        push(center("GROUNDS", W));
        push("");
        pushList(d.grounds, function (i) { return letter(i) + "."; });
      }
      push(center("PRAYER", W));
      push("");
      wrap("In view of the foregoing facts and circumstances, it is most " +
        "respectfully prayed that this Hon'ble Court may graciously be " +
        "pleased to:", W, "").forEach(push);
      push("");
      pushList(d.prayers, function (i) { return "(" + roman(i + 1) + ")"; });
      wrap("and to pass any other order that this Hon'ble Court may deem just " +
        "and proper in the circumstances of the case.", W, "").forEach(push);
      push("");
      push("Place: " + (d.place || "______"));
      push("Date:  " + (d.date || "______"));
      push("");
      push(center("____________________", W));
      push(center(d.counsel || tpl.applicantWord + "(s) / Counsel", W));
      if (d.verification) {
        push("");
        push(center("VERIFICATION", W));
        push("");
        wrap("Verified at " + (d.place || "______") + " on " + (d.date || "______") +
          " that the contents of the above petition are true and correct to " +
          "the best of my knowledge and belief and that nothing material has " +
          "been concealed therefrom.", W, "").forEach(push);
        push("");
        push(center("____________________", W));
        push(center(d.deponent || "Deponent", W));
      }
    }
    return out.join("\n");
  }

  // ---------- Export actions ----------
  function copyText() {
    var text = plainText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast("Petition copied to clipboard."); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      toast("Petition copied to clipboard.");
    } catch (e) {
      toast("Couldn't copy — select the preview and copy manually.");
    }
    document.body.removeChild(ta);
  }

  function downloadText() {
    var d = active();
    var name = draftName(d).replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "petition";
    var blob = new Blob([plainText()], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Downloaded " + a.download);
  }

  // ---------- Toast & theme ----------
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.hidden = true;
    }, 2600);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    els.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  }

  // ---------- Wire up ----------
  function init() {
    initTheme();
    els.themeToggle.addEventListener("click", function () {
      var next =
        document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });

    if (!drafts.length) drafts.push(blankDraft("court"));
    var savedActive = localStorage.getItem(ACTIVE_KEY);
    var found = drafts.some(function (d) {
      return d.id === savedActive;
    });
    activeId = found ? savedActive : drafts[0].id;

    bindStaticFields();

    Object.keys(LISTS).forEach(function (key) {
      var btn = document.querySelector('[data-add="' + key + '"]');
      btn.addEventListener("click", function () {
        active().data[key].push(LISTS[key].party ? { name: "", detail: "" } : "");
        renderList(key);
        onEdit();
        var inputs = LISTS[key].el.querySelectorAll("input, textarea");
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
    });

    els.draftSelect.addEventListener("change", function () {
      openDraft(els.draftSelect.value);
    });
    els.newDraft.addEventListener("click", createDraft);
    els.deleteDraft.addEventListener("click", deleteDraft);
    els.copyBtn.addEventListener("click", copyText);
    els.downloadBtn.addEventListener("click", downloadText);
    els.printBtn.addEventListener("click", function () {
      window.print();
    });

    els.editor.addEventListener("submit", function (e) {
      e.preventDefault();
    });

    openDraft(activeId);
    persist();
  }

  init();
})();
