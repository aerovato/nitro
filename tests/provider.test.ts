import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fs, vol } from "memfs";
import {
  listProviders,
  getProvider,
  getDefaultProvider,
  setDefaultProvider,
  setProvider,
  removeProvider,
  AUTH_FILE,
} from "../src/logic/provider";
import { APP_DATA_DIR } from "../src/logic/config";
import type { ProviderInfo } from "../src/logic/provider";

interface AuthFile {
  defaultProvider: string | null;
  providers: Record<string, ProviderInfo>;
}

vi.mock("node:fs");
vi.mock("node:os", () => ({
  homedir: () => "/home/testuser",
}));

const testProvider = {
  baseURL: "https://api.openai.com/v1",
  apiKey: "test-key",
  model: "gpt-4",
  apiType: "openai-compatible" as const,
};

beforeEach(() => {
  vol.reset();
  fs.mkdirSync("/home/testuser", { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("listProviders", () => {
  it("returns empty array when no providers exist", () => {
    const providers = listProviders();
    expect(providers).toEqual([]);
  });

  it("returns provider names when providers exist", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        defaultProvider: "openai",
        providers: {
          openai: testProvider,
        },
      }),
    );

    const providers = listProviders();
    expect(providers).toEqual(["openai"]);
  });
});

describe("getProvider", () => {
  it("returns undefined when provider does not exist", () => {
    const provider = getProvider("nonexistent");
    expect(provider).toBeUndefined();
  });

  it("returns provider info when provider exists", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        defaultProvider: "openai",
        providers: {
          openai: testProvider,
        },
      }),
    );

    const provider = getProvider("openai");
    expect(provider).toEqual(testProvider);
  });
});

describe("getDefaultProvider", () => {
  it("returns undefined when no default provider is set", () => {
    const provider = getDefaultProvider();
    expect(provider).toBeUndefined();
  });

  it("returns undefined when default provider is set but provider does not exist", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        defaultProvider: "nonexistent",
        providers: {},
      }),
    );

    const provider = getDefaultProvider();
    expect(provider).toBeUndefined();
  });

  it("returns default provider info when set and exists", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        defaultProvider: "openai",
        providers: {
          openai: testProvider,
        },
      }),
    );

    const provider = getDefaultProvider();
    expect(provider).toEqual({ ...testProvider, name: "openai" });
  });
});

describe("setDefaultProvider", () => {
  it("returns false when provider does not exist", () => {
    const result = setDefaultProvider("nonexistent");
    expect(result).toBe(false);
  });

  it("sets default provider and returns true when provider exists", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        defaultProvider: null,
        providers: {
          openai: testProvider,
        },
      }),
    );

    const result = setDefaultProvider("openai");
    expect(result).toBe(true);

    const content = fs.readFileSync(AUTH_FILE, "utf-8") as string;
    const auth = JSON.parse(content) as AuthFile;
    expect(auth.defaultProvider).toBe("openai");
  });
});

describe("setProvider", () => {
  it("adds a new provider", () => {
    setProvider("openai", testProvider);

    const content = fs.readFileSync(AUTH_FILE, "utf-8") as string;
    const auth = JSON.parse(content) as AuthFile;
    expect(auth.providers.openai).toEqual(testProvider);
  });

  it("updates an existing provider", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        defaultProvider: null,
        providers: {
          openai: testProvider,
        },
      }),
    );

    const updatedProvider = { ...testProvider, model: "gpt-4-turbo" };
    setProvider("openai", updatedProvider);

    const content = fs.readFileSync(AUTH_FILE, "utf-8") as string;
    const auth = JSON.parse(content) as AuthFile;
    expect(auth.providers.openai?.model).toBe("gpt-4-turbo");
  });

  it("saves file with 600 permissions", () => {
    setProvider("openai", testProvider);

    const stats = fs.statSync(AUTH_FILE);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe("removeProvider", () => {
  it("returns false when provider does not exist", () => {
    const result = removeProvider("nonexistent");
    expect(result).toBe(false);
  });

  it("removes default provider and sets defaultProvider to null", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        defaultProvider: "openai",
        providers: {
          openai: testProvider,
        },
      }),
    );

    const result = removeProvider("openai");
    expect(result).toBe(true);

    const content = fs.readFileSync(AUTH_FILE, "utf-8") as string;
    const auth = JSON.parse(content) as AuthFile;
    expect(auth.providers.openai).toBeUndefined();
    expect(auth.defaultProvider).toBeNull();
  });

  it("removes provider and returns true when provider exists and is not default", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        defaultProvider: "openai",
        providers: {
          openai: testProvider,
          anthropic: {
            baseURL: "https://api.anthropic.com",
            apiKey: "anthropic-key",
            model: "claude-3",
            apiType: "anthropic",
          },
        },
      }),
    );

    const result = removeProvider("anthropic");
    expect(result).toBe(true);

    const content = fs.readFileSync(AUTH_FILE, "utf-8") as string;
    const auth = JSON.parse(content) as AuthFile;
    expect(auth.providers.anthropic).toBeUndefined();
    expect(auth.providers.openai).toBeDefined();
  });
});
