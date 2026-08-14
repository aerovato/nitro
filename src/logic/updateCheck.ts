import chalk from "chalk";
import pkg from "../../package.json";

const CURRENT_VERSION: string = pkg.version;
const NPM_REGISTRY_URL = "https://registry.npmjs.org/@aerovato/nitro/latest";
const FETCH_TIMEOUT_MS = 5000;

interface NpmRegistryResponse {
  version?: unknown;
}

function isNpmRegistryResponse(data: unknown): data is NpmRegistryResponse {
  return typeof data === "object" && data !== null && "version" in data;
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] ?? 0;
    const l = latestParts[i] ?? 0;
    if (l > c) return -1;
    if (l < c) return 1;
  }

  return 0;
}

let settled = false;
let latestVersion: string | null = null;

export async function startUpdateCheck(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(NPM_REGISTRY_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return;
    }

    const data: unknown = await response.json();
    if (!isNpmRegistryResponse(data) || typeof data.version !== "string") {
      return;
    }

    if (
      data.version !== CURRENT_VERSION
      && compareVersions(CURRENT_VERSION, data.version) < 0
    ) {
      latestVersion = data.version;
    }
  } catch {
    clearTimeout(timeoutId);
  } finally {
    settled = true;
  }
}

export function getUpdateResult(): string | null {
  return settled ? latestVersion : null;
}

export function formatUpdateMessage(latestVersion: string): string {
  return (
    "\nUpdate available: "
    + chalk.yellow(CURRENT_VERSION)
    + " → "
    + chalk.green(latestVersion)
    + "\nRun "
    + chalk.magenta("npm install -g @aerovato/nitro")
    + " to update"
  );
}
