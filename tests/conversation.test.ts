import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fs, vol } from "memfs";
import {
  saveConversation,
  loadConversation,
  getLastConversationFilename,
  loadLastConversation,
  CHATS_DIR,
  STATE_FILE,
} from "../src/logic/conversation";
import { APP_DATA_DIR } from "../src/logic/config";

vi.mock("node:fs");
vi.mock("node:os", () => ({
  homedir: () => "/home/testuser",
}));

const mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit");
});

beforeEach(() => {
  vol.reset();
  fs.mkdirSync("/home/testuser", { recursive: true });
  mockProcessExit.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveConversation", () => {
  it("saves conversation with timestamp filename", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];

    const filename = saveConversation(messages);

    expect(filename).toMatch(/^\d+\.json$/);
    expect(fs.existsSync(`${CHATS_DIR}/${filename}`)).toBe(true);
    const content = fs.readFileSync(
      `${CHATS_DIR}/${filename}`,
      "utf-8",
    ) as string;
    expect(JSON.parse(content)).toEqual({ messages });
  });

  it("saves conversation with random suffix if file exists", () => {
    const fixedTimestamp = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(fixedTimestamp);
    fs.mkdirSync(CHATS_DIR, { recursive: true });
    fs.writeFileSync(`${CHATS_DIR}/${fixedTimestamp}.json`, "{}");

    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];

    const filename = saveConversation(messages);

    expect(filename).toMatch(/^1700000000000-[a-f0-9]{8}\.json$/);
    vi.restoreAllMocks();
  });

  it("updates state file with lastConversation", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];

    const filename = saveConversation(messages);

    expect(fs.existsSync(STATE_FILE)).toBe(true);
    const content = fs.readFileSync(STATE_FILE, "utf-8") as string;
    expect(JSON.parse(content)).toEqual({ lastConversation: filename });
  });

  it("saves file with 600 permissions", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];

    const filename = saveConversation(messages);

    const stats = fs.statSync(`${CHATS_DIR}/${filename}`);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("creates chats directory with 700 permissions", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];

    saveConversation(messages);

    expect(fs.existsSync(CHATS_DIR)).toBe(true);
    const stats = fs.statSync(CHATS_DIR);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o700);
  });

  it("saves to existing filename when provided", () => {
    const messages1 = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi!" },
    ];

    const filename = saveConversation(messages1);
    expect(filename).toMatch(/^\d+\.json$/);

    const messages2 = [
      ...messages1,
      { role: "user" as const, content: "How are you?" },
      { role: "assistant" as const, content: "Good!" },
    ];

    const filename2 = saveConversation(messages2, filename);

    expect(filename2).toBe(filename);
    const content = fs.readFileSync(
      `${CHATS_DIR}/${filename}`,
      "utf-8",
    ) as string;
    expect(JSON.parse(content)).toEqual({ messages: messages2 });
  });

  it("returns same filename on subsequent saves", () => {
    const messages1 = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi!" },
    ];

    const filename1 = saveConversation(messages1);

    const messages2 = [
      ...messages1,
      { role: "user" as const, content: "Bye" },
      { role: "assistant" as const, content: "Goodbye!" },
    ];

    const filename2 = saveConversation(messages2, filename1);

    expect(filename2).toBe(filename1);
    const files = fs.readdirSync(CHATS_DIR) as string[];
    expect(files.length).toBe(1);
  });
});

describe("loadConversation", () => {
  it("returns null when file does not exist", () => {
    const result = loadConversation("nonexistent.json");
    expect(result).toBeNull();
  });

  it("loads conversation from file", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];
    fs.mkdirSync(CHATS_DIR, { recursive: true });
    fs.writeFileSync(`${CHATS_DIR}/test.json`, JSON.stringify({ messages }));

    const result = loadConversation("test.json");

    expect(result).toEqual({ messages });
  });

  it("returns null for invalid JSON", () => {
    fs.mkdirSync(CHATS_DIR, { recursive: true });
    fs.writeFileSync(`${CHATS_DIR}/invalid.json`, "not json");

    const result = loadConversation("invalid.json");

    expect(result).toBeNull();
  });
});

describe("getLastConversationFilename", () => {
  it("returns null when state file does not exist", () => {
    const result = getLastConversationFilename();
    expect(result).toBeNull();
  });

  it("returns null when lastConversation is null", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastConversation: null }));

    const result = getLastConversationFilename();

    expect(result).toBeNull();
  });

  it("returns filename from state file", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ lastConversation: "1699999999999.json" }),
    );

    const result = getLastConversationFilename();

    expect(result).toBe("1699999999999.json");
  });
});

describe("loadLastConversation", () => {
  it("returns null when no last conversation", () => {
    const result = loadLastConversation();
    expect(result).toBeNull();
  });

  it("loads the last conversation", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];
    fs.mkdirSync(CHATS_DIR, { recursive: true });
    fs.writeFileSync(
      `${CHATS_DIR}/1699999999999.json`,
      JSON.stringify({ messages }),
    );
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ lastConversation: "1699999999999.json" }),
    );

    const result = loadLastConversation();

    expect(result).toEqual({ messages });
  });

  it("returns null when conversation file does not exist", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ lastConversation: "nonexistent.json" }),
    );

    const result = loadLastConversation();

    expect(result).toBeNull();
  });
});
