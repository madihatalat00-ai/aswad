# 🥑 FODMAP Assistant — Web

A mobile-first web version of the FODMAP Assistant that runs on **any phone
browser — no Mac, no Xcode, no app store**. It's the same 186-food database and
the same features as the [native iOS app](../ios-fodmap), rebuilt as a
zero-dependency web app you can use on your iPhone in seconds and **install to
your Home Screen**.

## Use it on your iPhone

1. Host the folder somewhere (see **Running** below) and open it in **Safari**.
2. Tap the **Share** button → **Add to Home Screen**.
3. It now opens full-screen like a native app, and works **offline**.

## Features

- **Search** — type a food (`garlic`, `apple`, `oats`) for an instant
  colour-coded verdict. Also matches categories and FODMAP groups (search
  `lactose` to list every lactose food).
- **Filter** by verdict: 🟢 Enjoy, 🟡 Careful, 🔴 Avoid.
- **Browse by category** — 11 categories, each showing how many foods are safe.
- **Food detail sheet** — verdict, **serving guidance**, the FODMAP groups
  present, and a practical tip/swap.
- **Favourites** — star foods to build a personal shortlist (saved in your
  browser via `localStorage`).
- **About** — plain-language FODMAP explainer + medical disclaimer.
- **Light & dark mode**, and an offline service worker once installed.

## Running

No build step, no dependencies.

```bash
# From this folder:
python3 -m http.server 8000
# then open http://localhost:8000 on your computer,
# or http://<your-computer-ip>:8000 on your phone (same Wi-Fi).
```

To use it on your phone away from your computer, host the folder on any static
host — **GitHub Pages**, Netlify, Vercel, Cloudflare Pages — then open that URL
in Safari and Add to Home Screen.

> Opening `index.html` directly with `file://` mostly works, but the service
> worker (offline caching) and Add-to-Home-Screen only activate over `http(s)`.

## Files

| File | Purpose |
| ---- | ------- |
| `index.html` | Markup, tabs, and mobile/PWA meta tags |
| `styles.css` | Theming, responsive layout, verdict colours, light/dark |
| `app.js` | Search, filter, category browse, favourites, detail sheet |
| `data.js` | The 186-food database (`const FOODS`) |
| `manifest.webmanifest` | Add-to-Home-Screen config |
| `sw.js` | Service worker for offline use |
| `icons/` | App icons (180 / 192 / 512) |

## Editing the food data

`data.js` is generated from the native app's
`../ios-fodmap/FODMAPAssistant/Data/foods.json`, so both apps stay in sync. To
regenerate after editing that JSON:

```bash
python3 - <<'PY'
import json
data = json.load(open('../ios-fodmap/FODMAPAssistant/Data/foods.json'))
open('data.js','w').write("const FOODS = " + json.dumps(data, ensure_ascii=False, indent=0) + ";\n")
PY
```

You can also just edit the `FOODS` array in `data.js` directly. Each food has a
`level` of `low`, `moderate`, or `high`.

## Disclaimer

FODMAP classifications and serving thresholds are based on published Monash
University research and widely available low-FODMAP food lists. **This app is for
general education only and is not medical advice** — work with a doctor or
FODMAP-trained dietitian, especially before the reintroduction phase.
