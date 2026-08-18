# Shared Operator Instructions

## Rules

- Build target is Node, **not** Bun (users don't install Bun). Use standard Node utilities, never Bun-specific APIs.
- Run tests with `bun run test`, **never** `bun test` (Bun's built-in runner is incompatible with vitest mocks).
- Only files in `src/screens/` may call Ink's `render()`.
- Use `<CustomTextInput>`/`<CustomSelect>` instead of Ink's built-in input components.
- Tool prompt components must follow the `ToolPromptProps` standard defined in `src/tools/tool.ts`.
- Tool files must have no React dependencies; result rendering is owned by `ToolResultDisplay.tsx`.
- Keep logic out of UI: business logic lives in `src/logic/`.

## Private / Shared Policy

- Shared here: main project index (`index/`), project-wide rules and style guides.
- Do not reference private files, paths, or private-only content here.
