<p align="center">
  <img src="https://raw.githubusercontent.com/aerovato/nitro/main/.github/README/banner.jpg" alt="Nitro Banner" />
</p>

#### Nitro: A tiny and efficient harness for running Bash commands.

## Quickstart

1. Install Nitro:

   ```bash
   npm install -g @aerovato/nitro
   ```

2. Add a provider:

   ```bash
   nitro provider add
   ```

3. Run your first command:
   ```bash
   nitro "find all TS and TSX files and count total lines"
   nitro "summarize how the Bash tool is implemented src/tools/bash.tsx"
   nitro "read the README and setup the project for development"
   ```

## Usage

```bash
nitro "<request>"              # Execute request and exit

nitro interactive [request]    # Start interactive session
nitro i [request]              # (shorthand)

nitro continue <request>       # Continue last conversation
nitro c <request>              # (shorthand)

nitro resume [request]         # Resume last conversation interactively
nitro r [request]

nitro strict [request]         # Run in strict mode (always confirm commands)
nitro s [request]

nitro provider add             # Add a new provider
nitro provider list            # List all providers
nitro provider edit            # Edit a provider
nitro provider remove          # Remove a provider
nitro provider default         # Set default provider

nitro settings                 # Configure Nitro settings
nitro help                     # Print help message
```

## Features

### Command in Natural Language

Nitro translates natural language requests into shell commands.

```bash
# Instead of remembering complex commands:
find . -name "node_modules" -prune -o -name "*.md" -print0 | xargs -0 wc -l | sort -rn | head -n 11

# Just describe what you want:
nitro "find all markdown files except node_modules and count total lines, show top 10"
```

More examples:

```bash
nitro "squash last 5 commits into 1 with message: Bug fix"
nitro "replace 'foo' with 'bar' in all txt files"
nitro "compress input.mov to a smaller mp4 (h264) optimized for smaller file"
nitro "show last 20 commits that modify src/main.ts with author, date, and message"
nitro "get 10 most recent open gh issues with P1 label, show id and title"
```

### Multi-Provider Support

Nitro works with your preferred AI provider:

- OpenAI
- Anthropic
- Z.ai Coding Plan
- Qwen
- DeepSeek
- Mistral
- Groq
- Any OpenAI/Anthropic compatible provider

### Safety Model

Nitro automatically evaluates command risk before execution:

Risk Levels:

- **Read Only**: Safe commands (ls, cat, find). Auto-approved unless in strict mode.
- **Normal**: Low-risk modifications. Requires confirmation.
- **Dangerous**: File deletions, overwrites. Requires confirmation.
- **Extremely Dangerous**: System-wide changes, multiple deletions. Requires confirmation.

Behavior Tags:

- Safe, Reversible, Write, Delete, Overwrite, Side Effects, Exfiltration

Strict mode (`nitro strict`) requires confirmation for all commands including read-only operations.

### Safety Advisory

Nitro executes commands on your system. Only use Nitro on code and projects you trust.

- Do not use Nitro on untrusted codebases
- Always review commands before approving
- Keep backups of important data

## Customization

Run `nitro settings` to configure:

- **alwaysConfirm**: Require confirmation for all commands
- **showThinking**: Display AI reasoning for supported models
- **maxOutputTokens**: Maximum output tokens per response
- **reasoningEffort**: Reasoning effort level

To customize the system prompt body, create `~/.nitro/system_prompt.md`.

- The default system prompt body can be found in `~/.nitro/system_prompt_template.md`

## Configuration

Nitro stores configuration in `~/.nitro/`:

- `settings.json` - User settings
- `auth.json` - Provider configuration & authentication
- `system_prompt.md` - Custom system prompt (optional)

## Uninstalling

```bash
npm uninstall -g @aerovato/nitro
rm -rf ~/.nitro
```
