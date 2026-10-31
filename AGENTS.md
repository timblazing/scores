# Agent instructions

Read `README.md` for the active Expo app and build commands. For work in `mobile/`, also read `mobile/AGENTS.md`.

When the owner asks where things left off or what's on the slate, answer from the **Slate** section at the top of `docs/WORKLOG.md`. Update that section at the end of every session.

## Simulators

Don't boot or open an iOS Simulator (T3 Device panel, `simctl`, `expo run:ios`, simulator `xcodebuild`) unless the owner approves it in the current conversation; it uses too much CPU and memory. Verify with typecheck and lint, and leave device checks to the owner, who tests on the phone with an IPA (README). When a simulator is approved, use T3's Device panel as described in `mobile/AGENTS.md`, and shut it down when done.
