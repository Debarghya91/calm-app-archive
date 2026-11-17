# SoulSpace iOS build report (v0.9.0)

## Honest status: NOT compiled here

This iOS project was generated and configured on a Linux machine with no
macOS and no Xcode. It has **not** been compiled, installed, or run
anywhere. Nothing in this report claims a successful iOS build. The first
real compile happens on a Mac by following the steps below.

## Versions

| Item | Version |
|---|---|
| Capacitor core / iOS / CLI | 6.2.3 |
| Capacitor plugins | App 6.0.3, Browser 6.0.6, StatusBar 6.0.3, SplashScreen 6.0.4 |
| App version (MARKETING_VERSION) | 0.9.0 |
| Build number (CURRENT_PROJECT_VERSION) | 9 |
| Bundle ID | com.soulspace.wellbeing |
| Display name | SoulSpace |
| Minimum iOS version | 16.0 (app target and all pod targets) |
| Node.js used to generate the project | 24.22.1 |

## What was configured

- `npx cap add ios` and `npx cap sync ios` from the project root. The
  synced web app lives in `ios/App/App/public/` and matches `www/`
  exactly, plus the two Capacitor-generated files `cordova.js` and
  `cordova_plugins.js`. `js/native.js` (back-button, lifecycle, audio and
  external-link handling) is included. No `www/` app code was changed.
- Bundle ID `com.soulspace.wellbeing` and display name `SoulSpace`
  (Info.plist `CFBundleDisplayName`). Version 0.9.0, build 9, set in both
  Debug and Release configurations.
- Minimum deployment target raised from the Capacitor default 13.0 to
  16.0 in the Xcode project (all four build configurations) and in the
  Podfile (`platform :ios, '16.0'`). The Podfile also has a
  `post_install` hook that forces `IPHONEOS_DEPLOYMENT_TARGET = '16.0'`
  on every pod target and every build configuration, because newer Xcode
  rejects pod targets pinned to 13.0.
- Launch background set to `#F5F3EF` (the app shell colour): the
  LaunchScreen storyboard background colour and all three Splash
  imageset PNGs (2732x2732, SoulSpace tile centred on `#F5F3EF`).
  `capacitor.config.json` also sets `backgroundColor` and the
  SplashScreen plugin background to `#F5F3EF`.
- App icons generated from `www/assets/soulspace-icon.svg` into
  `AppIcon.appiconset` at all 18 required sizes (iPhone, iPad, and the
  1024px marketing icon), opaque RGB as iOS requires, with a matching
  `Contents.json`. Regenerate with `python3 tools/generate-ios-icons.py`.
- Info.plist requests **no** camera, microphone, location, contacts, or
  photo-library permission (no `NS*UsageDescription` keys exist), and
  keeps default App Transport Security (no `NSAppTransportSecurity`
  override, so HTTPS-only). No API key or secret string exists anywhere
  under `ios/`; the backend origin in the copied `config.js` is empty,
  which is the honest unconfigured/offline state until a backend is
  deployed (see `backend/DEPLOYMENT.md`).

## Verified here (and only this)

- Podfile exists, platform is 16.0, and the deployment-target hook is
  present (read back after editing).
- `ios/App/App/public` contains the synced `www` files including
  `js/native.js`; `capacitor.config.json` was copied into the app bundle
  with the correct app ID, name, colours, and four plugins.
- Secret scan over `ios/` found no API key, token, or credential string.
- Both plist files under `ios/` parse with Python `plistlib`.
- No absolute machine paths (`/home/...`, `/Users/...`) exist in the
  Xcode project, plists, Podfile, or storyboards.
- All 18 icon PNGs were checked: exact required pixel size, opaque RGB.
- All three splash PNGs checked: 2732x2732, corners `#F5F3EF`.

## Not verified (needs a Mac)

Compiling, signing, launching, navigation, login, chat, sleep audio,
offline behaviour, back/swipe gestures, keyboard handling, rotation, and
accessibility. None of these were tested for iOS.

## Build steps on a Mac

Prerequisites: macOS with Xcode (16 or newer recommended) and CocoaPods
(`sudo gem install cocoapods` if needed). Unzip the iOS source archive,
then from the project root:

```bash
npm install
cd ios/App
pod install
```

Then open the workspace (never the `.xcodeproj` on its own, or the
Capacitor module will not resolve):

```bash
open App.xcworkspace
```

In Xcode: select the App target, pick your development team under Signing
& Capabilities (automatic signing is already selected), choose a simulator
or a connected device, and Run. The first build downloads and compiles
the Capacitor pods; allow a few minutes.

To point the app at a deployed backend before building, set
`window.SOULSPACE_API` in `www/js/config.js` to the deployed HTTPS origin,
run `npx cap sync ios` from the project root, and rebuild. Never put an
API key in the app; keys live only on the server.

## Known iOS limitations in this build

- Apple sign-in is not implemented; Google sign-in is not implemented.
  Accounts use the app's own email/password backend flow.
- No push notifications, no background audio service: sleep sounds are
  Web Audio in the WebView and pause when the app backgrounds, same as
  Android. A native background-audio implementation is future work.
- No App Store Connect products, no StoreKit billing. Billing is
  explicitly not configured; see `BILLING_INTEGRATION_CHECKLIST.md`.
- The iOS deployment target is 16.0, so iOS 15 and older devices are not
  supported by this build.

## UIScene lifecycle fix (17 Nov 2026)

The Capacitor 6 template ships an AppDelegate-only launch with no scene
support. Apps built with the iOS 26 SDK (Xcode 26) must adopt the UIScene
life cycle: on a local iOS 26 simulator run under the Xcode debugger, UIKit
raised `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`
("UIScene life cycle is required for apps built with this SDK") and paused
the app at launch on a black screen. The fix adds a minimal scene
configuration and leaves all app behaviour unchanged:

- `ios/App/App/SceneDelegate.swift` (new): `UIResponder, UIWindowSceneDelegate`
  with only `var window: UIWindow?`. The Main storyboard still provides the
  initial view controller (`CAPBridgeViewController`).
- `ios/App/App/Info.plist`: `UIApplicationSceneManifest` with one
  `UIWindowSceneSessionRoleApplication` configuration named "Default
  Configuration", delegate `$(PRODUCT_MODULE_NAME).SceneDelegate`, storyboard
  `Main`, multiple scenes disabled.
- `ios/App/App/AppDelegate.swift`: `application(_:configurationForConnecting:options:)`
  returning the "Default Configuration" scene configuration.
- `ios/App/App.xcodeproj/project.pbxproj`: SceneDelegate.swift added to the
  App group and the target's Sources build phase.

A cloud simulator run without a debugger attached launched and rendered
before this fix; the debugger pause was the visible symptom on a local Mac.
After this fix the runtime issue is gone entirely.

## Calm-first UX (17 Nov 2026)

After a real-world test (his wife, anxious, opening the app), the entry
experience was redesigned: an anxious person does not want to chat or read.
Changes are web-only (www/js/views.js, www/css/app.css); no native code changed.

- New calm view: full-screen breathing (inhale 4s, hold 4s, exhale 6s, 5
  breaths, animated orb, two-word phase labels, progress dots), then one
  question ("A little better?"), then a one-step-at-a-time 5-4-3-2-1
  grounding flow, then a quiet close. Talking is offered only at the end.
- Home hero primary button is now "Calm me down" (was "Talk to your
  companion"); the action grid leads with calm and puts talking last.
- Tapping Anxious or Low in the mood check-in goes straight to the calm
  view; the old three-choice dialog is gone.
- Web QA: 18/18 calm-flow checks and 21/21 full-regression checks pass in
  headless Chromium, zero console errors. Screenshots verified visually.

## End-to-end testing in the cloud simulator (17 Nov 2026)

The app was tested properly in a GitHub-hosted iPhone simulator using
Appium: real taps through every flow, real timers (the full 70-second
breathing cycle, no fast-forward), a real relaunch, and a JavaScript
error trap running throughout. Result: 45/45 checks pass, zero JS
errors (run 44077253407). Covered: home hero and tabs, calm-first
ordering, breathing and grounding end to end, mood routing (Anxious/Low
straight to calm), crisis dialog with helplines, discovery dialog,
library (33 cards) and activity detail, sleep sounds with timer,
companion chat with the offline disclosure, login form, Hindi greeting,
journal save, dark theme, and mood/journal/language persistence across
a relaunch. Screenshots from the run were inspected visually.

Testing found and fixed two real app bugs, both in this build:
- Offline chat: with no backend configured, the chat fetched a relative
  /api/chat URL, Capacitor answered with the app shell (HTTP 200), and
  the app showed a generic reply with no offline disclosure. chat.js
  now fails fast when no API is configured, so the honest offline reply
  renders. The same guard was added to api.js.
- iOS console errors: native.js called StatusBar.setBackgroundColor on
  every theme change, but that method is Android-only; iOS rejected it
  with UNIMPLEMENTED. The call is now guarded to Android only.

Android end-to-end testing is still open: the cloud emulator's WebView
renderer dies during test setup ("Render process gone"), so no Android
verdict exists yet. The Android app itself builds and installs; only
the automated emulator test is blocked. Diagnosis via emulator logcat
is in progress.
