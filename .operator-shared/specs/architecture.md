# Architecture

TypeScript

- Bun as our build tool
- Node as our build target (don't force users to install Bun)
  - Use standard Node utilities, **not** Bun.
- Distribute package on NPM
- Use standard Node CLI utilities for CLI interaction

Commands:
`bun run lint` - Lint & Typecheck
`bun run test` - Run tests using vitest

Note: A standalone typecheck script is not available.

## CLI App

Hybrid router pattern in `src/index.ts`:

- Parse command-line arguments
- Route to appropriate handler based on command/subcommand
- Non-interactive commands use `console.log` directly without rendering (help)
- Interactive commands run screen component functions (which call render())
- Only files in `src/screens/` may call Ink's `render()`; screens call it directly

### Screens

Only files in `src/screens/` call `render()`.

- Each screen is an isolated React application
- Single `render()` call per screen
- Multi-step flows use state machines, not sequential renders
- All previous output persists (no replacement)

State management:

- State is local to each screen
- No global state store
- Screen handles its own lifecycle

### Components

Files in `src/components/` are reusable UI pieces.

- Components may not call `render()` by themselves
- Render JSX only, receive props and callbacks
- Parent screens control rendering

Custom components:

- Instead of ink's built-in input components, always use `<CustomTextInput>` and `<CustomSelect>` from `src/components/custom/`

Tool Prompt Components:

- All tool prompt components (AskPrompt, BashPrompt) must follow the `ToolPromptProps` standard
- Props: `{ modelInput: TModelInput, onSubmit: (userInput: TUserInput) => void }`
- `modelInput`: Data from the LLM's tool call
- `onSubmit`: Callback to submit user's response/approval
- Defined in `src/tools/tool.ts`

### Hooks

Hooks are stored in `src/hooks/`

- `useChatState` drives the agent generator and folds its events into UI state

### Logic

Logic is stored in `src/logic/`.

- Prefer to keep logic separate from UI

### Agent Loop

- `runAgentTurn()` in `src/logic/agent.ts` owns the complete model and tool loop
- It is a pure async generator with no React dependencies
- It yields streaming, tool prompt, tool execution, tool result, and usage events
- Tool prompt responses are passed back through `generator.next(userInput)`
- Tools are validated and executed only by the agent loop
- React consumes events; it does not control tool sequencing or execution

### Tools

- Tools are plain definitions created with `defineTool()`
- Tool definitions contain schemas, execution, and optional approval metadata
- Tool files have no React dependencies
- Tool result rendering is owned by `src/components/ToolResultDisplay.tsx`

## Agent

The agent is responsible for:

- Generating the desired commands
- Assigning risk levels and behavioral tags
- Providing an explanation for the command

## Model Selection

Use AI SDK for AI functionality

- Support all providers
  - OpenAI compatible
  - OpenAI Responses
  - Anthropic

## Configuration

User configuration will be stored in `~/.nitro`

- Settings are stored in `settings.json`
- System prompt:
  - Automatically appended to the base system prompt
  - `system_prompt.md`

Settings:

- `alwaysConfirm`: Prompts the user to confirm all commands, even safe ones.
- `showCommandOutput`: Display command output in the chat (commands are always shown).
- `showThinking`: Show thinking or think summary for models that support it.
- `showTokenSummary`: Display token usage summary on session exit.
- `maxOutputTokens`: Maximum output tokens for model responses.
- `reasoningEffort`: How much the model reasons before responding (low/medium/high).
- `setupCompleted`: Whether the initial setup has been completed.

Permissions:

- Directory should be 700, all files should be 600.

## Testing

- Use Vitest for testing
- Use memfs for mocking file system operations
- Run tests with `bun run test`, NOT `bun test`
  - `bun test` uses Bun's built-in test runner (incompatible with vitest mocks)
  - `bun run test` executes the npm script which runs vitest

### Ink Screen Testing

Notes

- Ink screens can exit immediately after a state change, so the final confirmation frame may not be captured by the test renderer even when state updates succeed
- To check final confirmations, check for state changes
- If not possible; ignore checking final confirmation

Pitfalls

- `ink-text-input` submits the current `value` prop on Enter. If Enter is sent before the typed value is rendered, the handler receives stale input.
- Arrow key focus updates can be flaky for CustomSelect elements if the select has not fully rendered or the focus marker is not yet visible.
- ANSI styling in frames can break naive string matching in tests; if ANSI, use regexes to match or remove all non-alphanumeric characters

Strategies

- Prefer deterministic waits on observable UI state (typed text or visible labels) instead of fixed timeouts.
- For selects, wait for the focused marker to move before pressing Enter.
- If the UI may exit immediately after a state change, assert on underlying state changes instead of final frame text.

Helper Patterns

- `waitForText` should accept `string | RegExp` and normalize frames by removing ANSI escapes.
- `typeTextAndSubmit` should wait until typed input is visible before submitting.
