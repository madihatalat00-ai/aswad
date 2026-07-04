# ⏰ Remind Me — Task Reminder App

A lightweight, zero-dependency task reminder app that runs entirely in your
browser. Add tasks, set reminder times, and get a browser notification when
something is due. All data is stored locally on your device — no accounts, no
servers, no tracking.

## Features

- **Add tasks** with a title, optional notes, priority (low / medium / high),
  and a reminder date & time.
- **Browser notifications** — get an alert the moment a task is due (with an
  in-app fallback toast if notifications aren't granted).
- **Smart filters** — view **All**, **Today**, **Upcoming**, **Overdue**, or
  **Done** tasks, each with a live count.
- **Overdue highlighting** so nothing slips through the cracks.
- **Complete, edit, and delete** tasks; clear all completed at once.
- **Local persistence** via `localStorage` — your tasks are still there when
  you come back.
- **Light & dark themes** — follows your system preference and remembers your
  choice.
- **Fully responsive** — works on phones, tablets, and desktops.

## Getting started

No build step and no dependencies. Just open the app:

```bash
# Option 1 — open directly
open index.html            # macOS
xdg-open index.html        # Linux

# Option 2 — serve locally (recommended, so notifications work reliably)
python3 -m http.server 8000
# then visit http://localhost:8000
```

> **Tip:** Click **Notifications off** in the header (or add a task with a
> reminder time) to grant notification permission. Reminders fire while the tab
> is open; keep it open in a pinned tab for the best experience.

## How it works

| File         | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| `index.html` | Markup and layout                                    |
| `styles.css` | Theming, responsive layout, and component styles     |
| `app.js`     | State, persistence, rendering, and reminder logic    |

Tasks are saved to `localStorage` under the key `remindme.tasks.v1`. Every 20
seconds (and whenever the tab regains focus) the app scans for tasks whose
reminder time has passed and fires a notification exactly once per task.

## Privacy

Everything stays on your device. Nothing is ever sent anywhere.

## License

MIT
