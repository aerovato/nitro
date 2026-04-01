import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { APP_DATA_DIR, ensureAppDataDir } from "./config";
import { NonSystemModelMessage } from "../hooks/useChatState";

export const CHATS_DIR = join(APP_DATA_DIR, "chats");
export const STATE_FILE = join(APP_DATA_DIR, "state.json");

export const ConversationSchema = z.object({
  messages: z.array(z.any()),
});

export const StateFileSchema = z.object({
  lastConversation: z.string().nullable().default(null),
});

export type Conversation = z.infer<typeof ConversationSchema>;
export type StateFile = z.infer<typeof StateFileSchema>;

export function ensureChatsDir(): void {
  ensureAppDataDir();
  if (!existsSync(CHATS_DIR)) {
    mkdirSync(CHATS_DIR, { mode: 0o700 });
  }
  chmodSync(CHATS_DIR, 0o700);
}

function generateRandomHex(): string {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
}

function generateConversationFilename(): string {
  const timestamp = Date.now();
  let filename = `${timestamp}.json`;
  let attempts = 0;
  const maxAttempts = 10;

  while (existsSync(join(CHATS_DIR, filename))) {
    if (attempts >= maxAttempts) {
      return filename;
    }
    filename = `${timestamp}-${generateRandomHex()}.json`;
    attempts++;
  }

  return filename;
}

function loadStateFile(): StateFile {
  if (!existsSync(STATE_FILE)) {
    return StateFileSchema.parse({});
  }
  try {
    const content = readFileSync(STATE_FILE, "utf-8");
    const parsed: unknown = JSON.parse(content);
    return StateFileSchema.parse(parsed);
  } catch {
    return StateFileSchema.parse({});
  }
}

function saveStateFile(state: StateFile): void {
  const content = JSON.stringify(state, null, 2);
  writeFileSync(STATE_FILE, content, { mode: 0o600 });
}

export function saveConversation(
  messages: NonSystemModelMessage[],
  existingFilename?: string,
): string {
  ensureChatsDir();

  const filename = existingFilename ?? generateConversationFilename();
  const filepath = join(CHATS_DIR, filename);

  if (!existingFilename && existsSync(filepath)) {
    console.error("Error: Failed to create a new conversation file.");
    process.exit(1);
  }

  const conversation: Conversation = { messages };

  try {
    writeFileSync(filepath, JSON.stringify(conversation, null, 2), {
      mode: 0o600,
    });
  } catch (error) {
    console.error(`Error: Failed to save conversation: ${error as Error}`);
    process.exit(1);
  }

  try {
    saveStateFile({ lastConversation: filename });
  } catch (error) {
    console.error(`Error: Failed to update state file: ${error as Error}`);
    process.exit(1);
  }

  return filename;
}

export function loadConversation(filename: string): Conversation | null {
  const filepath = join(CHATS_DIR, filename);
  if (!existsSync(filepath)) {
    return null;
  }
  try {
    const content = readFileSync(filepath, "utf-8");
    const parsed: unknown = JSON.parse(content);
    return ConversationSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function getLastConversationFilename(): string | null {
  const state = loadStateFile();
  return state.lastConversation;
}

export function loadLastConversation(): Conversation | null {
  const filename = getLastConversationFilename();
  if (!filename) {
    return null;
  }
  return loadConversation(filename);
}
