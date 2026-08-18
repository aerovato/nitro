# Shared Partition Catalog

## Tree

- `operator.md`
  - Description: Operator Instructions for this partition (project-wide workflow, rules, style, share policy).
  - Read If: Auto-injected.
- `catalog.md`
  - Description: This catalog.
  - Read If: Auto-injected.
- `README.md`
  - Description: Operator Memory README for collaborators.
  - Read If: New collaborator onboarding.

### `specs/` — System contracts

- `architecture.md`
  - Description: System architecture: stack, CLI app structure, screens/components/hooks/logic, agent loop, config, testing conventions.
  - Read If: Before any feature work; when deciding where code belongs.
- `safety.md`
  - Description: Safety model: risk levels, behavior tags, confirmation rules, strict mode, graded examples.
  - Read If: Changing risk evaluation, approval flow, or command labeling.
- `tools.md`
  - Description: Agent tools (AskUser, Bash): inputs, outputs, approval flow, usage defaults.
  - Read If: Changing tool definitions, prompts, or tool I/O.
- `commands.md`
  - Description: CLI commands and routing rules (request, continue, strict, settings, provider).
  - Read If: Adding or changing CLI commands or router behavior.
- `persistence.md`
  - Description: Conversation persistence contract: storage, save behavior, constraints, loading.
  - Read If: Changing conversation save/load or state tracking.
