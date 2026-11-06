# Agent instructions

Read `README.md` for the active Expo app and build commands. For work in `mobile/`, also read `mobile/AGENTS.md`.

When the owner asks where things left off or what's on the slate, answer from the **Slate** section at the top of `docs/WORKLOG.md`. Update that section at the end of every session.

## Simulators

Don't boot or open an iOS Simulator (T3 Device panel, `simctl`, `expo run:ios`, simulator `xcodebuild`) unless the owner approves it in the current conversation; it uses too much CPU and memory. Verify with typecheck and lint, and leave device checks to the owner, who tests on the phone with an IPA (README). When a simulator is approved, use T3's Device panel as described in `mobile/AGENTS.md`, and shut it down when done.

## Cloud agents

For Claude (GitHub Actions, `@claude`) and Codex (Codex Cloud, `@codex`) working on this repo in the cloud.

- Skills come from [timblazing/skills](https://github.com/timblazing/skills). The Claude workflow installs them before each run, and so does the Codex Cloud environment's setup script. Use `pr-workflow` to land changes and `leaving-pr-comments` for anything you post on GitHub.
- Never push to `main`. Work on a branch and open a pull request.
- Verify with `pnpm build` before you push (install first with `pnpm install --frozen-lockfile`).
- Do not update local session logs or work logs (for example `docs/WORKLOG.md`); put remaining work in the PR description.
- End every issue comment you post with a status marker on its own last line, as an HTML comment (GitHub doesn't show it): `<!-- proj-agent: needs-input -->` when you are waiting on an answer from the owner, `<!-- proj-agent: working -->` for an acknowledgement or progress note, `<!-- proj-agent: done -->` once the work is finished. proj reads it to show the issue's status.
- The shared instructions installed with the skills are written for a local Mac. In the cloud, skip the local-only rules: browser work through `agent-browser` (and the `ui-check`, `ui-qa`, `ui-evidence` skills), iOS simulators and Android emulators, the Docker/VM rules and T3 Code tools. Say in the PR what still needs checking by hand.

## Code Review Rules

For `@codex review` and any other code review of this repo.

- Focus on correctness, security and regressions: bugs, unhandled edge cases, data loss, leaked secrets, missing auth or validation, and behavior that changed without the PR saying so.
- Skip style nits, formatting and naming preferences unless they hide a bug.
- Point at the exact line, say what breaks and when, and suggest a fix. Say so when nothing needs changing.

## Docs

Project documentation is markdown in `docs/`, and proj's Docs tab shows it. Keep it in this layout:

```
docs/
  README.md          index: what the project is, and links to everything below
  architecture.md    how it fits together (an architecture/ folder when it gets large)
  decisions/         ADRs, one per decision: NNNN-short-title.md
  guides/            how-tos: setup, deploy, release
  runbooks/          ops: what to do when X breaks
  reference/         APIs, config, data model
```

- When you change behavior, config, an API or the deploy process, update the doc that describes it in the same PR. Don't leave docs describing the old behavior.
- Record a significant decision as a new ADR in `docs/decisions/` (next number, short title, with Context, Decision and Consequences headings).
- Start every doc with a single `# Title` heading, and use relative links between docs. Keep `docs/README.md` linking to everything else.
- If the existing docs are somewhere else or laid out differently, don't reshuffle them as a side effect of other work; move them in a PR of their own.
