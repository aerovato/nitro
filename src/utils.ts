import { exit, stdin, stdout } from "node:process";

import type React from "react";
// eslint-disable-next-line no-restricted-imports
import { Instance, render } from "ink";
import chalk, { type ColorSupportLevel } from "chalk";

import { RED } from "./colors";

async function detectColorSupport(): Promise<ColorSupportLevel> {
  return new Promise(resolve => {
    if (!stdout.isTTY || !stdin.isTTY) {
      return resolve(0);
    }

    let response = "";
    let isResolved = false;
    const wasRawMode = stdin.isRaw === true;
    const wasFlowing = stdin.readableFlowing;

    const safetyCatch = setTimeout(() => {
      if (!isResolved) {
        cleanup();
        resolve(1);
      }
    }, 500);

    const cleanup = () => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(safetyCatch);
      stdin.setRawMode(wasRawMode);
      if (wasFlowing === true) {
        stdin.resume();
      } else {
        stdin.pause();
      }
      stdin.removeListener("data", onData);
    };

    const onData = (chunk: Buffer<ArrayBuffer>) => {
      response += chunk.toString();

      // eslint-disable-next-line
      if (/\x1b\[[03]n/.test(response)) {
        cleanup();
        // Compliant SGR Check
        if (/48[;:]2[;:]+(?:[\d]+[;:])?1[;:]2[;:]3/.test(response)) {
          return resolve(3);
        }
        // OSC 4 Proxy Check
        // Expecting the scaled 16-bit format of rgb:01/02/03
        if (
          /rgb:0101\/0202\/0303/.test(response)
          || /rgb:01\/02\/03/.test(response)
        ) {
          return resolve(3);
        }
        // 256 color palette check
        if (response.includes("rgb:")) {
          return resolve(2);
        }

        resolve(1);
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);

    stdout.write(
      "\x1b]4;253;rgb:01/02/03\x07" // Set OSC 4 index 253 to specific RGB
        + "\x1b]4;253;?\x07" // Query OSC 4 index 253
        + "\x1b[48;2;1;2;3m" // Set SGR truecolor background
        + "\x1bP$qm\x1b\\" // Query SGR state via DECRQSS
        + "\x1b[49m\x1b[5n\x1b[2K\x1b[G", // Reset background, query DSR, clear line, return cursor
    );
  });
}

export async function renderWithColor(
  element: React.ReactElement,
): Promise<Instance> {
  const colorLevel = await detectColorSupport();
  chalk.level = colorLevel;
  return render(element);
}

/**
 * Expands tab characters into the correct number of spaces.
 * Fixes Ink tab rendering errors.
 */
export function expandTabs(text: string, tabSize: number = 4): string {
  let result = "";
  let currentColumn = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\t") {
      // Calculate how many spaces are needed to reach the next multiple of tabSize
      const spacesNeeded = tabSize - (currentColumn % tabSize);
      result += " ".repeat(spacesNeeded);
      currentColumn += spacesNeeded;
    } else if (char === "\n") {
      // Reset the column counter on a new line
      result += char;
      currentColumn = 0;
    } else {
      result += char;
      currentColumn++;
    }
  }

  return result;
}

function colorHex(hex: string, text: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

export function outputError(message: string): void {
  console.log(colorHex(RED, message));
}

export function exitWithError(message: string): never {
  outputError(message);
  exit(1);
}
