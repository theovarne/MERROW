import { readFileSync } from "node:fs";
import { validatePolicy } from "../src/policy/validate.js";
const policy = JSON.parse(readFileSync(new URL("../protocol/examples/clean-policy.json", import.meta.url), "utf8"));
const result = validatePolicy(policy);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
if (!result.valid) process.exitCode = 1;
