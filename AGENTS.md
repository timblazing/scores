# Agent instructions

Read `README.md` for the active Expo app and build commands. For work in `mobile/`, also read `mobile/AGENTS.md`.

When the owner asks where things left off or what's on the slate, answer from the **Slate** section at the top of `docs/WORKLOG.md`. Update that section at the end of every session.

## T3 Code Device panel

When working in T3 Code, use its built-in **Device panel** for iOS Simulator / Android Emulator work so the owner can see and interact with the running app.

1. Call `device_list`, choose the appropriate available OS/device from the README, then call `device_open` with both `hostId` and `deviceId`.
2. Use the returned device-bound `agent-device` command for app launch/relaunch, deep links, taps, typing, swipes, alerts, settings, screenshots and recordings. Run `open <app>` before snapshots, screenshots or input. Use `help <command>` for supported options.
3. Call `device_screenshot` to inspect the screen. Do not perform those interactions through `simctl`, `idb`, `adb`, SSH or wrapper scripts. Builds, installs, code sync, Metro, port forwarding, logs, project test runners and unsupported operations may use the appropriate CLI.
4. If a device tool or its returned command fails, quote the error and follow its advice once. If it still fails, report the blocker and stop device automation. Do not silently bypass the panel, reuse/close another session, or drive over SSH without the owner's explicit request.
5. Keep the task's device available while the owner is interacting. Stop task-owned servers and simulators when the owner is done; leave other sessions alone. Record simulator evidence separately from physical-device verification.
