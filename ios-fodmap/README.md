# 🥑 FODMAP Assistant — iOS

A native SwiftUI iOS app that helps you answer one question fast: **"Can I eat
this?"** It's built for anyone following a low-FODMAP diet (a common approach
for IBS and FODMAP sensitivity), letting you search a food and instantly see
whether it's **safe to enjoy**, **okay in small servings**, or **best avoided**.

All data ships inside the app — no account, no network, no tracking. Everything
works offline.

## Features

- **Search** — type a food (e.g. `garlic`, `apple`, `oats`) and get an instant
  colour-coded verdict. Search also matches categories and FODMAP groups
  (search `lactose` to see every lactose-containing food). Every row shows the
  food's **safe serving amount**.
- **IBS-Safe tab** — a curated list of only the foods you *can* eat, each with
  its safe serving quantity, filterable by **Any serving** (low FODMAP) or
  **Watch portion** (safe only within the amount shown).
- **Quick filters** — narrow the list to **Enjoy**, **Careful**, or **Avoid**.
- **Browse by category** — Fruits, Vegetables, Grains, Dairy & alternatives,
  Protein, Legumes, Nuts & seeds, Sweeteners, Condiments, Beverages, and
  Herbs & spices — each showing how many foods are safe.
- **Food detail** — the verdict, **serving guidance** (crucial, since many
  foods are low-FODMAP only below a threshold portion), which of the five
  FODMAP groups the food contains, and a practical swap or tip.
- **Favourites** — star foods to build a personal safe/avoid shortlist for
  shopping; saved locally and kept between launches.
- **About** — a plain-language explainer of the five FODMAP groups, how to read
  the colour codes, and a medical disclaimer.
- **Light & dark mode**, iPhone and iPad.

## The colour system

| Badge | Meaning |
| ----- | ------- |
| 🟢 **Enjoy** | Low FODMAP — safe in normal servings. |
| 🟡 **Careful** | Low FODMAP only in a small serving — watch the portion. |
| 🔴 **Avoid** | High FODMAP — best avoided during the elimination phase. |

## The five FODMAP groups

**F**ermentable **O**ligosaccharides, **D**isaccharides, **M**onosaccharides
**A**nd **P**olyols:

- **Fructans** — wheat, onion, garlic
- **GOS** (galacto-oligosaccharides) — legumes, cashews, pistachios
- **Lactose** — milk, soft cheese, yogurt
- **Excess fructose** — honey, apples, mango
- **Polyols** (sorbitol, mannitol, xylitol…) — stone fruit, mushrooms, sugar-free sweeteners

## Project layout

```
ios-fodmap/
├── FODMAPAssistant.xcodeproj        # Open this in Xcode
├── project.yml                      # XcodeGen spec (regenerates the project)
└── FODMAPAssistant/
    ├── FODMAPAssistantApp.swift     # App entry point
    ├── Models/Food.swift            # Food model + FODMAP level enum
    ├── Store/FoodStore.swift        # Loads data, search/filter, favourites
    ├── Data/foods.json              # The food database (186 foods)
    ├── Views/                       # SwiftUI screens & components
    └── Assets.xcassets              # Accent + verdict colours, app icon
```

## Building & running

Requires a Mac with Xcode 15+.

```bash
open ios-fodmap/FODMAPAssistant.xcodeproj
# Select an iOS Simulator (or your device) and press ⌘R
```

If the `.xcodeproj` ever drifts from the source files, regenerate it:

```bash
brew install xcodegen
cd ios-fodmap && xcodegen generate
```

## Extending the food database

The database is a plain JSON file — `FODMAPAssistant/Data/foods.json`. Add a new
food by appending an object:

```json
{
  "name": "Rhubarb",
  "category": "Fruits",
  "level": "low",
  "fodmaps": [],
  "serving": "Low — about 1 cup is fine.",
  "note": ""
}
```

`level` is one of `low`, `moderate`, or `high`. No code changes needed — the app
loads, sorts, and categorises everything at launch.

## Data source & disclaimer

FODMAP classifications and serving thresholds are based on published Monash
University FODMAP research and widely available low-FODMAP food lists. FODMAP
tolerance is individual and thresholds can change as foods are re-tested.

**This app is for general education only and is not medical advice.** For
personalised guidance — especially before the reintroduction/challenge phase —
work with a doctor or a FODMAP-trained dietitian. The
[Monash FODMAP app](https://www.monashfodmap.com/) is the authoritative,
regularly-updated reference.
