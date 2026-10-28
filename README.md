# Scores

A minimal, dark ESPN alternative for **NFL**, **college football (FBS)**, and **NBA**: live scores, game detail (box score, play-by-play, win probability, odds), standings, teams, players, and news.

Live at **https://scores.blasingame.dev**.

- Web: Vite + React + TypeScript + Tailwind v4, TanStack Query, React Router
- iOS: a native [Expo](https://expo.dev) / React Native app (`mobile/`) with an iOS 26 Liquid Glass tab bar and native menus, plus a Fantasy tab for Sleeper fantasy football. The older Capacitor wrapper of the web build (`ios/`) is superseded.
- Data: ESPN's public, unofficial JSON endpoints. On the web, `site.api.espn.com` goes through an edge-caching Worker (`worker/index.ts`, `/api/espn/site/*`); athletes and search, plus everything in the iOS app, call ESPN directly. Reference: [pseudo-r/Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API). Not affiliated with ESPN.

## Develop

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # outputs dist/
```

## Deploy (Cloudflare Workers static assets)

```sh
pnpm run deploy   # tsc + `cf deploy` → Worker "scores" on scores.blasingame.dev
```

Config lives in `cloudflare.config.ts`: the ESPN cache Worker runs only for `/api/*`; everything else is static assets with SPA fallback on the custom domain.

## iOS app: Expo (`mobile/`)

Expo SDK 58, Expo Router native tabs (Home, Fantasy, search), SwiftUI controls from `@expo/ui`. `mobile/ios/` is generated (Continuous Native Generation) and ignored by Git; configure native settings in `mobile/app.json`.

```sh
cd mobile
npm install
npx expo prebuild -p ios      # only when mobile/ios is missing or app.json/plugins changed
npx tsc --noEmit && npx expo lint
npx expo run:ios              # dev build on the simulator
```

Unsigned IPA for SideStore (same bundle ID as the Capacitor build, so it replaces it):

```sh
cd mobile/ios
xcodebuild -workspace Scores.xcworkspace -scheme Scores -configuration Release -sdk iphoneos \
  -destination 'generic/platform=iOS' -archivePath build/Scores.xcarchive archive CODE_SIGNING_ALLOWED=NO
rm -rf build/Payload build/Scores.ipa
mkdir -p build/Payload && cp -R build/Scores.xcarchive/Products/Applications/Scores.app build/Payload/
(cd build && COPYFILE_DISABLE=1 zip -qr Scores.ipa Payload -x '*/._*' '*/.DS_Store')
```

Then install `mobile/ios/build/Scores.ipa` through SideStore as described below.

## iOS app: Capacitor (legacy; free Apple account, no $99 program)

1. `pnpm ios` builds the web app (`--mode capacitor`, without the Cloudflare plugin), syncs it into `ios/`, and opens Xcode.
2. In Xcode → **App** target → **Signing & Capabilities**, choose your Personal Team. If the bundle ID `dev.blasingame.scores` is taken, change it to something unique.
3. Plug in your iPhone, select it as the run destination, and press Run. On the phone, trust the developer profile in **Settings → General → VPN & Device Management**.

Free provisioning expires after 7 days. To avoid re-plugging every week, use **SideStore**:

1. Archive an unsigned `.ipa`:
   ```sh
   pnpm exec tsc -b
   pnpm sync
   cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Release \
     -sdk iphoneos -archivePath build/Scores.xcarchive archive CODE_SIGNING_ALLOWED=NO
   rm -rf build/Payload
   rm -f build/Scores.ipa
   mkdir -p build/Payload && cp -R build/Scores.xcarchive/Products/Applications/App.app build/Payload/
   (cd build && COPYFILE_DISABLE=1 zip -qr Scores.ipa Payload -x '*/._*' '*/.DS_Store')
   unzip -t build/Scores.ipa
   ```
   Use plain `zip`, not `ditto -c -k --keepParent`: the latter added AppleDouble metadata, including `Payload/._App.app`, to our first IPA. SideStore rejected that package with **"The app is in an invalid format."** Repacking without those entries installed successfully. Start with a fresh ZIP each time so old entries cannot survive an update.
2. For first-time SideStore setup, follow the [official guide](https://docs.sidestore.io/docs/installation/install): install [iloader](https://iloader.app/) on the Mac, sign in, select the phone's **USB** connection, and install **SideStore (Stable)**. Trust the developer profile on the phone and enable Developer Mode if required. Install [LocalDevVPN](https://apps.apple.com/app/localdevvpn/id6755608044), connect it, then sign into SideStore with the same Apple Account. Under **My Apps**, tap SideStore's remaining-days counter to complete its first refresh.
3. AirDrop or Files-share `ios/App/build/Scores.ipa` to the phone. In **SideStore → My Apps → +**, select the IPA. SideStore signs it with your Apple Account. Keep LocalDevVPN connected during installs and refreshes; refresh before the 7-day expiry. Free accounts get 3 active sideloaded apps, including SideStore.

   With a paired USB device, the Mac can also copy the IPA directly into SideStore's Documents folder. Discover the actual SideStore bundle identifier (signing adds a team suffix), then substitute it and the device identifier below:
   ```sh
   xcrun devicectl list devices
   xcrun devicectl device info apps --device '<device-id>' --include-all-apps --search SideStore
   xcrun devicectl device copy to --device '<device-id>' \
     --source ios/App/build/Scores.ipa --destination Documents/Scores.ipa \
     --domain-type appDataContainer --domain-identifier '<installed-sidestore-bundle-id>'
   ```
   Select **On My iPhone → SideStore → Scores.ipa** in SideStore's file picker.

### Setup troubleshooting (verified 2026-10-27)

- **iloader: `Failed to fetch DeviceName: this request was prohibited`**: this occurred during discovery, but the phone remained selectable over USB and installation succeeded. Dismiss the error, keep the phone unlocked, verify Finder sees it, and select the USB entry. The specific failing connection was not identified; do not assume the Apple Account is at fault.
- **iloader: Apple Account locked (`-20209`)**: unlock through [Apple](https://iforgot.apple.com/), verify the current password works at Apple's account site, restart iloader, re-enter the current password, and retry once. This resolved our login. Stop repeated attempts if the lock returns.
- **SideStore phone login: `-80045`, while iloader login works**: the successful sequence was **Settings → User Customizations → On-Device Anisette off**, then **Anisette Servers → Jkcoxson (Mac)** (`https://mac-ani.jkcoxson.com/`) with automatic rotation off. Force-quit and reopen SideStore, keep LocalDevVPN connected, and retry login. This is a [community workaround](https://github.com/SideStore/SideStore/issues/1652), not a guaranteed fix for every build. No pairing-file reset or reinstall was needed.

After web-only changes, the deployed site updates immediately; the iOS app needs `pnpm sync` + a rebuild.
