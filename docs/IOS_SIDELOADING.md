# iOS sideloading options for Scores

Recorded 2026-10-28. ArcticSign pricing and terms were checked on 2026-10-27; LiveContainer documentation was checked on 2026-10-28. Provider plans and iOS compatibility can change; check the linked sources before buying or changing the working setup.

## Current app and recommendation

Scores now uses the native Expo / React Native app in `mobile/`. The Capacitor app in `ios/` is legacy. Build the current unsigned IPA using the [README's Expo instructions](../README.md#ios-app-expo-mobile); the output is `mobile/ios/build/Scores.ipa`.

SideStore installation and seven-day refresh were verified on the owner's iPhone with the earlier Capacitor build. The work log records simulator verification of the newer Expo app, but not physical-phone verification of that version. Neither ArcticSign signing nor LiveContainer compatibility has been tested for Scores.

Keep Scores installed directly through SideStore while that setup works. Consider LiveContainer for additional apps or experimental builds; consider paid signing if avoiding weekly refreshes is worth the cost and third-party certificate risk.

## Comparison

| Option | What it provides | Refresh / expiration | Main trade-off |
| --- | --- | --- | --- |
| SideStore with a free Apple Account | Direct installation using your own account | Refresh before seven-day provisioning expires | Three active apps including SideStore; ten App IDs per week |
| ArcticSign Prime | Third-party signing credentials for one registered device | Advertised approximately one-year validity, unless revoked earlier | Paid service; only one distribution-certificate replacement within 90 days |
| LiveContainer with free SideStore signing | Many guest apps inside one installed host app | The host still needs free-account refreshes | Guest apps have compatibility and integration limitations |

Sources: [SideStore FAQ](https://docs.sidestore.io/docs/faq), [ArcticSign plans](https://arcticsign.app/), [ArcticSign terms](https://arcticsign.app/tos), [LiveContainer README](https://github.com/LiveContainer/LiveContainer).

## SideStore: the existing free workflow

SideStore signs IPAs with your Apple Account's personal development certificate. LocalDevVPN provides the local connection used during installation and refresh; it does not route traffic through a remote VPN server. A computer is needed for initial setup, rather than every weekly refresh.

- Free provisioning lasts seven days; background refresh can keep it renewed, but refresh must succeed before expiry.
- The normal limit is three active apps, including SideStore itself: SideStore plus Scores leaves one slot.
- The weekly limit is ten App IDs; extensions can consume additional IDs.
- New Scores native builds still need to be packaged and installed. Refreshing renews signing; it does not fetch new source code or build the app.

The [README](../README.md#setup-troubleshooting-verified-2026-10-27) records the Anisette workaround that resolved phone login error `-80045`. Preserve that working setup instead of routinely resetting authentication or pairing.

Sources: [SideStore FAQ](https://docs.sidestore.io/docs/faq), [installation guide](https://docs.sidestore.io/docs/installation/install).

## ArcticSign: pay for longer-lived signing

ArcticSign sells signing certificates and provisioning profiles for a registered device. It is a third-party service, not an Apple Developer membership owned by the purchaser. Its website links a certificate portal and web signer. Using these credentials requires a compatible signing/install workflow; this is not a subscription that simply upgrades the existing free SideStore account.

### Base Prime plan

The advertised price was **$8.89 as a one-time purchase**, with:

- One device and unlimited app signing.
- Approximately one-year certificate validity.
- Advertised certificate processing in 30–40 seconds after device registration.
- Customer support.
- **90-day revocation protection, covering one distribution-certificate replacement for the original device UDID.**

For Scores, the potential benefits are no weekly refresh while the provisioning remains valid, avoiding the normal free-account app limit, and avoiding SideStore's Apple Account / Anisette refresh dependency when using a separate certificate-compatible installer. Building updated IPAs is still necessary. This does not provide automatic Scores updates, change app functionality, or guarantee every entitlement will work.

### Expiration, revocation, and plan ambiguity

Approximately one-year validity is an advertised lifespan, not guaranteed uptime. Apple can revoke a certificate early. A revocation can interrupt app use and require signing/installing again with a replacement. Prime's protection ends after 90 days and only covers one replacement; it is not a full-year warranty.

The terms distinguish expiration from revocation: normal expiration is not covered by replacement protection. They also disclaim certificate longevity and functionality. Refunds are generally unavailable once device processing begins, including when Apple revokes a certificate.

The homepage listed a developer JIT certificate under Prime, but also advertised **Prime Plus ($12.99)** for JIT/emulator support. The FAQ labels its JIT instructions “Prime Plus only”; the terms cover one distribution replacement for Prime, versus one distribution and one developer replacement for Plus. **Do not buy base Prime assuming JIT support; confirm the actual certificate bundle first.** Scores does not have an identified need for a separate sideloading JIT-enablement service.

**Prime Ultra ($14.99)** advertised 355-day revocation protection, still limited to one distribution replacement. The terms exclude ordinary expiration even if it falls inside that protection window. Confirm the actual expiration date before purchase: the site's own FAQ acknowledges certificates can expire in less than 365 days.

ArcticSign also advertises older developer accounts and “PPQLess” certificates to avoid certain Apple verification checks. These are provider claims, not a guarantee against revocation or an independently verified privacy benefit. Its website reviews alone do not establish reliability.

Sources: [plans](https://arcticsign.app/), [FAQ](https://arcticsign.app/faq), [terms and refund policy](https://arcticsign.app/tos).

## LiveContainer: more apps within one host

LiveContainer is a free, open-source app launcher. It runs imported IPAs inside its own process/environment instead of registering each guest as a separate installed iOS app. It is not an emulator or virtual machine.

Guest apps do not individually consume the usual three installed-app slots or ten App IDs. LiveContainer also supports multiple versions and separate data containers for an app. “JIT-less” mode signs guests with the certificate imported from SideStore; JIT is not required for ordinary launching. It does not mean JIT is enabled automatically for guest apps that need it.

### Packaging and setup choices

- **Standalone:** install LiveContainer through the existing SideStore, import its signing certificate from LiveContainer settings, and run the JIT-less diagnostic. Keeping Scores directly installed uses all three slots: SideStore, Scores, and LiveContainer. Additional guest apps run inside LiveContainer.
- **LiveContainer+SideStore:** the official combined build includes SideStore within LiveContainer and uses one slot for both. With Scores installed directly, this leaves one free slot. The official migration guide allows installation through existing SideStore; set up and verify the built-in SideStore before removing the standalone one.

For either version, import guest IPAs with LiveContainer's plus button. Free-account signing still requires refreshing the host before seven-day expiry. The combined version supports a refresh shortcut, but it still depends on the SideStore login, signing, and LocalDevVPN workflow. It does not deliver ArcticSign's advertised long-lived provisioning.

Use the official installation guide for the selected build. It explicitly does not support Sideloadly, i4/3u Tools, NB Tool, or most online signers for installing LiveContainer; do not assume an arbitrary certificate service or signer will work with it.

### Limitations relevant to Scores

- Remote push notifications do not work for guest apps.
- Guest widgets and app extensions generally are not supported; guest entitlements are not automatically granted to the host.
- File pickers, URL handling, permissions, and other integrations may need compatibility settings or behave differently.
- Guest apps share a sandbox and can access other guest apps' data. Separate data containers are not equivalent to iOS app sandbox isolation.
- Some apps do not work. Scores' current Expo / React Native build has not been tested inside LiveContainer; its native controls, navigation, storage, networking, and lifecycle need device verification before relying on it there.

Use official open-source builds. The project warns that closed-source third-party builds can access all contained app data, including credentials. Back up important data before moving between direct installation and a guest container; do not assume the existing Scores data transfers automatically.

Sources: [README and limitations](https://github.com/LiveContainer/LiveContainer), [installation overview](https://livecontainer.github.io/docs/installation), [standalone setup](https://livecontainer.github.io/docs/installation/standalone), [combined build and migration](https://livecontainer.github.io/docs/installation/lc_sidestore), [FAQ](https://livecontainer.github.io/docs/faq).

## Choosing for this project

- **Only Scores, and refresh is reliable:** stay with direct SideStore installation; neither alternative is necessary.
- **More apps or isolated app-version experiments:** try LiveContainer for those guests while keeping the main Scores install direct. Its data containers are useful for experiments, but do not provide security isolation.
- **Weekly refresh or Anisette maintenance is the problem:** ArcticSign Prime could reduce that maintenance for a small fee, with the revocation and warranty limits above. Confirm its certificate expiry and the Prime/JIT discrepancy first.
- **Testing native integrations or future widgets/push:** prefer direct installation so LiveContainer's guest limitations do not become an extra variable. Direct sideloading still requires the appropriate Apple capabilities; it does not itself guarantee push or widget support.

No provider purchase, signing migration, or device installation was performed as part of this comparison.
