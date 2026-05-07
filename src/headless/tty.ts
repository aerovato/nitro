import type { HeadlessFlags } from "./flags";

export interface HeadlessContextInput {
  flags: HeadlessFlags;
  stdinIsTTY: boolean;
}

// WHY take stdinIsTTY as a parameter rather than reading process.stdin.isTTY
// directly: trivial testability, plus it forces the dispatcher (the only
// real caller) to take responsibility for reading it once at the boundary.
//
// V1 (this commit): only --headless triggers headless. stdinIsTTY is accepted
// but deliberately ignored — branch 3 (feat/headless-autodetect) extends this
// to also trigger when !stdinIsTTY, with --tty as the explicit override.
export function isHeadlessContext({ flags }: HeadlessContextInput): boolean {
  if (flags.tty) return false;
  return flags.headless;
}
