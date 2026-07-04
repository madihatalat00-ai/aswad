# ⏰ Remind Me — iOS app (SwiftUI)

A native iOS version of the Remind Me task reminder app. Unlike the web
version, reminders are scheduled with the operating system, so they fire as
real notifications **even when the app is closed**.

## Requirements

- **macOS with Xcode 15 or newer** (this is required — an iOS app cannot be
  built on Linux/Windows).
- iOS 16.0+ deployment target (runs on the Simulator or a physical device).

## Open & run

**Option 1 — open the project directly**

```bash
open ios/RemindMe.xcodeproj
```

Then in Xcode pick an iPhone simulator (or your device) and press **⌘R**.

**Option 2 — regenerate the project with XcodeGen** (use if Xcode reports the
project is damaged/out of sync):

```bash
brew install xcodegen
cd ios
xcodegen generate
open RemindMe.xcodeproj
```

> On first launch the app asks for notification permission. Allow it so due
> tasks can alert you. On a physical device, notifications for a chosen time
> will arrive even if the app is backgrounded or closed.

## Features

- Add tasks with a title, notes, priority (low / medium / high), and an
  optional reminder date & time.
- **Local notifications** scheduled per task via `UNUserNotificationCenter`;
  rescheduled on edit, cancelled when a task is completed or deleted.
- Filters: **All / Today / Upcoming / Overdue / Done**, each with a live count.
- Tap a task to edit it, swipe to delete, tap the circle to complete, and
  **Clear Done** to remove finished tasks.
- Overdue tasks are flagged in red; priority shows as a colored bar and chip.
- Tasks persist across launches (`UserDefaults`, JSON-encoded).
- Light & dark mode via the system appearance and an app accent color.

## Project layout

```
ios/
├─ RemindMe.xcodeproj/         # Xcode project (open this)
├─ project.yml                 # XcodeGen spec (regenerates the project)
└─ RemindMe/
   ├─ RemindMeApp.swift        # App entry + notification permission/delegate
   ├─ ContentView.swift        # Task list, filter bar, toolbar
   ├─ TaskRowView.swift        # A single task row
   ├─ TaskEditorView.swift     # Add/edit sheet
   ├─ TaskStore.swift          # State, persistence, notification scheduling
   ├─ TaskItem.swift           # Task model
   ├─ Priority.swift           # Priority enum (color + sort)
   ├─ TaskFilter.swift         # Filter definitions
   └─ Assets.xcassets/         # Accent color + app icon slot
```

## Notes

- The bundle identifier defaults to `com.example.RemindMe`. Change it (and pick
  your signing team) in **Signing & Capabilities** before running on a device.
- The `AppIcon` slot is empty by default; drop a 1024×1024 PNG into
  `Assets.xcassets/AppIcon.appiconset` to give it an icon.
- This project was authored on a non-macOS environment and has **not been
  compiled**; build it in Xcode and let me know if anything needs adjusting.
```
