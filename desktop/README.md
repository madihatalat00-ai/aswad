# CaseFile for Windows (desktop app)

This packages the CaseFile case manager as a real Windows desktop application
with an installer (`CaseFile-Setup-x.y.z.exe`). Installing it adds CaseFile to
the **Start Menu** and **desktop**, and it runs in its own window — no browser,
no internet connection required. Your data is stored on the machine.

The app itself lives in [`../casefile`](../casefile); this folder is just the
Electron shell and installer configuration around it. The `renderer/` folder is
a generated copy of that app (refreshed by `npm run sync`).

## Getting the installer — two ways

### A) Let GitHub build it for you (no tools to install) — recommended

1. Push this branch to GitHub (already done).
2. On GitHub, open the **Actions** tab → **Build Windows installer** →
   **Run workflow**. (It also runs automatically whenever the app changes.)
3. When it finishes (a few minutes), open the run and download the
   **CaseFile-Windows-Installer** artifact. Inside is `CaseFile-Setup-x.y.z.exe`.
4. Copy that `.exe` to your Windows PC and double-click it to install.

### B) Build it yourself on a Windows PC

Requires [Node.js](https://nodejs.org) (LTS). In a terminal:

```bash
cd desktop
npm install
npm run dist
```

The installer appears in `desktop/dist/CaseFile-Setup-x.y.z.exe`. Double-click
it to install.

> Building the Windows `.exe` is only fully supported **on Windows**. macOS/Linux
> can cross-build but need extra setup (Wine), so option A is the simplest path.

## Run it in development (any OS)

```bash
cd desktop
npm install
npm start
```

This opens the app in an Electron window without building an installer.

## How installation works

The installer is an NSIS installer configured (in `package.json` → `build.nsis`)
to:

- let you choose the install location,
- create a desktop shortcut and a Start Menu entry named **CaseFile**,
- install per-user (no admin rights required),
- register an uninstaller in *Add or remove programs*.

## Where your data lives

CaseFile stores everything locally via the app's storage, kept in this app's
own user-data folder on Windows:

```
%APPDATA%\CaseFile\
```

Nothing is uploaded anywhere. Back up that folder to keep or move your data.

## Files

| File               | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| `main.js`          | Electron main process — creates the window, loads the app|
| `copy-renderer.js` | Copies `../casefile` into `renderer/` before build/start |
| `package.json`     | Dependencies, scripts, and electron-builder config       |
| `renderer/`        | Generated copy of the CaseFile web app (do not edit)     |
| `build/`           | Installer resources (drop `icon.ico` here for a custom icon) |
