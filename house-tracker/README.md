# 🏠 House Build Ledger

A zero-dependency web app for keeping track of every amount you transfer while
building your house: to contractors, suppliers, labour and everyone else.
It runs entirely in your browser and your data stays on your device.

## Features

- **Record payments** with amount, date, who you paid, category (cement,
  steel, labour, electrical, plumbing, tiles…), payment method (bank transfer,
  online/mobile wallet, cheque, cash, card), a reference/transaction ID and
  notes. Amounts can be typed with commas (`1,50,000` works).
- **At-a-glance summary**: total transferred, budget remaining (with a
  progress bar that turns amber at 85% and red when you go over), spending
  this month, and your biggest expense head.
- **"Where the money went"** breakdown by **category**, **payee**, **month**
  or **method**. Tap any bar to see just those payments. Payee names are merged
  case-insensitively, so "Ali Traders" and "ali traders" count as one.
- **Payment history** grouped by month with monthly subtotals. Search by
  payee, notes or reference, filter by category, method or date range, and see
  the total for whatever you've filtered.
- **Edit or delete** any payment (tap it). Deletes can be undone.
- **Export CSV** to open in Excel or Google Sheets, and **Backup / Restore**
  a JSON file to move your ledger to another device or keep it safe.
- **Settings** for project name, total budget and currency (PKR, INR, AED,
  SAR, USD, GBP, EUR and more; the default is guessed from your browser).
- Light & dark themes, works on phone and desktop, and prints cleanly.

## Getting started

No build step. Open `index.html` in a browser, or serve the folder:

```bash
cd house-tracker
python3 -m http.server 8000
# then visit http://localhost:8000
```

On a phone, open the page and use **Add to Home Screen** so it works like an
app.

> **Keep a backup.** Payments are saved in your browser's `localStorage`
> (`housebuild.payments.v1`). Clearing browser data deletes them, so tap
> **Backup** every so often and keep the file somewhere safe (email it to
> yourself or put it on Google Drive).

## Using it on claude.ai

The same files also run as a private claude.ai artifact. There, payments are
saved to the artifact's database in your Claude account instead of the
browser, so the ledger is the same on every device you sign in on. CSV export
and backup ask before saving the file.

## Files

| File             | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `index.html`     | Markup, the add/edit payment dialog and the settings dialog |
| `styles.css`     | Theming and responsive layout                              |
| `ledger.js`      | Pure money logic: totals, grouping, filters, CSV, backups  |
| `app.js`         | UI, rendering, persistence                                 |
| `ledger_test.js` | Deno tests for `ledger.js`                                 |

Totals are summed in whole cents, so you never see floating-point drift.

## Tests

```bash
deno test house-tracker
```
