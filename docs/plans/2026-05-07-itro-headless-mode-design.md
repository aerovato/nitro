# Headless Mode Design

**Date:** 2026-05-07
**Status:** Approved · Implementation pending
**Scope:** Make `itro "<request>"` work correctly when invoked from a non-TTY parent
(Claude Code's Bash tool, shell scripts, CI) without disturbing the interactive Ink TUI.

---

## 1. Problem

Every entry path — including the one-shot form `itro "<request>"` — routes through
`runChatScreen` (`src/index.ts:121-124`), which renders the full Ink TUI. Ink's
`useInput` requires raw-mode access to stdin (`src/components/bash/BashPrompt.tsx:2`),
so the moment a request reaches the bash-approval prompt under a non-TTY parent, the
process crashes:

```
Error: Raw mode is not supported on the current process.stdin, which Ink uses
as input stream by default.
```

The same failure also blocks the first-run EULA screen (`src/screens/EulaScreen.tsx`)
on a clean install. Net effect: itro is unusable as a sub-agent invoked by another
agent. That is the use case this design addresses.

## 2. Goals & Non-goals

### Goals

- `itro "<req>"` from a non-TTY parent runs to completion or fails honestly with a
  meaningful exit code — never with an Ink crash.
- The interactive TUI behavior is **byte-for-byte unchanged** for direct human use.
- Multi-turn agentic behavior is preserved in headless mode (the model can chain
  bash calls).
- The user (operator) keeps explicit control over destructive commands via a
  risk-gated execution policy.
- No new top-level dependencies; Ink stays confined to TUI imports.

### Non-goals (explicitly out of scope for this design)

- Binary / package / settings-dir rename (`nitro` → `itro`, `~/.nitro/` → `~/.itro/`,
  `@aerovato/nitro` → ...).
- `--json` / NDJSON output mode.
- `--quiet` mode (final-answer-only).
- Streaming LLM output.
- Headless variants of `continue`, `resume`, `interactive` (multi-session features).
- Auto-accepting the EULA on behalf of the operator.
- Refactoring `runChatScreen` to share a UI-agnostic core (deliberately rejected;
  see §6).

If any of these become blockers for actually using itro from Claude Code, open a
separate brainstorm.

## 3. Contract

| Aspect | Behavior |
|---|---|
| Activation | Auto when `process.stdin.isTTY === false` on the one-shot path; explicit via `--headless`; suppressed by `--tty` |
| Turn model | Multi-turn chat loop — model can chain bash calls until it stops returning tool calls |
| Risk gate | `Read Only` & `Normal` → auto-run · `Dangerous` & `Extremely Dangerous` → refused unless `--yes` |
| stdout | Plain transcript: `$ <command>` lines + cleaned tool output, ending with `Answer: <model text>` if non-empty |
| stderr | Meta only: `[risk: …, tags: …]` per command, refusals, EULA / provider / network errors, internal errors |
| Exit codes | `0` success · `2` blocked by risk gate (advise `--yes`) · `1` anything else |

### EULA

If `eulaAgreed === false` in settings, headless mode prints to stderr and exits `1`:

```
itro: EULA not yet accepted. Run 'itro' interactively once to review and accept it,
then re-run your headless request.
```

No auto-accept. The only path to acceptance is the existing Ink screen run interactively.

## 4. CLI surface

Additions only — every other subcommand (`interactive`, `continue`, `resume`,
`strict`, `settings`, `provider`) is **untouched**. Headless applies only to the
one-shot path.

```
itro "<req>"            # auto-headless if no TTY, TUI otherwise
itro --headless "<req>" # force headless (also bypasses the "must contain a space" heuristic)
itro --tty "<req>"      # force TUI even without a TTY (mainly for testing the failure path)
itro --yes "<req>"      # pre-approve any risk level in headless
```

Flags are stripped by a small pre-dispatcher in `src/index.ts` before the existing
switch; combinable in any order.

## 5. Architecture

### Module layout

```
src/index.ts                  MODIFY: pre-dispatcher strips flags, routes to runHeadless
                                       on the one-shot path when (auto-detected || --headless)
                                       and not --tty
src/headless/runHeadless.ts   NEW: orchestrates the chat loop; reuses src/logic/llm.ts and
                                   src/tools/bash.tsx without importing anything Ink-related
src/headless/transcript.ts    NEW: write{Command,Output,Refusal,Risk,Answer,Error}; routes
                                   between stdout/stderr; strips the existing `out:\t` /
                                   `err:\t` prefixes that BashTool emits internally
```

Two new files, one modification. **Zero touches** to `src/components/`,
`src/screens/`, or any existing Ink code.

The `out:\t` / `err:\t` prefixes that `executeBashCommand` writes
(`src/tools/bash.tsx:226-228`) are kept on the **model-facing** transcript (the
model needs to disambiguate the streams across turns) and stripped on the
**user-facing** output (out → stdout, err → stderr).

### Data flow (one request → exit)

1. `src/index.ts` parses flags, checks `!stdin.isTTY` (or `--headless`), routes to
   `runHeadless({ request, yes })`.
2. `runHeadless` checks `isEulaAgreed(settings)` — if false, abort per §3.
3. Load the default provider via existing `src/logic/provider.ts`. If missing,
   stderr message pointing to `itro provider add` (interactive only), exit `1`.
4. Conversation seeded with the user message; tool registry = `[bashTool]`.
5. Loop until the model returns no tool calls:
   - Call LLM (`src/logic/llm.ts`).
   - If the response has assistant text → write `Answer: <text>` to stdout (only
     the final one survives if the model spreads commentary across turns;
     intermediate text written immediately).
   - For each tool call (parsed via existing `ModelInputSchema`):
     - `$ <command>` → stdout · `[risk: <level>, tags: …]` → stderr.
     - If `riskLevel ∈ {Dangerous, Extremely Dangerous}` and not `--yes`: refusal
       → stderr, **exit 2** (no further turns).
     - Else call `bashTool.execute(modelInput, { approved: true })`; split output
       by line on the `out:\t` / `err:\t` prefix and route to the right stream.
     - Append the model-facing transcript (with prefixes intact) to conversation.

### Error handling

| Source | Where | Exit |
|---|---|---|
| EULA not accepted | stderr | `1` |
| No default provider configured | stderr (with hint) | `1` |
| LLM auth / rate-limit / network | stderr (provider message verbatim) | `1` |
| Tool execution error (process error) | already encoded by bash.tsx; surfaces as `err:` lines + non-zero exit code in the transcript | `0` (model loop continues) |
| Risk-gate refusal | stderr | `2` |
| Unexpected exception | stderr (`itro: internal error: <msg>`, stack only with `DEBUG=1`) | `1` |

### Open assumption

`src/logic/llm.ts` is assumed to expose a request/response API that returns
assistant text + structured tool calls without requiring an Ink-rendering surface
or React state. If that turns out to be wrong, runHeadless will need a thin
adapter (still small) and §5 must be re-opened.

## 6. Architectural decision: A vs B

Two approaches were weighed:

- **A. Thin parallel headless path.** New `src/headless/` module that reuses
  `logic/llm.ts` and `tools/bash.tsx` directly, with zero Ink imports. The chat
  loop is duplicated (small) but isolated. Existing TUI code is untouched.
- **B. Extract a UI-agnostic `chatLoop` core.** Pull the loop out of
  `runChatScreen` into a shared module; `runChatScreen` becomes an Ink wrapper,
  `runHeadless` becomes a plain-text wrapper. No duplication, larger diff.

**Decision: A. No future migration to B planned.** Justification:

1. Upstream is actively maintained — keeping interactive code untouched makes
   future merges painless.
2. The chat loop is small enough that the duplication cost is real but bounded.
3. Smallest reversible change; lowest PR risk.
4. The "extract a core" refactor is only worth doing if a third UI mode ever
   appears, and YAGNI.

## 7. Testing

All tests live under `tests/headless/`. Existing harness reused: `vitest` +
`memfs` (already a dev dep). Ink testing library is **not** needed — the headless
path imports zero Ink.

| Test | Mechanism |
|---|---|
| Risk-gate matrix | Table-driven: every `RiskLevel` × `{--yes, no --yes}` → asserted exit code & stream routing |
| Multi-turn loop | Mocked LLM returning scripted sequences (tool call → tool call → text); assert transcript order |
| EULA not accepted | `memfs` settings missing `eulaAgreed`; assert stderr message + exit 1 |
| No default provider | Provider config missing; assert hint message + exit 1 |
| LLM provider error | Mock LLM throws auth / rate-limit; assert stderr passthrough + exit 1 |
| Output stream split | Tool output mixing `out:` / `err:` lines → stdout/stderr routed correctly; prefixes stripped |
| Flag parsing | `--yes`, `--headless`, `--tty` in any order; recognized & stripped before dispatch |
| Detection routing | `isTTY=false` → headless; `--tty` overrides; `--headless` forces even with `isTTY=true` |
| Tool exec failure | Tool returns non-zero exit code → loop continues, transcript shows code, final exit 0 |
| Unexpected exception | Internal throw → stderr `itro: internal error: <msg>`, stack only with `DEBUG=1`, exit 1 |

Capture stdout/stderr via `vi.spyOn(process.stdout, 'write')` and
`process.stderr` — the standard pattern. No new test infra.

## 8. Success criteria

1. From Claude Code's Bash tool: `itro 'list files'` prints output and exits 0 —
   no Ink crash.
2. From Claude Code: `itro 'rm -rf /tmp/foo'` prints a refusal on stderr and
   exits 2.
3. From Claude Code: `itro --yes 'rm -rf /tmp/foo'` runs the command (exit 0 on
   success, otherwise the command's own exit propagates).
4. In a real terminal: `itro 'list files'` is byte-for-byte identical to today's
   behavior (TUI unchanged).
5. `bun run test` passes; the new `tests/headless/` suite is green.
6. No new top-level dependencies added (Ink stays in TUI imports only).

## 9. Implementation slicing

Three local feature branches off `main`, each merged back into local `main` when
complete. **No GitHub interaction at all** in this design — no `gh pr`, no push.

| # | Branch | Content |
|---|---|---|
| 1 | `feat/headless-flags` | `tty.ts` + flag parsing + dispatcher routing in `src/index.ts`, behind `--headless` only (no auto-detect yet). Plumbing only, no behavior change. |
| 2 | `feat/headless-runner` | `runHeadless.ts` + `transcript.ts` + risk gate + EULA / provider checks. End-to-end works under `--headless`. |
| 3 | `feat/headless-autodetect` | `!stdin.isTTY` auto-routing, `--tty` override, full test suite. |

Each merged via `hug mkeep <branch>` so the merge commit preserves the slicing in
history. We can decide later whether/when to push or open PRs upstream.
