# Conversation Persistence

## Overview

Conversations are persisted to disk to support `nitro continue`.

## Storage

- **Location**: `~/.nitro/chats/<timestamp>.json`
- **Timestamp**: Unix epoch in milliseconds
- **Collision handling**: Append `-<random>` to `<timestamp>` where random is 8-digit hex; try a few times, if fail then exit with error
- **State tracking**: `~/.nitro/state.json` stores `lastConversation` key with the filename

## Save Behavior

- Save triggers only after assistant response completes successfully
- Saves occur in `runTurn()` in `src/hooks/useChatState.ts` after the agent turn completes
- Each conversation session uses one file; subsequent saves overwrite
- `conversationFilename` ref tracks the current file for the session

## Constraints

- System prompts are never stored in saved messages
- Tool messages are preserved for tool call support
- Directory permissions: 700, file permissions: 600
- Fail on any fs error

## Loading

- `getLastConversationFilename()` returns null if no conversation exists; combine with `loadConversation(filename)` to load it
- Invalid JSON in conversation file returns null (graceful degradation)
- State file with missing or null `lastConversation` returns null
