/**
 * Shared test helpers for the headless test suite.
 *
 * Amendment 13: CaptureStream was duplicated across 4 test files.
 * Centralizing it here prevents drift and reduces boilerplate.
 */

import { Writable } from "node:stream";

/**
 * Lightweight Writable that captures all chunks for assertion.
 *
 * Usage:
 *   const out = new CaptureStream();
 *   stream.pipe(out);
 *   expect(out.text()).toContain("expected output");
 */
export class CaptureStream extends Writable {
  chunks: string[] = [];

  override _write(
    chunk: Buffer | string,
    _encoding: string,
    callback: () => void,
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }

  /** Return all captured chunks concatenated into a single string. */
  text(): string {
    return this.chunks.join("");
  }
}
