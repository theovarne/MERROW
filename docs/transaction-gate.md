# Transaction Gate

The gate accepts serialized Solana transaction bytes, not natural-language descriptions of a transaction. The browser prototype can decode base58/base64 input and inspect legacy and v0 message structure.

```text
decode -> inspect -> normalize -> evaluate -> simulate -> verdict -> receipt
```

**Decode:** read signature count, message header, static account keys, recent blockhash, compiled instructions and v0 address-table lookup descriptors. The current parser does not resolve every loaded lookup address.

**Inspect:** derive static-key signer and writable flags from header counts. For each instruction expose Program ID, account indices/metas and raw instruction data. Unknown indices or programs should trigger manual review/quarantine.

**Normalize:** convert parsed data into policy-facing Program IDs, writable accounts, signer requirements, lamports, SPL mints and token amounts. Current website decoding recognizes System transfer and selected SPL transfer forms only. Token mint may not be encoded in a generic Transfer instruction; account resolution is required.

**Evaluate:** compare normalized action to owner policy and verified state. The tested reference engine checks program/account allowlists, lamports, slippage, expiry, state trust and required simulation, but is not wired into a wallet.

**Simulate:** `website/api/rpc.js` restricts the upstream public Solana RPC to `getHealth` and `simulateTransaction`. Simulation does not sign or submit; it can time out and is not proof of future execution.

**Verdict/receipt:** ALLOW, DENY or QUARANTINE plus a local audit record. No production signing guarantee is asserted.
