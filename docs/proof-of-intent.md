# Proof of Intent

## What it is

An owner-approved objective and associated policy that can be checked independently of an agent's words. The website's Proof Inspector is a lab interaction; cryptographic owner approval is not implemented.

## Why it exists

An injected instruction can make an agent confidently propose a transaction unrelated to the owner's task. A verifiable objective narrows what the proposal is allowed to do.

## Schema and Fields

The draft [policy schema](../protocol/policy.schema.json) defines `network`, `version`, `program_ids`, `allowed_mints`, `writable_accounts`, `max_lamports` (decimal string to avoid numeric precision loss), `max_slippage_bps`, `expiry` and `simulation_required`. Optional `objective_hash` and `state_root` anticipate cryptographic binding. The schema validates shape only; it does not establish who approved a policy.

## Verification Flow

1. Obtain objective and policy from an authenticated owner channel.
2. Verify approval/signature and expiry (planned).
3. Compare objective hash and trusted state root (planned).
4. Decode transaction and compare its effects with allowlists and bounds (partial prototype).
5. Require simulation if specified, then issue a local verdict and receipt.

## Failure Conditions

Missing or expired approval, objective drift, state mismatch, unknown program, unexpected writable account, exceeded limits, unavailable required simulation or unrecognized instruction semantics should prevent ALLOW.

## Example

[clean-policy.json](../protocol/examples/clean-policy.json) is a schema-valid example. It is not signed and cannot authorize a wallet by itself.
