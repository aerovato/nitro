import { describe, it, expect } from "vitest";
import { decide } from "../../src/headless/riskGate";
import type { RiskLevel } from "../../src/tools/bash";

const MATRIX: { level: RiskLevel; yes: boolean; expected: "run" | "refuse" }[] =
  [
    { level: "Read Only", yes: false, expected: "run" },
    { level: "Read Only", yes: true, expected: "run" },
    { level: "Normal", yes: false, expected: "run" },
    { level: "Normal", yes: true, expected: "run" },
    { level: "Dangerous", yes: false, expected: "refuse" },
    { level: "Dangerous", yes: true, expected: "run" },
    { level: "Extremely Dangerous", yes: false, expected: "refuse" },
    { level: "Extremely Dangerous", yes: true, expected: "run" },
  ];

describe("riskGate.decide", () => {
  for (const row of MATRIX) {
    it(`${row.level} × yes=${row.yes} → ${row.expected}`, () => {
      expect(decide(row.level, { yes: row.yes })).toBe(row.expected);
    });
  }
});
