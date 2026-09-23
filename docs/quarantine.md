# Quarantine

| Decision | Scope | Meaning |
| --- | --- | --- |
| ALLOW | one proposal | reference checks passed; wallet review still required |
| DENY | one proposal | reject that proposed action |
| QUARANTINE | surrounding context | distrust agent state, provenance or required evidence |
| RECOVER | trusted workflow | restore an approved checkpoint and revalidate |

DENY does not imply the agent's entire memory is compromised. QUARANTINE is deliberately stronger: no further signing should be allowed from that context until a trusted recovery path runs. Unknown Program IDs, unverified state roots or absent required simulation are candidate quarantine reasons.

The browser's quarantine controls change local demo state only. No live wallet or agent process is isolated by the website.
