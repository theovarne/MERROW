import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { isSolanaPubkey } from "../transaction/pubkey.js";
const schema = JSON.parse(readFileSync(new URL("../../protocol/policy.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const check = ajv.compile(schema);
export function validatePolicy(policy) {
  const valid = check(policy);
  const errors = valid ? [] : (check.errors || []).map(error => `${error.instancePath || "/"} ${error.message}`);
  if (valid) {
    for (const field of ["program_ids", "allowed_mints", "writable_accounts"]) {
      if (policy[field].some(value => !isSolanaPubkey(value))) errors.push(`${field}: invalid 32-byte Solana public key`);
    }
  }
  return { valid: errors.length === 0, errors };
}
