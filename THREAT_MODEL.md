# Threat Model

## Assets

Wallet signing authority; agent persistent memory; owner-approved intent; policy state; token authority; transaction parameters; local audit evidence.

## Adversarial Inputs

Prompt injection in retrieved documents, poisoned MCP/tool output, compromised agent messages, persistent memory poisoning, hidden transaction mutation, unexpected writable accounts, unknown Program IDs and signer escalation.

## Trust Assumptions

LLM output is untrusted. External documents are untrusted. Tool responses may be untrusted. Persistent memory requires verification. Wallet signatures remain an external authority boundary. An owner-approved policy and baseline must be authenticated outside the compromised reasoning context; the current website does not provide that authentication.

## Representative Failure Paths

| Path | Intended control | Current gap |
| --- | --- | --- |
| Retrieved instruction changes agent goal | objective binding and provenance | signed binding not implemented |
| Poisoned memory persists across turns | state-root comparison and quarantine | lab demonstration only |
| Proposal adds unknown Program ID | program allowlist; quarantine | browser prototype and tested reference logic |
| Proposal adds writable account | account-meta policy | static-key reference check; dynamic resolution incomplete |
| Transaction exceeds owner value limit | amount check before signature | reference check and partial browser decoding |
| Simulation fails or is unavailable | fail closed where required | optional prototype; not a wallet gate |

## Out of Scope

Compromised wallet software, stolen private keys, malicious validator infrastructure, vulnerabilities inside allowed onchain programs, and social engineering outside Merrow. Also out of scope for the present implementation: proof that a displayed local verdict was enforced at the wallet.

## Security Claim

The repository explores pre-sign checks and documents the intended boundary. It does not claim to prevent theft on mainnet today. See [SECURITY.md](SECURITY.md) for reporting.
