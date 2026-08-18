---
description: Main shared codebase map for the `nitro` project; lists code files and directories with short descriptions.
read_if: Before navigating or searching the codebase; before deciding where new code belongs.
---

# Shared Project Index

## Architecture

- `nitro` is a TypeScript CLI that compiles natural language into shell commands via an LLM agent loop.
- Hybrid router in `src/index.ts`; only files in `src/screens/` call Ink `render()`.
- `runAgentTurn()` in `src/logic/agent.ts` owns the full model/tool loop as a pure async generator; React consumes events, never controls tool sequencing.
- Tools are plain React-free definitions (`defineTool()` in `src/tools/`); result rendering is owned by `src/components/ToolResultDisplay.tsx`.
- Update this index every time you create or significantly modify a file. Split large sections into subindexes in this directory and record them below.

## Subindexes

- None yet.

## Project Index

### Directory Structure

- `src/` — TypeScript source code (main codebase)
- `tests/` — Unit tests and interactive UI tests (Vitest)
- `__mocks__/` — Test mocks (memfs for node:fs)
- `scripts/` — Release automation
- `package.json` — Ditto
- `tsconfig.json` — Ditto
- `eslint.config.js` — Ditto
- `vitest.config.ts` — Ditto
- `dist/` — Compiled output (generated)

### `src/` — TypeScript source code (main codebase)

#### Entry / Top Level

- `src/index.ts` — Entry point and hybrid CLI router
- `src/utils.ts` — Utility functions incl. `transformInput()`
- `src/colors.ts` — Terminal-native semantic color names
- `src/eula.ts` — EULA version and text

#### `src/logic/` — Non-UI logic

- `src/logic/agent.ts` — Async generator agent and tool loop
- `src/logic/config.ts` — Configuration management
- `src/logic/conversation.ts` — Conversation persistence
- `src/logic/defaultProviders.ts` — Default provider templates and model fetching
- `src/logic/environment.ts` — Workspace snapshot (cwd + ls) for user messages
- `src/logic/llm.ts` — LLM communication
- `src/logic/provider.ts` — Provider management
- `src/logic/settings.ts` — Settings management
- `src/logic/updateCheck.ts` — NPM update check on startup

#### `src/components/` — Reusable UI pieces (never call render())

- `src/components/ChatConfigContext.tsx` — Chat config Context (provider, settings, systemPrompt)
- `src/components/Message.tsx` — Bordered assistant and tool-result message layout
- `src/components/TokenUsageContext.tsx` — Token usage tracking context
- `src/components/ToolDisplay.tsx` — Pending tool prompt renderer
- `src/components/ToolResultDisplay.tsx` — Tool result validation and rendering
- `src/components/index.ts` — Component exports
- `src/components/custom/` — Custom Ink components (`CustomSelect.tsx`, `CustomTextInput.tsx`, `index.tsx` exports)
- `src/components/ask/` — AskUser components (`AskPrompt.tsx` question orchestrator, `Question.tsx` single question selector)
- `src/components/bash/BashPrompt.tsx` — Bash command approval UI

#### `src/screens/` — Screens (only files that call render())

- `src/screens/ChatScreen.tsx` — Chat screen
- `src/screens/EulaScreen.tsx` — EULA agreement screen
- `src/screens/SettingsScreen.tsx` — Settings screen
- `src/screens/ProviderRouter.ts` — Provider subcommand router
- `src/screens/ProviderRouterScreen.tsx` — Provider subcommand selection screen
- `src/screens/ProviderListScreen.tsx` — List providers screen
- `src/screens/ProviderDefaultScreen.tsx` — Set default provider screen
- `src/screens/ProviderRemoveScreen.tsx` — Remove provider screen
- `src/screens/ProviderAddScreen/` — Add provider screen (`index.tsx` main component, `types.ts` step types and helpers)
- `src/screens/ProviderEditScreen/` — Edit provider screen (`index.tsx`, `types.ts`)

#### `src/hooks/`

- `src/hooks/useChatState.ts` — Agent event consumer and chat UI state
- `src/hooks/useProviderAddState.ts` — Provider add screen state management
- `src/hooks/useProviderEditState.ts` — Provider edit screen state management

#### `src/tools/` — Agent tool definitions (React-free)

- `src/tools/tool.ts` — Plain tool definition and shared helpers (`ToolPromptProps`)
- `src/tools/ask.ts` — AskUser tool definition
- `src/tools/bash.ts` — Bash tool definition and execution safety guard
- `src/tools/index.ts` — Tool exports, `createToolSet`

### `tests/` — Unit tests and interactive UI tests (Vitest)

- `tests/agent.test.ts` — Async generator agent and tool loop tests
- `tests/bash.test.tsx` — Bash prompt component tests
- `tests/cli.test.ts` — CLI routing tests
- `tests/config.test.ts` — Config module tests
- `tests/conversation.test.ts` — Conversation persistence tests
- `tests/environment.test.ts` — Workspace snapshot tests
- `tests/llm.test.ts` — Integration tests for LLM module
- `tests/message.test.tsx` — Semantic message turn spacing tests
- `tests/provider.test.ts` — Provider module tests
- `tests/providers.test.tsx` — Provider screens tests
- `tests/question.test.tsx` — AskPrompt component tests
- `tests/settings.test.tsx` — Settings screen component tests
- `tests/utils.tsx` — Test utilities for Ink testing
- `tests/ui/` — Interactive UI test scripts (`BashPromptTest.tsx`, `AskPromptTest.tsx`)

### `__mocks__/` — Test mocks

- `__mocks__/fs.cjs` — memfs mock for node:fs

### `scripts/` — Release automation

- `scripts/release.sh` — Bump version, create tag, and push release

## Misc Files (Configs, meta, etc.)

- `README.md` — Project README
- `AGENTS.md` — Agent instructions; points to the Operator partitions
