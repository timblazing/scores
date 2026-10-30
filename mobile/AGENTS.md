This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project: testing on the simulator

- Build and device setup: README → "Testing in the simulator". Use the iPhone 16 Pro on iOS 27 (or the README's fallback if the Device panel doesn't list it); the owner's phone is an iPhone 16 Pro on the latest iOS 27 release.
- Follow the root [T3 Code Device panel workflow](../AGENTS.md#t3-code-device-panel): `device_list`, `device_open` with host/device IDs, the returned `agent-device` command for launch/input/capture, and `device_screenshot` for inspection. CLI builds and installs are allowed; launch/input/capture must stay in the panel so the owner can watch and interact.
- `agent-device snapshot -i` can lag after typing into the native search bar: it showed the previous query's results while the screen had the new ones. Confirm results with `device_screenshot` before calling something a bug.
- `@eN` refs go stale when the screen changes. Re-snapshot before each `press`/`fill`; a stale ref once tapped a search result and navigated away.
- Coordinates are in points (402×874). `device_screenshot` images are 3× pixels, so divide by 3, or by about 2.29 for the 920 px-wide preview.
- Swipe-back: `agent-device swipe 2 400 330 400 --pause-ms 300`. The native league menu opens with a plain `press` on the header popup button.
- The simulator can't show how scrolling feels, the Dynamic Island area, push or live-game timing; ask the owner to check those on the phone. Changes only reach the phone through a new IPA installed via SideStore (README).

## This project: design work with the owner

The owner wants to compare design options as simulator screenshots before anything is installed on the phone. For each design question:

1. Build each option (a branch, or a temporary toggle in code), install it on the simulator from the README, and take the same screen in each with `agent-device screenshot <abs path> --pixel-density 3`.
2. Show them side by side in chat (`html_preview` + `html_render` in T3 Code), labeled A / B / C, with a line per option on what differs.
3. Let the owner pick, then build only the chosen option properly and remove the rest. Keep the screenshots out of Git unless they're for a PR (`ui-evidence`).

Keep it to a few options per question, and cover both the Home scores list and one detail page when a change affects both.
