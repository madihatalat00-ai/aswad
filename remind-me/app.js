/* Remind Me — a small task reminder app.
 * State lives in localStorage; reminders fire via the Notifications API. */
(function () {
  "use strict";

  var STORAGE_KEY = "remindme.tasks.v1";
  var THEME_KEY = "remindme.theme";
  var CHECK_INTERVAL = 20 * 1000; // how often we scan for due reminders

  // ---------- DOM refs ----------
  var els = {
    form: document.getElementById("taskForm"),
    title: document.getElementById("titleInput"),
    due: document.getElementById("dueInput"),
    priority: document.getElementById("priorityInput"),
    notes: document.getElementById("notesInput"),
    list: document.getElementById("taskList"),
    empty: document.getElementById("emptyState"),
    emptyText: document.getElementById("emptyText"),
    status: document.getElementById("statusLine"),
    clearCompleted: document.getElementById("clearCompleted"),
    filters: document.querySelector(".filters"),
    notifToggle: document.getElementById("notifToggle"),
    notifIcon: document.getElementById("notifIcon"),
    notifLabel: document.getElementById("notifLabel"),
    themeToggle: document.getElementById("themeToggle"),
    toast: document.getElementById("toast"),
  };

  // ---------- State ----------
  var tasks = load();
  var activeFilter = "all";
  var editingId = null;
  var toastTimer = null;

  // ---------- Persistence ----------
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      toast("Couldn't save — storage may be full.");
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------- Date helpers ----------
  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function endOfToday() {
    var d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  function formatDue(ts) {
    if (!ts) return null;
    var d = new Date(ts);
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var tomorrow = new Date(now.getTime() + 86400000);
    var isTomorrow = d.toDateString() === tomorrow.toDateString();
    var time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    if (sameDay) return "Today " + time;
    if (isTomorrow) return "Tomorrow " + time;
    return (
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      time
    );
  }

  function toLocalInputValue(ts) {
    // Timestamp -> "YYYY-MM-DDTHH:MM" in the user's local time zone.
    if (!ts) return "";
    var d = new Date(ts);
    var pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      "T" +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  function relativeLabel(ts) {
    // Returns { text, className } describing urgency for an incomplete task.
    if (!ts) return null;
    var diff = ts - Date.now();
    var base = formatDue(ts);
    if (diff < 0) return { text: "Overdue · " + base, className: "is-overdue" };
    if (diff < 60 * 60 * 1000)
      return { text: base, className: "is-soon" };
    return { text: base, className: "" };
  }

  // ---------- Categorisation ----------
  function bucketOf(task) {
    if (task.done) return "completed";
    if (!task.due) return "upcoming";
    if (task.due < Date.now()) return "overdue";
    if (task.due <= endOfToday() && task.due >= startOfToday()) return "today";
    return "upcoming";
  }

  function matchesFilter(task, filter) {
    if (filter === "all") return true;
    if (filter === "completed") return task.done;
    if (task.done) return false;
    if (filter === "today")
      return task.due && task.due >= startOfToday() && task.due <= endOfToday();
    if (filter === "overdue") return task.due && task.due < Date.now();
    if (filter === "upcoming")
      return !task.due || task.due > endOfToday();
    return true;
  }

  function sortTasks(a, b) {
    // Incomplete before complete; then by due date (undated last); then newest.
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due && b.due) return a.due - b.due;
    if (a.due) return -1;
    if (b.due) return 1;
    return b.created - a.created;
  }

  // ---------- Rendering ----------
  function render() {
    updateCounts();

    var visible = tasks.filter(function (t) {
      return matchesFilter(t, activeFilter);
    });
    visible.sort(sortTasks);

    els.list.innerHTML = "";
    visible.forEach(function (task) {
      els.list.appendChild(renderTask(task));
    });

    var hasAny = tasks.length > 0;
    var hasVisible = visible.length > 0;
    els.empty.hidden = hasVisible;
    if (!hasVisible) {
      els.emptyText.textContent = hasAny
        ? "No tasks in this view."
        : "Nothing here yet. Add your first task above.";
    }

    var remaining = tasks.filter(function (t) {
      return !t.done;
    }).length;
    els.status.textContent =
      tasks.length === 0
        ? "0 tasks"
        : remaining + " of " + tasks.length + " left";
    els.clearCompleted.hidden = !tasks.some(function (t) {
      return t.done;
    });
  }

  function renderTask(task) {
    if (task.id === editingId) return renderEditForm(task);

    var li = document.createElement("li");
    li.className = "task";
    li.dataset.id = task.id;
    li.dataset.priority = task.priority || "medium";
    if (task.done) li.classList.add("is-done");
    var overdue = !task.done && task.due && task.due < Date.now();
    if (overdue) li.classList.add("is-overdue");

    // checkbox
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "checkbox";
    cb.checked = !!task.done;
    cb.setAttribute("aria-label", "Mark complete");
    cb.addEventListener("change", function () {
      toggleDone(task.id);
    });
    li.appendChild(cb);

    // body
    var body = document.createElement("div");
    body.className = "task-body";

    var title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    body.appendChild(title);

    if (task.notes) {
      var notes = document.createElement("div");
      notes.className = "task-notes";
      notes.textContent = task.notes;
      body.appendChild(notes);
    }

    var meta = document.createElement("div");
    meta.className = "task-meta";

    if (!task.done) {
      var rel = relativeLabel(task.due);
      if (rel) {
        var due = document.createElement("span");
        due.className = "tag " + rel.className;
        due.textContent = (rel.className === "is-overdue" ? "⚠️ " : "🕑 ") + rel.text;
        meta.appendChild(due);
      }
    } else if (task.due) {
      var doneDue = document.createElement("span");
      doneDue.className = "tag";
      doneDue.textContent = "🕑 " + formatDue(task.due);
      meta.appendChild(doneDue);
    }

    var prio = document.createElement("span");
    var p = task.priority || "medium";
    prio.className = "tag tag-prio-" + p;
    prio.textContent = p.charAt(0).toUpperCase() + p.slice(1);
    meta.appendChild(prio);

    body.appendChild(meta);
    li.appendChild(body);

    // actions
    var actions = document.createElement("div");
    actions.className = "task-actions";

    var editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.type = "button";
    editBtn.title = "Edit task";
    editBtn.setAttribute("aria-label", "Edit task");
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", function () {
      editTask(task.id);
    });
    actions.appendChild(editBtn);

    var delBtn = document.createElement("button");
    delBtn.className = "icon-btn delete";
    delBtn.type = "button";
    delBtn.title = "Delete task";
    delBtn.setAttribute("aria-label", "Delete task");
    delBtn.textContent = "🗑️";
    delBtn.addEventListener("click", function () {
      removeTask(task.id);
    });
    actions.appendChild(delBtn);

    li.appendChild(actions);
    return li;
  }

  function renderEditForm(task) {
    var li = document.createElement("li");
    li.className = "task task-edit";
    li.dataset.id = task.id;
    li.dataset.priority = task.priority || "medium";

    var form = document.createElement("form");
    form.className = "edit-form";

    var title = document.createElement("input");
    title.type = "text";
    title.className = "edit-title";
    title.value = task.title;
    title.maxLength = 200;
    title.setAttribute("aria-label", "Task title");
    form.appendChild(title);

    var notes = document.createElement("input");
    notes.type = "text";
    notes.className = "edit-notes";
    notes.value = task.notes || "";
    notes.maxLength = 500;
    notes.placeholder = "Notes (optional)";
    notes.setAttribute("aria-label", "Notes");
    form.appendChild(notes);

    var row = document.createElement("div");
    row.className = "edit-row";

    var due = document.createElement("input");
    due.type = "datetime-local";
    due.className = "edit-due";
    due.value = toLocalInputValue(task.due);
    due.setAttribute("aria-label", "Reminder date and time");
    row.appendChild(due);

    var prio = document.createElement("select");
    prio.className = "edit-prio";
    prio.setAttribute("aria-label", "Priority");
    ["low", "medium", "high"].forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
      if ((task.priority || "medium") === p) opt.selected = true;
      prio.appendChild(opt);
    });
    row.appendChild(prio);

    form.appendChild(row);

    var actions = document.createElement("div");
    actions.className = "edit-actions";

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", cancelEdit);
    actions.appendChild(cancel);

    var saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = "Save";
    actions.appendChild(saveBtn);

    form.appendChild(actions);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      saveEdit(task.id, {
        title: title.value,
        notes: notes.value,
        priority: prio.value,
        due: due.value ? new Date(due.value).getTime() : null,
      });
    });

    form.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    });

    li.appendChild(form);
    return li;
  }

  function updateCounts() {
    var counts = { all: 0, today: 0, upcoming: 0, overdue: 0, completed: 0 };
    tasks.forEach(function (t) {
      counts.all++;
      if (t.done) {
        counts.completed++;
        return;
      }
      var b = bucketOf(t);
      if (b === "today") counts.today++;
      else if (b === "overdue") counts.overdue++;
      else counts.upcoming++;
    });
    Object.keys(counts).forEach(function (key) {
      var el = els.filters.querySelector('[data-count="' + key + '"]');
      if (el) el.textContent = counts[key];
    });
  }

  // ---------- Actions ----------
  function addTask(data) {
    tasks.push({
      id: uid(),
      title: data.title,
      notes: data.notes || "",
      due: data.due || null,
      priority: data.priority || "medium",
      done: false,
      notified: false,
      created: Date.now(),
    });
    save();
    render();
  }

  function toggleDone(id) {
    var t = find(id);
    if (!t) return;
    t.done = !t.done;
    if (t.done) t.notified = true; // don't fire a reminder for finished tasks
    save();
    render();
  }

  function removeTask(id) {
    tasks = tasks.filter(function (t) {
      return t.id !== id;
    });
    save();
    render();
    toast("Task deleted");
  }

  function editTask(id) {
    if (!find(id)) return;
    editingId = id;
    render();
    var input = els.list.querySelector(".task-edit .edit-title");
    if (input) {
      input.focus();
      input.select();
    }
  }

  function saveEdit(id, data) {
    var t = find(id);
    if (!t) return;
    var title = (data.title || "").trim();
    if (!title) {
      toast("Title can't be empty");
      return;
    }
    t.title = title.slice(0, 200);
    t.notes = (data.notes || "").trim().slice(0, 500);
    t.priority = data.priority || "medium";
    t.due = data.due || null;
    // Re-arm the reminder only when the new due time is still in the future.
    t.notified = t.due && t.due > Date.now() ? false : true;
    editingId = null;
    save();
    render();
    toast("Task updated");
  }

  function cancelEdit() {
    editingId = null;
    render();
  }

  function find(id) {
    return tasks.filter(function (t) {
      return t.id === id;
    })[0];
  }

  // ---------- Reminders ----------
  function checkReminders() {
    var now = Date.now();
    var due = tasks.filter(function (t) {
      return !t.done && !t.notified && t.due && t.due <= now;
    });
    if (!due.length) return;

    due.forEach(function (t) {
      t.notified = true;
      notify(t);
    });
    save();
    render();
  }

  function notify(task) {
    var body = task.notes ? task.notes : "This task is due now.";
    if (
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("⏰ " + task.title, {
          body: body,
          tag: task.id,
        });
        return;
      } catch (e) {
        /* fall through to in-app toast */
      }
    }
    toast("⏰ Reminder: " + task.title);
  }

  // ---------- Notifications permission ----------
  function refreshNotifUI() {
    var supported = "Notification" in window;
    if (!supported) {
      els.notifIcon.textContent = "🚫";
      els.notifLabel.textContent = "Unsupported";
      els.notifToggle.disabled = true;
      return;
    }
    if (Notification.permission === "granted") {
      els.notifIcon.textContent = "🔔";
      els.notifLabel.textContent = "Notifications on";
      els.notifToggle.classList.add("is-on");
    } else if (Notification.permission === "denied") {
      els.notifIcon.textContent = "🔕";
      els.notifLabel.textContent = "Blocked in browser";
      els.notifToggle.classList.remove("is-on");
    } else {
      els.notifIcon.textContent = "🔕";
      els.notifLabel.textContent = "Notifications off";
      els.notifToggle.classList.remove("is-on");
    }
  }

  function requestNotif() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      toast("Notifications already enabled");
      return;
    }
    if (Notification.permission === "denied") {
      toast("Enable notifications in your browser settings");
      return;
    }
    Notification.requestPermission().then(function (perm) {
      refreshNotifUI();
      if (perm === "granted") toast("Notifications enabled 🎉");
    });
  }

  // ---------- Theme ----------
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (!saved) {
      saved =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }
    document.documentElement.setAttribute("data-theme", saved);
  }

  function toggleTheme() {
    var current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", current);
    localStorage.setItem(THEME_KEY, current);
  }

  // ---------- Toast ----------
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    // force reflow so the transition runs
    void els.toast.offsetWidth;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove("show");
    }, 2600);
  }

  // ---------- Events ----------
  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = els.title.value.trim();
    if (!title) return;

    var dueVal = els.due.value ? new Date(els.due.value).getTime() : null;

    addTask({
      title: title,
      notes: els.notes.value.trim(),
      due: dueVal,
      priority: els.priority.value,
    });

    els.form.reset();
    els.priority.value = "medium";
    els.title.focus();

    if (dueVal && "Notification" in window && Notification.permission === "default") {
      requestNotif();
    }
  });

  els.filters.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    els.filters.querySelectorAll(".filter-btn").forEach(function (b) {
      b.classList.toggle("is-active", b === btn);
    });
    render();
  });

  els.clearCompleted.addEventListener("click", function () {
    var had = tasks.length;
    tasks = tasks.filter(function (t) {
      return !t.done;
    });
    if (tasks.length !== had) {
      save();
      render();
      toast("Cleared completed tasks");
    }
  });

  els.notifToggle.addEventListener("click", requestNotif);
  els.themeToggle.addEventListener("click", toggleTheme);

  // Re-scan when the tab regains focus (timers throttle in background tabs).
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) checkReminders();
  });

  // ---------- Boot ----------
  initTheme();
  refreshNotifUI();
  render();
  checkReminders();
  setInterval(checkReminders, CHECK_INTERVAL);
})();
