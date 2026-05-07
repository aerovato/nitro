import type { HeadlessFlags } from "./flags";

export interface HeadlessContextInput {
  flags: HeadlessFlags;
  stdinIsTTY: boolean;
}

// V2 contract:
//   --tty                 → never headless (highest precedence: explicit override)
//   --headless            → always headless
//   neither flag          → headless iff stdin is not a TTY (auto-detect)
//
// The --tty escape hatch matters for two cases:
//   (a) Testing the Ink failure path on purpose.
//   (b) A TTY situation where someone is piping stdin to the process for
//       reasons unrelated to nitro (rare but not impossible).
export function isHeadlessContext({
  flags,
  stdinIsTTY,
}: HeadlessContextInput): boolean {
  if (flags.tty) return false;
  if (flags.headless) return true;
  return !stdinIsTTY;
}
