// Reference verdict engine. It never signs or submits a transaction.
import { validatePolicy } from "../policy/validate.js";
import { isSolanaPubkey } from "../transaction/pubkey.js";
export function decide({ policy, transaction, stateTrusted = false, simulation = null }) {
  if (!policy || !transaction) return { verdict: "QUARANTINE", reason: "missing policy or transaction" };
  if (!validatePolicy(policy).valid) return { verdict: "QUARANTINE", reason: "invalid policy" };
  if (!Array.isArray(transaction.program_ids) || !Array.isArray(transaction.writable_accounts) || transaction.program_ids.some(id => !isSolanaPubkey(id)) || transaction.writable_accounts.some(id => !isSolanaPubkey(id))) return { verdict: "QUARANTINE", reason: "invalid transaction summary" };
  if (policy.status === "QUARANTINED") return { verdict: "QUARANTINE", reason: "policy is quarantined" };
  if (!stateTrusted) return { verdict: "QUARANTINE", reason: "persistent state is not verified" };
  if (policy.expiry && Date.parse(policy.expiry) <= Date.now()) return { verdict: "DENY", reason: "policy expired" };
  const allowed = new Set(policy.program_ids);
  if (transaction.program_ids.some(id => !allowed.has(id))) return { verdict: "QUARANTINE", reason: "unknown Program ID" };
  const writable = new Set(policy.writable_accounts);
  if (transaction.writable_accounts.some(id => !writable.has(id))) return { verdict: "DENY", reason: "unexpected writable account" };
  if (!/^(0|[1-9][0-9]*)$/.test(String(transaction.lamports))) return { verdict: "QUARANTINE", reason: "invalid lamport amount" };
  if (BigInt(transaction.lamports) > BigInt(policy.max_lamports)) return { verdict: "DENY", reason: "lamport limit exceeded" };
  if (transaction.slippage_bps != null && transaction.slippage_bps > policy.max_slippage_bps) return { verdict: "DENY", reason: "slippage limit exceeded" };
  if (policy.simulation_required && (!simulation || simulation.err || simulation.ok !== true)) return { verdict: "QUARANTINE", reason: "successful simulation required" };
  return { verdict: "ALLOW", reason: "reference checks passed; wallet review still required" };
}
