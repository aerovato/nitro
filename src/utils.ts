import { exit } from "node:process";

import type React from "react";
// eslint-disable-next-line no-restricted-imports
import { Instance, render } from "ink";
import chalk from "chalk";

export function renderWithColor(
  element: React.ReactElement,
): Promise<Instance> {
  return Promise.resolve(render(element));
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

export function outputError(message: string): void {
  console.log(chalk.red(message));
}

export function exitWithError(message: string): never {
  outputError(message);
  exit(1);
}
