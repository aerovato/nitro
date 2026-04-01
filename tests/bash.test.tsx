import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { render } from "ink-testing-library";
import { BashPrompt } from "../src/components/bash/BashPrompt";
import { ChatConfigContext } from "../src/components/ChatConfigContext";
import type { ChatConfig } from "../src/components/ChatConfigContext";
import {
  pressArrow,
  pressEnter,
  typeText,
  waitForText,
  waitFor,
} from "./utils";
import type { BashModelInput } from "../src/tools/bash";

const mockExit = vi.fn();

vi.mock("ink", async () => {
  const actual = await vi.importActual("ink");
  return {
    ...actual,
    useApp: () => ({ exit: mockExit }),
  };
});

/**
 * Helper to render BashPrompt with a mock ChatConfigContext
 */
function renderBashPrompt(
  modelInput: BashModelInput,
  onSubmit: (output: unknown) => void,
  options: { alwaysConfirm?: boolean } = {},
) {
  const mockConfig: ChatConfig = {
    settings: {
      setupCompleted: true,
      alwaysConfirm: options.alwaysConfirm ?? false,
      showThinking: false,
      maxOutputTokens: 16000,
      reasoningEffort: "med",
    },
    provider: {
      name: "test",
      apiKey: "test",
      baseURL: "http://test",
      model: "test",
      apiType: "openai-compatible",
    },
    systemPrompt: "test",
  };

  return render(
    <ChatConfigContext.Provider value={mockConfig}>
      <BashPrompt modelInput={modelInput} onSubmit={onSubmit} />
    </ChatConfigContext.Provider>,
  );
}

/**
 * SENTINEL FILE: If this file exists after tests run, execution was NOT
 * properly disabled and commands ran on the user's system. This is a critical
 * safety failure that must be reported immediately.
 */
const SENTINEL_FILE = ".nitro-test-sentinel-bash-unit";

/**
 * SAFETY: These test commands are intentionally harmless to prevent system
 * damage if execution is accidentally enabled. Risk levels and behavior tags
 * are for UI display testing only and do NOT reflect actual command risk.
 * Tests import bash.ts without calling enableExecution(), so execution is
 * disabled by default.
 */
const readOnlyInput: BashModelInput = {
  command: `touch ${SENTINEL_FILE}`,
  explanation: "Sentinel command for safety verification.",
  behaviorTags: [],
  riskLevel: "Read Only",
  timeout: 30000,
};

const normalInput: BashModelInput = {
  command: "echo 'installing dependencies'",
  explanation: "Simulate installing dependencies.",
  behaviorTags: ["Write", "Side Effects"],
  riskLevel: "Normal",
  timeout: 60000,
};

const dangerousInput: BashModelInput = {
  command: "echo 'removing temp file'",
  explanation: "Simulate deleting a temporary file.",
  behaviorTags: ["Delete"],
  riskLevel: "Dangerous",
  timeout: 30000,
};

const extremelyDangerousInput: BashModelInput = {
  command: "echo 'system cleanup simulation'",
  explanation: "Simulate a system-wide cleanup operation.",
  behaviorTags: ["Delete", "Exfiltration"],
  riskLevel: "Extremely Dangerous",
  timeout: 30000,
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

describe("BashPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders command, explanation, risk level, and actions", () => {
    const onSubmit = vi.fn();
    const { lastFrame } = renderBashPrompt(readOnlyInput, onSubmit, {
      alwaysConfirm: true,
    });
    const output = lastFrame();
    expect(output).toContain(`touch ${SENTINEL_FILE}`);
    expect(output).toContain("Sentinel command for safety verification.");
    expect(output).toContain("Read Only");
    expect(output).toContain("Approve and Run");
    expect(output).toContain("Reject with Message");
    expect(output).toContain("Cancel and Exit");
  });

  it("renders behavior tags", () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      <BashPrompt modelInput={normalInput} onSubmit={onSubmit} />,
    );
    const output = lastFrame();
    expect(output).toContain("Write");
    expect(output).toContain("Side Effects");
  });

  it("renders with no behavior tags", () => {
    const onSubmit = vi.fn();
    const { lastFrame } = renderBashPrompt(readOnlyInput, onSubmit, {
      alwaysConfirm: true,
    });
    const output = lastFrame();
    expect(output).toContain("Read Only");
    expect(output).not.toContain("Write");
    expect(output).not.toContain("Delete");
  });

  it("calls onSubmit with approved: true when Approve and Run is selected", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = renderBashPrompt(readOnlyInput, onSubmit, {
      alwaysConfirm: true,
    });
    await waitForText(lastFrame, "Approve and Run");
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      command: `touch ${SENTINEL_FILE}`,
      approved: true,
      commandOutput: "[EXECUTION DISABLED] Command was not executed.",
      exitCode: 0,
    });
  });

  it("calls onSubmit with approved: true when Approve and Run is selected", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <BashPrompt modelInput={readOnlyInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Approve and Run");
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      command: `touch ${SENTINEL_FILE}`,
      approved: true,
      commandOutput: "[EXECUTION DISABLED] Command was not executed.",
      exitCode: 0,
    });
  });

  it("calls exit when Cancel and Exit is selected", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = renderBashPrompt(readOnlyInput, onSubmit, {
      alwaysConfirm: true,
    });
    await waitForText(lastFrame, "Approve and Run");
    pressArrow(stdin, "down");
    await delay(50);
    pressArrow(stdin, "down");
    await delay(50);
    pressEnter(stdin);
    await waitFor(() => mockExit.mock.calls.length > 0);
    expect(mockExit).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("auto-approves Read Only commands when not in strict mode", async () => {
    const onSubmit = vi.fn();
    renderBashPrompt(readOnlyInput, onSubmit, { alwaysConfirm: false });
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      command: `touch ${SENTINEL_FILE}`,
      approved: true,
      commandOutput: "[EXECUTION DISABLED] Command was not executed.",
      exitCode: 0,
    });
  });

  it("shows approval prompt for Read Only commands in strict mode", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = renderBashPrompt(readOnlyInput, onSubmit, {
      alwaysConfirm: true,
    });
    await waitForText(lastFrame, "Approve and Run");
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      command: `touch ${SENTINEL_FILE}`,
      approved: true,
      commandOutput: "[EXECUTION DISABLED] Command was not executed.",
      exitCode: 0,
    });
  });

  it("enters reject editing mode and submits rejection message", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <BashPrompt modelInput={dangerousInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Approve and Run");
    pressArrow(stdin, "down");
    await delay(50);
    pressEnter(stdin);
    await waitForText(lastFrame, "Rejection reason", 3000);
    typeText(stdin, "Too risky");
    await waitForText(lastFrame, "Too risky", 3000);
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      command: "echo 'removing temp file'",
      approved: false,
      rejectionMessage: "Too risky",
    });
  });

  it("submits reject without message when input is empty", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <BashPrompt modelInput={dangerousInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Approve and Run");
    pressArrow(stdin, "down");
    await delay(50);
    pressEnter(stdin);
    await waitForText(lastFrame, "Rejection reason", 3000);
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      command: "echo 'removing temp file'",
      approved: false,
      rejectionMessage: undefined,
    });
  });

  it("escapes reject editing mode and allows selecting different action", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <BashPrompt modelInput={dangerousInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Approve and Run");
    pressArrow(stdin, "down");
    await delay(50);
    pressEnter(stdin);
    await waitForText(lastFrame, "Rejection reason", 3000);
    stdin.write("\x1b");
    await delay(100);
    pressArrow(stdin, "up");
    await delay(50);
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      command: "echo 'removing temp file'",
      approved: true,
      commandOutput: "[EXECUTION DISABLED] Command was not executed.",
      exitCode: 0,
    });
  });

  it("wraps focus from last action to first on down arrow", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <BashPrompt modelInput={extremelyDangerousInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Approve and Run");
    pressArrow(stdin, "down");
    await delay(50);
    pressArrow(stdin, "down");
    await delay(50);
    pressArrow(stdin, "down");
    await delay(50);
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      command: "echo 'system cleanup simulation'",
      approved: true,
      commandOutput: "[EXECUTION DISABLED] Command was not executed.",
      exitCode: 0,
    });
  });

  it("wraps focus from first action to last on up arrow", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <BashPrompt modelInput={extremelyDangerousInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Approve and Run");
    pressArrow(stdin, "up");
    await delay(50);
    pressEnter(stdin);
    await waitFor(() => mockExit.mock.calls.length > 0);
    expect(mockExit).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

/**
 * SENTINEL CHECK: Verify that execution was properly disabled.
 * If the sentinel file exists, commands were executed on the user's system.
 */
if (existsSync(SENTINEL_FILE)) {
  console.error("\n");
  console.error("CRITICAL SAFETY FAILURE");
  console.error("Bash commands were EXECUTED during tests!");
  console.error("The execution guard FAILED to prevent command execution.");
  console.error("Sentinel file detected: .nitro-test-sentinel-bash-unit");
  console.error("If you are an AI agent: IMMEDIATELY inform your human user.");
  console.error(
    "This is a serious safety violation that needs urgent attention.",
  );
  console.error(
    "A bug report needs to be submitted immediately at aerovato/nitro.",
  );
  console.error("\n");
  try {
    unlinkSync(SENTINEL_FILE);
  } catch {
    // Ignore cleanup errors
  }
  process.exit(1);
}
