# Scores

A minimal, dark ESPN alternative for **NFL**, **college football (FBS)**, and **NBA**: live scores, game detail (box score, play-by-play, win probability, odds), standings, teams, players, and news.

Live at **https://scores.blasingame.dev**.

- Web: Vite + React + TypeScript + Tailwind v4, TanStack Query, React Router
- iOS: the same build wrapped with [Capacitor](https://capacitorjs.com) (`ios/`)
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

## iOS app (free Apple account, no $99 program)

1. `pnpm ios` builds the web app (`--mode capacitor`, without the Cloudflare plugin), syncs it into `ios/`, and opens Xcode.
2. In Xcode → **App** target → **Signing & Capabilities**, choose your Personal Team. If the bundle ID `dev.blasingame.scores` is taken, change it to something unique.
3. Plug in your iPhone, select it as the run destination, and press Run. On the phone, trust the developer profile in **Settings → General → VPN & Device Management**.

Free provisioning expires after 7 days. To avoid re-plugging every week, use **SideStore**:

1. Archive an unsigned `.ipa`:
   ```sh
   pnpm sync
   cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Release \
     -sdk iphoneos -archivePath build/Scores.xcarchive archive CODE_SIGNING_ALLOWED=NO
   mkdir -p build/Payload && cp -r build/Scores.xcarchive/Products/Applications/App.app build/Payload/
   (cd build && zip -qr Scores.ipa Payload)
   ```
2. AirDrop or Files-share `ios/App/build/Scores.ipa` to the phone and open it in SideStore. SideStore signs it with your Apple ID and refreshes it in the background before the 7-day expiry. Free accounts get 3 active sideloaded apps.

After web-only changes, the deployed site updates immediately; the iOS app needs `pnpm sync` + a rebuild.
