import { chmodSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const APP_DATA_DIR = join(homedir(), ".nitro");
export function ensureAppDataDir(): void {
  if (!existsSync(APP_DATA_DIR)) {
    mkdirSync(APP_DATA_DIR, { mode: 0o700 });
  }
  chmodSync(APP_DATA_DIR, 0o700);
}
