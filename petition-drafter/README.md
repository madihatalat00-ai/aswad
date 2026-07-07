# ⚖️ Petition Drafter

A lightweight, zero-dependency petition drafting app that runs entirely in
your browser. Fill in a structured form, watch a formally laid-out petition
take shape in the live preview, and export it — no accounts, no servers, no
tracking. All drafts are stored locally on your device.

> **Disclaimer:** This tool helps you structure and format a petition. It is
> not legal advice — always have court filings reviewed by a qualified
> lawyer, and follow the format rules of the specific court or authority you
> are filing with.

## Features

- **Four templates** — civil/general court petition, writ petition, bail
  application, and public petition (to an authority, with a signature
  sheet).
- **Structured editor** — court & case details, parties (petitioners /
  respondents), subject, numbered facts, lettered grounds (A, B, C…), and
  prayer clauses (i, ii, iii…), with add/remove controls for every list.
- **Live preview** formatted as a formal legal document — caption, cause
  title with VERSUS block, "Most respectfully sheweth", grounds, prayer,
  signature block, and an optional verification clause.
- **Export three ways** — print / save as PDF (the print stylesheet outputs
  only the document), download as plain text, or copy the formatted text to
  the clipboard.
- **Multiple drafts** with autosave — switch between drafts from the header;
  everything persists in `localStorage`.
- **Light & dark themes** — follows your system preference and remembers
  your choice (the document preview always stays paper-like).
- **Fully responsive** — the editor and preview stack on small screens.

## Getting started

No build step and no dependencies. Just open the app:

```bash
# Option 1 — open directly
open petition-drafter/index.html      # macOS
xdg-open petition-drafter/index.html  # Linux

# Option 2 — serve locally
python3 -m http.server 8000
# then visit http://localhost:8000/petition-drafter/
```

## How it works

| File         | Purpose                                                    |
| ------------ | ---------------------------------------------------------- |
| `index.html` | Editor form, preview pane, and layout                       |
| `styles.css` | Theming, responsive layout, document & print styles         |
| `app.js`     | Draft state, persistence, live rendering, and text export   |

Drafts are saved to `localStorage` under the key
`petitiondrafter.drafts.v1` (autosaved ~400 ms after you stop typing). The
preview and the plain-text export are rendered from the same draft data, so
what you print is what you download.

## Privacy

Everything stays on your device. Nothing is ever sent anywhere.

## License

MIT
