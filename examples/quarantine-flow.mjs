import { readFileSync } from "node:fs";
import { decide } from "../src/core/verdict.js";
const policy = JSON.parse(readFileSync(new URL("../protocol/examples/clean-policy.json", import.meta.url), "utf8"));
const transaction = { program_ids: policy.program_ids, writable_accounts: policy.writable_accounts, lamports: "1", slippage_bps: 0 };
process.stdout.write(JSON.stringify(decide({ policy, transaction, stateTrusted: false, simulation: { ok: true } }), null, 2) + "\n");
