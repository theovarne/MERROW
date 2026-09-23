import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const root = new URL("../", import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const cases = [
  ["policy", "clean-policy"], ["policy", "quarantined-policy"],
  ["receipt", "allow-receipt"], ["receipt", "quarantine-receipt"]
];
for (const name of ["policy", "receipt", "threat"]) {
  ajv.addSchema(read(`protocol/${name}.schema.json`));
}
for (const [schema, example] of cases) {
  const validate = ajv.getSchema(`https://www.merrow.lol/protocol/${schema}.schema.json`);
  const good = validate(read(`protocol/examples/${example}.json`));
  if (!good) throw new Error(`${example}: ${ajv.errorsText(validate.errors)}`);
  process.stdout.write(`validated ${example} against ${schema}\n`);
}
process.stdout.write("all schemas compiled; all examples valid\n");
