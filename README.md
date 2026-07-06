# ⚖️ Solicitor's Desk — Legal Draft Review

An experienced solicitor's review of your legal draft, in the browser. Paste a
petition, application for judicial review, writ petition, affidavit, or any
other legal draft and the tool will:

1. **Proof-read** the draft.
2. **Flag grammatical errors.**
3. **Flag punctuation errors.**
4. **Only suggest** changes — *nothing is altered without your authorization.*
5. **Suggest new grounds of challenge.**
6. **Suggest refinements** to grounds already pleaded.
7. **Suggest new reliefs** and refinements to reliefs already sought.

> **Rider honoured.** Purely *stylistic* grammar and punctuation changes you
> accept are capped at **20%** of the draft. Corrections of genuine grammatical
> and punctuation **errors** are always permitted and do **not** count against
> that ceiling.

It is zero-dependency, runs entirely in your browser, and no draft ever leaves
your device.

## The core principle: nothing changes without authorization

Your draft is treated as the advocate's own work product and is **never mutated
in place**. Every issue is presented as a suggestion with **Accept** / **Reject**
controls. A *revised draft* is generated **only** from the changes you personally
accept — reject everything and the "revised" draft is byte-for-byte identical to
what you pasted.

## The 20% change budget (the rider)

The rider draws a deliberate line between two kinds of change:

| Kind of change | Counts toward the 20% cap? |
| -------------- | -------------------------- |
| Fixing a genuine **grammatical error** (e.g. `and and`, `neccessary`, `a apple`) | **No** — always permitted |
| Fixing a genuine **punctuation error** (e.g. missing space after a comma, double spaces) | **No** — always permitted |
| A **stylistic** refinement (e.g. tightening *"in order to"* → *"to"*) | **Yes** — held to 20% of the draft |

A live **Change budget** meter tracks how much of the draft your accepted
*stylistic* changes touch. Once you reach 20%, further stylistic changes are
blocked (with an explanation) so the solicitor never re-writes counsel's chosen
style beyond the agreed limit — while error corrections remain unrestricted.
You can measure the budget by **characters** or **words**.

## What it reviews

### Proofreading
- **Punctuation errors** — space before punctuation, missing space after a comma
  or semicolon, collapsed double spaces, repeated punctuation.
- **Grammatical errors** — doubled words, `a`/`an` agreement, and a dictionary of
  common (and legal-specific) misspellings.
- **Stylistic suggestions** — verbose phrasing tightened to plainer drafting, and
  advisory notes on over-long sentences. Legal terms of art and doublets are left
  untouched.

Each finding shows the exact before → after in context, an explanation, and its
category, and states plainly whether it is an *error* (always fixable) or a
*style* change (counts to the 20%).

### Grounds of challenge
Detects which standard heads are already pleaded and offers a **refinement** for
each, then suggests **additional grounds** worth considering — illegality, ultra
vires, Wednesbury unreasonableness, procedural impropriety, natural justice,
bias, failure to give reasons, relevant/irrelevant considerations, fettering of
discretion, mala fides, legitimate expectation, proportionality, fundamental
rights, jurisdictional error, retrospectivity — each with a drafting note.

### Reliefs
Detects reliefs already sought and suggests refinements, then suggests further
reliefs — certiorari/quashing, mandamus, prohibition, declaration, injunction,
interim relief/stay, remittal, damages, costs, and the residuary prayer.

### Solicitor's report
A consolidated review note (copy or download as Markdown) plus the **revised
draft** built solely from your authorized changes (copy or download as text).

## Getting started

No build step and no dependencies. Just open the app:

```bash
# Option 1 — open directly
open index.html            # macOS
xdg-open index.html        # Linux

# Option 2 — serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

Press **Load sample** to explore the tool with a deliberately imperfect writ
petition.

## How it works

| File         | Purpose                                                     |
| ------------ | ----------------------------------------------------------- |
| `index.html` | Markup and layout                                           |
| `styles.css` | Theming (light/dark), responsive layout, component styles   |
| `app.js`     | Proofreading engine, grounds/reliefs knowledge base, budget enforcement, report generation |

Light and dark themes follow your system preference and remember your choice.
Fully responsive across phone, tablet, and desktop.

## Scope & disclaimer

This tool assists a qualified solicitor's review workflow. It applies conservative,
rule-based proofreading and a curated knowledge base of common-law public-law
grounds and reliefs. It is **not** a substitute for professional legal advice,
does not create a solicitor–client relationship, and its suggestions should be
reviewed by a qualified legal professional against the applicable jurisdiction.

---

> Looking for the earlier task-reminder app? It now lives in
> [`remind-me/`](remind-me/).
