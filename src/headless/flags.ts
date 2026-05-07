export interface HeadlessFlags {
  headless: boolean;
  tty: boolean;
  yes: boolean;
}

export interface ParseFlagsResult {
  flags: HeadlessFlags;
  remaining: string[];
}

export function parseFlags(argv: string[]): ParseFlagsResult {
  const flags: HeadlessFlags = { headless: false, tty: false, yes: false };
  const remaining: string[] = [];

  for (const arg of argv) {
    if (arg === "--headless") flags.headless = true;
    else if (arg === "--tty") flags.tty = true;
    else if (arg === "--yes") flags.yes = true;
    else remaining.push(arg);
  }

  return { flags, remaining };
}
