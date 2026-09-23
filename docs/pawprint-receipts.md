# Pawprint Receipts

A Pawprint Receipt is a structured local audit record of a Merrow decision. It is **not an onchain receipt** and does not by itself prove enforcement.

The draft [receipt schema](../protocol/receipt.schema.json) requires `receipt_id`, `timestamp`, `policy_hash`, `objective_hash`, `state_root`, `program_ids`, `accounts`, `simulation`, `verdict` and `checkpoint`. It also records reason and scope. Null hashes in illustrative examples mean no authenticated binding exists, not that the hash check passed.

The current website UI uses a legacy local shape (`id`, `time`, `source`) and stores up to eight receipts in browser `sessionStorage`. The Node reference function emits the canonical draft shape. No migration or chain anchoring has been implemented.

Receipts should preserve why a decision was reached without storing seeds, private keys or full sensitive tool outputs. A future signed receipt format must define tamper evidence, retention and privacy before production use.
