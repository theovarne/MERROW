import { randomUUID } from "node:crypto";
export function createReceipt({ policyHash, objectiveHash, stateRoot, transaction, simulation, decision, checkpoint }) {
  if (!decision || !["ALLOW", "DENY", "QUARANTINE"].includes(decision.verdict)) throw new Error("invalid verdict");
  return {
    receipt_id: randomUUID(),
    timestamp: new Date().toISOString(),
    policy_hash: policyHash,
    objective_hash: objectiveHash,
    state_root: stateRoot,
    program_ids: transaction.program_ids,
    accounts: transaction.accounts,
    simulation: simulation || { status: "NOT_RUN" },
    verdict: decision.verdict,
    reason: decision.reason,
    checkpoint: checkpoint || null,
    scope: "LOCAL_PROTOCOL_RECEIPT"
  };
}

