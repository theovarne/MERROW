# Architecture

## 1. Design Goals

Merrow aims to put a deterministic, inspectable boundary between an autonomous agent's proposal and wallet authorization on Solana. A local verdict should be explainable and should fail closed when required evidence is unavailable. This is a research architecture, not an assertion that the current frontend enforces a production wallet boundary.

## 2. System Overview

External content and tool responses enter the reasoning plane. The agent forms a proposal. An authorization plane evaluates the proposal against owner-approved intent, a trusted state root, a policy, parsed Solana transaction data and optional simulation. It emits ALLOW, DENY or QUARANTINE plus a local receipt. Only an independent wallet may sign. The language model is intentionally not the final authority.

## 3. Trust Boundaries

Documents, MCP/tool results, inter-agent messages, model output and mutable memory are untrusted. A policy and state baseline should be approved and authenticated independently of the model. A browser display or local receipt is not cryptographic evidence by itself. The wallet boundary is external to this repository.

## 4. Reasoning Plane

The model can retrieve, summarize and propose. Its text cannot modify the authorization policy, assert that memory is safe, suppress a failed simulation or cause a signature. Current website labs visualize these paths deterministically; they do not monitor real agent networks.

## 5. Authorization Plane

The proposed transaction is normalized into Program IDs, account metas, signers, writable accounts and recognized asset actions. The engine checks this against the owner policy. Unknown or unverifiable semantics require review or quarantine. The reference `src/core/verdict.js` is deliberately small and does not claim complete Solana coverage.

## 6. State Model

An intended implementation binds a persistent-state root to an owner-approved checkpoint and compares it before every authorization. Drift should invalidate the active context. Website Nine Lives checkpoints are lab data, not signed state roots.

## 7. Policy Engine

The draft schema specifies network, version, program/mint/account allowlists, lamport and slippage limits, expiry and simulation requirement. The Node reference module validates this schema and performs a subset of verdict checks. It does not verify signatures on policies or objectives.

## 8. Transaction Parsing

The browser prototype decodes serialized transaction bytes and reads legacy/v0 message headers, static account keys, account-meta flags, instructions and lookup-table counts. It cannot resolve every address-table key or every instruction's semantics. Unknown indexed accounts must not silently become trusted.

## 9. Solana Program Inspection

The website recognizes common program IDs, partially decodes System transfers and some SPL transfer forms, and surfaces unknown programs. A program allowlist alone cannot prove that an allowed program call is safe. Full instruction decoding, CPI analysis and program-specific authority checks remain research work.

## 10. Account Meta Verification

Signer and writable flags are derived from the message header for static keys. The reference verdict module denies writable accounts outside policy. Address-table and dynamic account resolution need complete implementation before any enforcement claim.

## 11. Simulation

The optional same-origin `website/api/rpc.js` bridge permits only `getHealth` and `simulateTransaction` to the public Solana mainnet RPC. Simulation is advisory, can time out, can differ from execution and must never be treated as a guarantee. The bridge cannot sign or submit transactions.

## 12. Verdict Engine

ALLOW means reference checks passed, not that signing occurred. DENY rejects the specific proposal. QUARANTINE distrusts surrounding state, missing evidence or unknown programs. The current reference engine is not integrated as a hard wallet gate.

## 13. Pawprint Receipts

The website stores local session receipts in `sessionStorage` using `id` and `time`. The canonical draft `protocol/receipt.schema.json` uses `receipt_id` and `timestamp`; it is a forward-looking format, not a false claim that the website already emits it. Neither format is onchain.

## 14. Quarantine

Quarantine should halt signing from a suspect context, preserve evidence, and require trusted recovery. Current website quarantine effects are lab state transitions only.

## 15. Recovery

The proposed Nine Lives mechanism restores the last owner-approved safe state and revalidates policy before execution resumes. The site illustrates this with deterministic checkpoints; no live agent state is restored.

## 16. Known Limitations

No verified objective signatures, signed state-root registry, complete Solana parser, production wallet interception, onchain receipts, live threat telemetry or audited deployment. RPC simulation is optional and contingent on public endpoint availability. Tests cover reference logic, not adversarial end-to-end wallet security.
