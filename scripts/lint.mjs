import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const roots = ["src", "scripts", "examples", "tests", "website/assets/js", "website/api"];
let count = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(?:js|mjs)$/.test(path)) {
      execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
      count++;
    }
  }
}
for (const root of roots) walk(root);
const html = readFileSync("website/index.html", "utf8");
if (!html.includes("<!DOCTYPE html>") || !html.includes("</html>")) throw new Error("website/index.html is incomplete");
if (!html.includes('aria-label="MERROW GitHub"')) throw new Error("GitHub icon missing");
process.stdout.write(`syntax checked ${count} JavaScript files and website shell\n`);
