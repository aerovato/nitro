import { describe, it, expect, beforeEach } from "vitest";
import { Transcript } from "../../src/headless/transcript";
import { CaptureStream } from "./helpers";

let out: CaptureStream;
let err: CaptureStream;
let t: Transcript;

beforeEach(() => {
  out = new CaptureStream();
  err = new CaptureStream();
  t = new Transcript({ stdout: out, stderr: err });
});

describe("Transcript", () => {
  it("writeCommand prints `$ <command>` to stdout with newline", () => {
    t.writeCommand("ls -la");
    expect(out.text()).toBe("$ ls -la\n");
    expect(err.text()).toBe("");
  });

  it("writeRisk prints `[risk: …, tags: …]` to stderr", () => {
    t.writeRisk("Read Only", ["Safe"]);
    expect(err.text()).toBe("[risk: Read Only, tags: Safe]\n");
    expect(out.text()).toBe("");
  });

  it("writeRisk handles multiple tags joined by comma+space", () => {
    t.writeRisk("Normal", ["Write", "Reversible"]);
    expect(err.text()).toBe("[risk: Normal, tags: Write, Reversible]\n");
  });

  it("writeRisk handles empty tags list as 'tags: -'", () => {
    t.writeRisk("Read Only", []);
    expect(err.text()).toBe("[risk: Read Only, tags: -]\n");
  });

  it("writeBashOutput strips out:\\t prefix to stdout, err:\\t to stderr", () => {
    const bashOutput = [
      "out:\thello",
      "out:\tworld",
      "err:\twarning: x",
      "out:\tdone",
    ].join("\n");
    t.writeBashOutput(bashOutput);
    expect(out.text()).toBe("hello\nworld\ndone\n");
    expect(err.text()).toBe("warning: x\n");
  });

  it("writeBashOutput tolerates a trailing empty line (bash output ends with \\n)", () => {
    t.writeBashOutput("out:\thello\n");
    expect(out.text()).toBe("hello\n");
  });

  it("writeBashOutput routes unprefixed lines to stderr (amendment 8)", () => {
    // Unprefixed lines (e.g., "Tool Error: Command timed out") go to stderr
    t.writeBashOutput("out:\tok\nstray line\nerr:\terror");
    expect(out.text()).toBe("ok\n");
    expect(err.text()).toBe("stray line\nerror\n");
  });

  it("writeRefusal prints to stderr with command and risk level", () => {
    t.writeRefusal("rm -rf /tmp", "Dangerous");
    expect(err.text()).toBe(
      "Refused: rm -rf /tmp (Dangerous). Re-run with --yes to allow.\n",
    );
    expect(out.text()).toBe("");
  });

  it("writeAnswer prepends a blank line + 'Answer: ' to stdout", () => {
    t.writeAnswer("Found 5 files.");
    expect(out.text()).toBe("\nAnswer: Found 5 files.\n");
  });

  it("writeAnswer is a no-op for empty / whitespace-only input", () => {
    t.writeAnswer("");
    t.writeAnswer("   \n  ");
    expect(out.text()).toBe("");
    expect(err.text()).toBe("");
  });

  it("writeError prefixes with 'nitro: ' on stderr", () => {
    t.writeError("EULA not yet accepted.");
    expect(err.text()).toBe("nitro: EULA not yet accepted.\n");
  });
});
