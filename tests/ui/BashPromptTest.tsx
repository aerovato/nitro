import { existsSync, unlinkSync } from "node:fs";
import { BashPrompt } from "../../src/components/bash/BashPrompt";
import { renderWithColor } from "../../src/utils";
import type { BashModelInput } from "../../src/tools/bash";

/**
 * SENTINEL FILE: If this file exists after tests run, execution was NOT
 * properly disabled and commands ran on the user's system. This is a critical
 * safety failure that must be reported immediately.
 */
const SENTINEL_FILE = ".nitro-test-sentinel-bash-ui";

/**
 * SAFETY: These test commands are intentionally harmless to prevent system
 * damage if execution is accidentally enabled. Risk levels and behavior tags
 * are for UI display testing only and do NOT reflect actual command risk.
 * Tests import bash.ts without calling enableExecution(), so execution is
 * disabled by default.
 */
const sampleInputs: BashModelInput[] = [
  {
    command: `touch ${SENTINEL_FILE}`,
    explanation:
      "Sentinel command for safety verification. Displays 'Extremely Dangerous' UI styling.",
    behaviorTags: ["Delete", "Overwrite", "Side Effects"],
    riskLevel: "Extremely Dangerous",
    timeout: 30000,
  },
  {
    command: "git log -n 20 --pretty=format:'%h %an %ad %s' --date=short",
    explanation: "Show last 20 commits with author, date, and commit message.",
    behaviorTags: [],
    riskLevel: "Read Only",
    timeout: 30000,
  },
  {
    command: "echo 'simulating npm install'",
    explanation:
      "Simulate installing dependencies. Displays 'Normal' UI styling.",
    behaviorTags: ["Write", "Side Effects"],
    riskLevel: "Normal",
    timeout: 60000,
  },
  {
    command: "echo 'simulating clean reinstall'",
    explanation:
      "Simulate deleting and reinstalling. Displays 'Dangerous' UI styling.",
    behaviorTags: ["Delete", "Side Effects"],
    riskLevel: "Dangerous",
    timeout: 120000,
  },
];

async function testBashPrompt() {
  for (const input of sampleInputs) {
    const cleanupFunctions: Array<() => void> = [];
    function unmountApp() {
      cleanupFunctions.forEach(item => item());
    }
    const { waitUntilExit, unmount, clear, cleanup } = await renderWithColor(
      <BashPrompt modelInput={input} onSubmit={unmountApp} />,
    );
    cleanupFunctions.push(cleanup, clear, unmount);
    await waitUntilExit();
  }
}

await testBashPrompt();

/**
 * SENTINEL CHECK: Verify that execution was properly disabled.
 * If the sentinel file exists, commands were executed on the user's system.
 */
if (existsSync(SENTINEL_FILE)) {
  console.error("\n");
  console.error("CRITICAL SAFETY FAILURE");
  console.error("Bash commands were EXECUTED during tests!");
  console.error("The execution guard FAILED to prevent command execution.");
  console.error("Sentinel file detected: .nitro-test-sentinel-bash-ui");
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
