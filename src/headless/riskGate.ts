import type { RiskLevel } from "../tools/bash";

export type GateDecision = "run" | "refuse";

export interface GateOptions {
  yes: boolean;
}

// Risk-gating policy (per design section 3):
//   Read Only / Normal                 -> always run
//   Dangerous / Extremely Dangerous    -> run only if --yes, else refuse
//
// NOTE: The headless path auto-runs Normal commands, unlike the TUI which
// only auto-runs Read Only. This is intentional: headless is invoked by an
// operator who delegated authority; the --yes flag exists for full trust.
// See Amendment 5 from the design review for rationale.
export function decide(level: RiskLevel, { yes }: GateOptions): GateDecision {
  if (level === "Read Only" || level === "Normal") return "run";
  return yes ? "run" : "refuse";
}
