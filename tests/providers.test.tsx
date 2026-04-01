import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "ink-testing-library";
import { ProviderAddScreen } from "../src/screens/ProviderAddScreen";
import { ProviderEditScreen } from "../src/screens/ProviderEditScreen";
import { ProviderRemoveScreen } from "../src/screens/ProviderRemoveScreen";
import { ProviderDefaultScreen } from "../src/screens/ProviderDefaultScreen";
import { ProviderListScreen } from "../src/screens/ProviderListScreen";
import {
  pressArrowAndWaitForFocus,
  pressEnter,
  pressBackspace,
  typeTextAndSubmit,
  waitFor,
  waitForFrameChange,
  waitForText,
} from "./utils";

const mockProviders: Record<
  string,
  { baseURL: string; apiKey: string; model: string; apiType: string }
> = {};

vi.mock("../src/logic/provider", () => ({
  listProviders: () => Object.keys(mockProviders),
  getProvider: (name: string) => mockProviders[name],
  setProvider: (name: string, info: (typeof mockProviders)[string]) => {
    mockProviders[name] = info;
  },
  removeProvider: (name: string) => {
    if (!mockProviders[name]) return false;
    delete mockProviders[name];
    return true;
  },
  setDefaultProvider: vi.fn((name: string) => !!mockProviders[name]),
  getDefaultProvider: () =>
    Object.keys(mockProviders).includes("default-provider")
      ? {
          name: "default-provider",
          ...mockProviders["default-provider"],
        }
      : undefined,
}));

vi.mock("../src/logic/defaultProviders", () => ({
  DEFAULT_PROVIDERS: [
    {
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiType: "openai-responses",
    },
    {
      name: "anthropic",
      baseURL: "https://api.anthropic.com/v1",
      apiType: "anthropic",
    },
  ],
  fetchModels: vi.fn(() => Promise.resolve([])),
}));

describe("ProviderAddScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockProviders) delete mockProviders[key];
  });

  it("renders initial provider selection", () => {
    const { lastFrame } = render(<ProviderAddScreen />);
    expect(lastFrame()).toContain("Select a provider:");
    expect(lastFrame()).toContain("New Custom Provider");
    expect(lastFrame()).toContain("openai");
    expect(lastFrame()).toContain("anthropic");
  });

  it("shows custom provider flow after selecting custom", async () => {
    const { lastFrame, stdin } = render(<ProviderAddScreen />);
    await waitForText(lastFrame, "New Custom Provider");
    pressEnter(stdin);
    await waitForText(lastFrame, "Provider Name:");
  });

  it("shows error for empty name in custom flow", async () => {
    const { lastFrame, stdin } = render(<ProviderAddScreen />);
    await waitForText(lastFrame, "New Custom Provider");
    pressEnter(stdin);
    await waitForText(lastFrame, "Provider Name:");
    pressEnter(stdin);
    await waitForText(lastFrame, "Provider name is required");
  });

  it("reaches API type step with summary in custom flow", async () => {
    const { lastFrame, stdin } = render(<ProviderAddScreen />);

    await waitForText(lastFrame, "New Custom Provider");
    pressEnter(stdin);

    await waitForText(lastFrame, "Provider Name:");
    await typeTextAndSubmit(stdin, lastFrame, "my-provider");

    await waitForText(lastFrame, "Base URL:");
    await typeTextAndSubmit(stdin, lastFrame, "https://api.example.com");

    await waitForText(lastFrame, "API Type:");
    expect(lastFrame()).toContain("Provider Name: my-provider");
    expect(lastFrame()).toContain("Base URL: https://api.example.com");
  });

  it("allows empty API key in custom flow", async () => {
    const { lastFrame, stdin } = render(<ProviderAddScreen />);

    await waitForText(lastFrame, "New Custom Provider");
    pressEnter(stdin);

    await waitForText(lastFrame, "Provider Name:");
    await typeTextAndSubmit(stdin, lastFrame, "test");

    await waitForText(lastFrame, "Base URL:");
    await typeTextAndSubmit(stdin, lastFrame, "https://api.test.com");

    await waitForText(lastFrame, "API Type:");
    pressEnter(stdin);

    await waitForText(lastFrame, "API Key:");
    pressEnter(stdin);

    await waitForText(lastFrame, "Model:");
    expect(lastFrame()).toContain("(none)");
  });

  it("shows error for empty model in custom flow", async () => {
    const { lastFrame, stdin } = render(<ProviderAddScreen />);

    await waitForText(lastFrame, "New Custom Provider");
    pressEnter(stdin);

    await waitForText(lastFrame, "Provider Name:");
    await typeTextAndSubmit(stdin, lastFrame, "test");

    await waitForText(lastFrame, "Base URL:");
    await typeTextAndSubmit(stdin, lastFrame, "https://api.test.com");

    await waitForText(lastFrame, "API Type:");
    pressEnter(stdin);

    await waitForText(lastFrame, "API Key:");
    pressEnter(stdin);

    await waitForText(lastFrame, "Model:");
    pressEnter(stdin);

    await waitForText(lastFrame, "Model is required");
  });

  it("allows selecting different API types in custom flow", async () => {
    const { lastFrame, stdin } = render(<ProviderAddScreen />);

    await waitForText(lastFrame, "New Custom Provider");
    pressEnter(stdin);

    await waitForText(lastFrame, "Provider Name:");
    await typeTextAndSubmit(stdin, lastFrame, "test");

    await waitForText(lastFrame, "Base URL:");
    await typeTextAndSubmit(stdin, lastFrame, "https://api.test.com");

    await waitForText(lastFrame, "API Type:");
    await pressArrowAndWaitForFocus(
      stdin,
      lastFrame,
      "down",
      "OpenAI Responses",
    );
    await pressArrowAndWaitForFocus(stdin, lastFrame, "down", "Anthropic");

    pressEnter(stdin);

    await waitForText(lastFrame, "API Key:");
    await typeTextAndSubmit(stdin, lastFrame, "test-key");

    await waitForText(lastFrame, "Model:");
    await typeTextAndSubmit(stdin, lastFrame, "claude-3");

    await waitFor(() => mockProviders["test"]?.apiType === "anthropic");
    expect(mockProviders["test"]?.apiType).toBe("anthropic");
  });

  it("skips to API key for default provider", async () => {
    const { lastFrame, stdin } = render(<ProviderAddScreen />);

    await waitForText(lastFrame, "openai");
    await pressArrowAndWaitForFocus(stdin, lastFrame, "down", "openai");
    pressEnter(stdin);

    await waitForText(lastFrame, "API Key:");
    expect(lastFrame()).toContain("Provider Name: openai");
    expect(lastFrame()).toContain("Base URL: https://api.openai.com/v1");
    expect(lastFrame()).toContain("API Type: openai-responses");
  });

  it("shows error for duplicate provider name", async () => {
    mockProviders["openai"] = {
      baseURL: "https://existing.example.com",
      apiKey: "existing-key",
      model: "existing-model",
      apiType: "openai-compatible",
    };

    const { lastFrame, stdin } = render(<ProviderAddScreen />);

    await waitForText(lastFrame, "openai");
    await pressArrowAndWaitForFocus(stdin, lastFrame, "down", "openai");
    pressEnter(stdin);

    await waitForText(lastFrame, "already exists");
    expect(lastFrame()).toContain('Provider "openai" already exists');
  });

  it("skips to API key after renaming duplicate preset", async () => {
    mockProviders["openai"] = {
      baseURL: "https://existing.example.com",
      apiKey: "existing-key",
      model: "existing-model",
      apiType: "openai-compatible",
    };

    const { lastFrame, stdin } = render(<ProviderAddScreen />);

    await waitForText(lastFrame, "openai");
    await pressArrowAndWaitForFocus(stdin, lastFrame, "down", "openai");
    pressEnter(stdin);

    await waitForText(lastFrame, "already exists");

    for (let i = 0; i < "openai".length; i++) {
      pressBackspace(stdin);
      await waitForFrameChange(lastFrame);
    }

    await typeTextAndSubmit(stdin, lastFrame, "my-openai");

    await waitForText(lastFrame, "API Key:");
    expect(lastFrame()).toContain("Provider Name: my-openai");
    expect(lastFrame()).toContain("Base URL: https://api.openai.com/v1");
    expect(lastFrame()).toContain("API Type: openai-responses");
  });
});

describe("ProviderEditScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockProviders) delete mockProviders[key];
  });

  it("shows error when no providers configured", () => {
    const { lastFrame } = render(<ProviderEditScreen />);
    expect(lastFrame()).toContain("No providers configured");
  });

  it("shows provider selection when providers exist", () => {
    mockProviders["test-provider"] = {
      baseURL: "https://api.example.com",
      apiKey: "test-key",
      model: "gpt-4",
      apiType: "openai-compatible",
    };
    const { lastFrame } = render(<ProviderEditScreen />);
    expect(lastFrame()).toContain("Select provider to edit:");
  });

  it("completes full edit flow", async () => {
    mockProviders["edit-me"] = {
      baseURL: "https://old.example.com",
      apiKey: "old-key",
      model: "old-model",
      apiType: "openai-compatible",
    };

    const { lastFrame, stdin } = render(<ProviderEditScreen />);

    await waitForText(lastFrame, "edit-me");
    pressEnter(stdin);

    await waitForText(lastFrame, "Current Base URL:");
    await typeTextAndSubmit(stdin, lastFrame, "https://new.example.com");

    await waitForText(lastFrame, "Current API Type:");
    expect(lastFrame()).toContain("Provider: edit-me");
    expect(lastFrame()).toContain("Base URL: https://new.example.com");

    pressEnter(stdin);
    await waitForFrameChange(lastFrame);

    await waitForText(lastFrame, "Current API Key:");
    await typeTextAndSubmit(stdin, lastFrame, "new-key");

    await waitForText(lastFrame, "Current Model:");
    await typeTextAndSubmit(stdin, lastFrame, "new-model");

    await waitForText(lastFrame, "updated");

    expect(lastFrame()).toContain('Provider "edit-me" updated');
    expect(mockProviders["edit-me"]?.baseURL).toBe("https://new.example.com");
    expect(mockProviders["edit-me"]?.model).toBe("new-model");
  });

  it("preserves values when input is empty", async () => {
    mockProviders["preserve-test"] = {
      baseURL: "https://preserve.example.com",
      apiKey: "preserve-key",
      model: "preserve-model",
      apiType: "anthropic",
    };

    const { lastFrame, stdin } = render(<ProviderEditScreen />);

    await waitForText(lastFrame, "preserve-test");
    pressEnter(stdin);
    await waitForFrameChange(lastFrame);
    expect(lastFrame()).toContain("Current Base URL:");

    pressEnter(stdin);
    await waitForFrameChange(lastFrame);
    expect(lastFrame()).toContain("Current API Type:");
    expect(lastFrame()).toContain("Base URL: https://preserve.example.com");
    expect(lastFrame()).toMatch(/❯\s*\(preserve\)/);

    pressEnter(stdin);
    await waitForFrameChange(lastFrame);
    expect(lastFrame()).toContain("Current API Key:");

    pressEnter(stdin);
    await waitForFrameChange(lastFrame);
    expect(lastFrame()).toContain("Current Model:");

    pressEnter(stdin);
    await waitForFrameChange(lastFrame);
    expect(lastFrame()).toContain("updated");

    expect(mockProviders["preserve-test"]?.baseURL).toBe(
      "https://preserve.example.com",
    );
    expect(mockProviders["preserve-test"]?.model).toBe("preserve-model");
    expect(mockProviders["preserve-test"]?.apiType).toBe("anthropic");
  });

  it("selects different providers with arrow keys", async () => {
    mockProviders["provider-a"] = {
      baseURL: "https://a.example.com",
      apiKey: "key-a",
      model: "model-a",
      apiType: "openai-compatible",
    };
    mockProviders["provider-b"] = {
      baseURL: "https://b.example.com",
      apiKey: "key-b",
      model: "model-b",
      apiType: "openai-compatible",
    };

    const { lastFrame, stdin } = render(<ProviderEditScreen />);

    await waitForText(lastFrame, "provider-a");
    await pressArrowAndWaitForFocus(stdin, lastFrame, "down", "provider-b");
    pressEnter(stdin);

    await waitForText(lastFrame, "Current Base URL:");
    expect(lastFrame()).toContain("Provider: provider-b");
    expect(lastFrame()).toContain("https://b.example.com");
  });
});

describe("ProviderRemoveScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockProviders) delete mockProviders[key];
  });

  it("shows error when no providers configured", () => {
    const { lastFrame } = render(<ProviderRemoveScreen />);
    expect(lastFrame()).toContain("No providers configured");
  });

  it("shows provider selection when providers exist", () => {
    mockProviders["remove-me"] = {
      baseURL: "https://api.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };
    const { lastFrame } = render(<ProviderRemoveScreen />);
    expect(lastFrame()).toContain("Select provider to remove:");
  });

  it("shows default provider with green color indicator", () => {
    mockProviders["default-provider"] = {
      baseURL: "https://default.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };
    mockProviders["other-provider"] = {
      baseURL: "https://other.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };

    const { lastFrame } = render(<ProviderRemoveScreen />);
    const frame = lastFrame();

    expect(frame).toContain("default-provider");
  });

  it("removes provider on confirmation", async () => {
    mockProviders["to-remove"] = {
      baseURL: "https://api.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };

    const { lastFrame, stdin } = render(<ProviderRemoveScreen />);

    await waitForText(lastFrame, "to-remove");
    pressEnter(stdin);

    await waitForText(lastFrame, "Remove provider");
    expect(lastFrame()).toContain('Remove provider "to-remove"?');

    pressEnter(stdin);
    await waitForText(lastFrame, "removed");

    expect(lastFrame()).toContain('Provider "to-remove" removed');
    expect(mockProviders["to-remove"]).toBeUndefined();
  });

  it("cancels removal on No selection", async () => {
    mockProviders["stay-here"] = {
      baseURL: "https://api.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };

    const { lastFrame, stdin } = render(<ProviderRemoveScreen />);

    await waitForText(lastFrame, "stay-here");
    pressEnter(stdin);

    await waitForText(lastFrame, "Remove provider");
    await pressArrowAndWaitForFocus(stdin, lastFrame, "down", "No");

    pressEnter(stdin);
    await waitForText(lastFrame, "Cancelled");

    expect(lastFrame()).toContain("Cancelled");
    expect(mockProviders["stay-here"]).toBeDefined();
  });
});

describe("ProviderDefaultScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockProviders) delete mockProviders[key];
  });

  it("shows error when no providers configured", () => {
    const { lastFrame } = render(<ProviderDefaultScreen />);
    expect(lastFrame()).toContain("No providers configured");
  });

  it("shows provider selection when providers exist", () => {
    mockProviders["default-me"] = {
      baseURL: "https://api.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };
    const { lastFrame } = render(<ProviderDefaultScreen />);
    expect(lastFrame()).toContain("Select default provider:");
  });

  it("puts default provider first in list", () => {
    mockProviders["default-provider"] = {
      baseURL: "https://default.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };
    mockProviders["other-provider"] = {
      baseURL: "https://other.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };

    const { lastFrame } = render(<ProviderDefaultScreen />);
    const frame = lastFrame();

    expect(frame).toBeDefined();
    if (!frame) return;

    const defaultIndex = frame.indexOf("default-provider");
    const otherIndex = frame.indexOf("other-provider");

    expect(defaultIndex).toBeLessThan(otherIndex);
  });

  it("shows cancel option at end", () => {
    mockProviders["provider"] = {
      baseURL: "https://api.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };
    const { lastFrame } = render(<ProviderDefaultScreen />);
    const frame = lastFrame();

    expect(frame).toBeDefined();
    if (!frame) return;

    const cancelIndex = frame.indexOf("Cancel");
    const providerIndex = frame.indexOf("provider");

    expect(cancelIndex).toBeGreaterThan(providerIndex);
  });

  it("cancels when Cancel is selected", async () => {
    mockProviders["provider"] = {
      baseURL: "https://api.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };

    const { lastFrame, stdin } = render(<ProviderDefaultScreen />);

    await waitForText(lastFrame, "Cancel");
    await pressArrowAndWaitForFocus(stdin, lastFrame, "down", "Cancel");

    pressEnter(stdin);
    await waitForText(lastFrame, "Cancelled");

    expect(lastFrame()).toContain("Cancelled");
  });

  it("sets default provider on selection", async () => {
    mockProviders["new-default"] = {
      baseURL: "https://api.example.com",
      apiKey: "key",
      model: "model",
      apiType: "openai-compatible",
    };

    const { lastFrame, stdin } = render(<ProviderDefaultScreen />);

    await waitForText(lastFrame, "new-default");
    pressEnter(stdin);

    await waitForText(lastFrame, "Default provider set");
    expect(lastFrame()).toContain('Default provider set to "new-default"');
  });
});

describe("ProviderListScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockProviders) delete mockProviders[key];
  });

  it("lists providers with censored API keys", () => {
    mockProviders["my-provider"] = {
      baseURL: "https://api.example.com",
      apiKey: "sk-1234567890abcdefghijklmnopqrstuvwxyz",
      model: "gpt-4",
      apiType: "openai-compatible",
    };

    const { lastFrame } = render(<ProviderListScreen />);
    const frame = lastFrame();

    expect(frame).toContain("my-provider");
    expect(frame).toContain("Base URL:https://api.example.com");
    expect(frame).toContain("API Key:sk-12*****vwxyz");
    expect(frame).toContain("Model:gpt-4");
    expect(frame).toContain("API Type:openai-compatible");
  });

  it("shows no providers message when empty", () => {
    const { lastFrame } = render(<ProviderListScreen />);
    const frame = lastFrame();

    expect(frame).toContain("No providers configured");
  });
});
