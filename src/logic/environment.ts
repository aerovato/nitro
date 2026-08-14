import { execFileSync } from "node:child_process";
import { cwd } from "node:process";

function getDirectoryListing(workingDirectory: string): string {
  try {
    return execFileSync("ls", ["-la"], {
      cwd: workingDirectory,
      encoding: "utf-8",
      maxBuffer: 64 * 1024,
      timeout: 5000,
    }).trimEnd();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error running ls -la: ${message}`;
  }
}

export function getWorkspaceSnapshot(): string {
  const workingDirectory = cwd();
  const listing = getDirectoryListing(workingDirectory);
  return [
    "<system-context>",
    "Current working directory:",
    workingDirectory,
    "",
    "Directory listing (ls -la):",
    listing,
    "</system-context>",
  ].join("\n");
}

export function prependWorkspaceContext(message: string): string {
  return `${getWorkspaceSnapshot()}\n\n---\n\n${message}`;
}
