interface MockStdin {
  write: (data: string) => void;
  emit: (event: string, ...args: unknown[]) => boolean;
}

type LastFrame = () => string | undefined;
type TextMatch = string | RegExp;

export function typeText(stdin: MockStdin, text: string): void {
  stdin.write(text);
}

export function pressEnter(stdin: MockStdin): void {
  stdin.write("\r");
}

export function pressBackspace(stdin: MockStdin): void {
  stdin.write("\x7f");
}

export function pressArrow(
  stdin: MockStdin,
  direction: "up" | "down" | "left" | "right",
): void {
  const codes = {
    up: "\x1b[A",
    down: "\x1b[B",
    right: "\x1b[C",
    left: "\x1b[D",
  };
  stdin.write(codes[direction]);
}

export async function waitFor(
  fn: () => boolean | undefined,
  timeout = 3000,
): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise(r => setTimeout(r, 10));
  }
}

export async function waitForFrameChange(
  lastFrame: LastFrame,
  timeout = 1000,
): Promise<void> {
  const before = lastFrame();
  await waitFor(() => lastFrame() !== before, timeout);
}

function stripAnsi(input: string): string {
  // eslint-disable-next-line
  return input.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");
}

function matchesText(frame: string, text: TextMatch): boolean {
  const normalized = stripAnsi(frame);
  if (typeof text === "string") {
    return normalized.includes(text);
  }
  return text.test(normalized);
}

export async function waitForText(
  lastFrame: LastFrame,
  text: TextMatch,
  timeout = 1000,
): Promise<void> {
  await waitFor(() => {
    const frame = lastFrame();
    if (!frame) return false;
    return matchesText(frame, text);
  }, timeout);
}

export async function typeTextAndWait(
  stdin: MockStdin,
  lastFrame: LastFrame,
  text: string,
  timeout = 1000,
): Promise<void> {
  typeText(stdin, text);
  await waitForText(lastFrame, text, timeout);
}

export async function typeTextAndSubmit(
  stdin: MockStdin,
  lastFrame: LastFrame,
  text: string,
  timeout = 1000,
): Promise<void> {
  await typeTextAndWait(stdin, lastFrame, text, timeout);
  pressEnter(stdin);
}

export async function pressArrowAndWaitForFocus(
  stdin: MockStdin,
  lastFrame: LastFrame,
  direction: "up" | "down",
  label: string,
  timeout = 1000,
): Promise<void> {
  pressArrow(stdin, direction);
  await waitForText(lastFrame, new RegExp(`❯\\s*${label}`), timeout);
}
