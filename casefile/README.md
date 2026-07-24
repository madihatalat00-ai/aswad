# ⚖️ CaseFile — Legal Case & Matter Manager

A private, zero-dependency case-management app for lawyers. It organizes your
practice around the standard **Client → Matter → Document** hierarchy, tracks
**deadlines** and **time/billing**, and runs entirely in your browser. All data
is stored locally on your device — no accounts, no servers, no tracking.

> **Confidentiality first.** Nothing you enter leaves your machine. Cloud sync
> (Google Drive / Gmail) is intentionally left as an opt-in phase-2 step so
> privileged client data is never sent anywhere until you deliberately connect
> it.

## Features

- **Clients** — contact details, company, and notes; see each client's matters.
- **Matters** — the core record: auto-suggested matter numbers (`2026-0001`),
  type, status (Open / On hold / Closed), open date, and notes, each linked to
  a client.
- **Documents** — an index of documents per matter, with type, date, notes, and
  a link to the actual file (a Google Drive URL or a path on disk).
- **Deadlines** — court dates, filings, and statutes of limitation with
  overdue / due-soon highlighting, checkable when done.
- **Billing & time** — log hours and rates per matter; running totals and value.
- **Dashboard** — clients, open matters, overdue deadlines, document count, and
  total time value at a glance, plus the next upcoming deadlines.
- **Global search** across every record from the header.
- **Light & dark themes**, fully responsive, works on phone/tablet/desktop.

## Getting started

No build step and no dependencies. Just open the app:

```bash
# Option 1 — open directly
xdg-open casefile/index.html    # Linux
open casefile/index.html        # macOS

# Option 2 — serve locally
python3 -m http.server 8000
# then visit http://localhost:8000/casefile/
```

On first run it seeds one sample client, matter, and deadline so the app isn't
empty. Delete them once you start entering real data.

## How it works

| File         | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| `index.html` | Markup, tab bar, and modal host                      |
| `styles.css` | Theming, responsive layout, and component styles     |
| `app.js`     | Data model, persistence, rendering, and forms        |

All data is saved to `localStorage` under `casefile.data.v1`.

## Roadmap (phase 2)

- **Google Drive sync** — OAuth in, then auto-file and link documents by matter.
- **Gmail integration** — attach client correspondence to the right matter.
- **Export** — CSV / PDF exports for matters, deadlines, and billing.
- **Conflict-of-interest search** across clients and adverse parties.

These involve sending data to cloud services, so they're kept separate and
opt-in by design.

## Privacy

Everything stays on your device. Nothing is ever sent anywhere.

## License

MIT
