(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var parser = window.merrowParser;
  var SYSTEM = parser.systemProgram;
  var names = ["AGENT", "TOOL", "DOCUMENT", "MEMORY", "PLANNER", "EXECUTOR", "WALLET", "ISOLATION"];
  var routes = {
    memory: ["EXTERNAL_DOC", "AGENT_A", "MEMORY", "PLANNER", "AGENT_B", "MERROW"],
    prompt: ["EXTERNAL_DOC", "AGENT_A", "PLANNER", "MERROW"],
    tool: ["TOOL_MCP", "AGENT_A", "MEMORY", "PLANNER", "MERROW"],
    unknown: ["AGENT_B", "TOOL_MCP", "MERROW"]
  };
  var mapNode = { EXTERNAL_DOC: "DOCUMENT", AGENT_A: "AGENT", TOOL_MCP: "TOOL", MEMORY: "MEMORY", PLANNER: "PLANNER", AGENT_B: "EXECUTOR", MERROW: "ISOLATION", WALLET: "WALLET" };
  var roles = { AGENT: "reasoning / relay", TOOL: "MCP boundary", DOCUMENT: "retrieved content", MEMORY: "persistent state", PLANNER: "intent formation", EXECUTOR: "transaction proposal", WALLET: "signing authority", ISOLATION: "quarantine boundary" };
  var checkpoints = {
    I: ["ARCHIVED", "genesis baseline"], II: ["ARCHIVED", "policy v1"], III: ["ARCHIVED", "memory checkpoint"],
    IV: ["ARCHIVED", "provenance seal"], V: ["ARCHIVED", "intent checkpoint"], VI: ["ARCHIVED", "account boundary"],
    VII: ["LAST SAFE", "signed baseline"], VIII: ["CONTAMINATED", "memory drift"], IX: ["UNUSED", "no snapshot"]
  };
  var history = [];
  try { history = JSON.parse(sessionStorage.getItem("merrow.receipts") || "[]"); if (!Array.isArray(history)) history = []; } catch (_) { history = []; }
  var state = {
    network: "solana", wallet: { connected: false, pubkey: null },
    policy: { loaded: false, hash: null, programs: [], mints: [], writableAccounts: [], maxLamports: null, maxTokenAmount: null, maxSlippageBps: null, expiresAt: null, policyVersion: 1 },
    transaction: { loaded: false, parsed: false, simulated: false, simulation: "IDLE", verdict: null, source: null, bytes: null, data: null, reason: "", isVector: false },
    threat: { level: 0, nodes: {}, selected: null, quarantinedNodes: [], lastSeen: {} },
    checkpoint: { current: "VII", selected: "VII", state: "SAFE" },
    lab: { merrow: "AWAKE", rpc: "NOT CHECKED", quarantine: "EMPTY" },
    proof: { mode: "CLEAN", diff: false, selected: null, trace: 0 },
    infection: { scenario: "memory", path: routes.memory.slice(), step: 0, timer: null, running: false },
    receipt: history[0] || null, receipts: history.slice(0, 8), events: []
  };
  window.merrowState = state;
  names.forEach(function (name) { state.threat.nodes[name] = "CLEAN"; });
  var termHistory = [], termIndex = 0, traceSerial = 0, busy = false;
  var terminalLines = ["Merrow terminal awake.", "type help for available commands."];
  function stamp() { return new Date().toLocaleTimeString("en-GB", { hour12: false }); }
  function terminal(line) { terminalLines.push(String(line)); terminalLines = terminalLines.slice(-90); $("terminal-output").textContent = terminalLines.join("\n"); $("terminal-output").scrollTop = $("terminal-output").scrollHeight; }
  function event(name, detail) {
    var line = stamp() + "  " + name + (detail ? "(" + detail + ")" : "");
    state.events.push(line); state.events = state.events.slice(-200);
    $("infection-events").textContent = "EVENT LOG // LOCAL LAB\n" + state.events.slice(-40).join("\n");
    $("infection-events").scrollTop = $("infection-events").scrollHeight;
  }
  function short(s) { return s ? String(s).slice(0, 5) + "..." + String(s).slice(-4) : "—"; }
  function phase(button, label, type, delay) {
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.classList.remove("running", "success", "error");
    button.classList.add(type || "success"); button.textContent = label;
    clearTimeout(button._reset);
    button._reset = setTimeout(function () { button.classList.remove("running", "success", "error"); button.textContent = button.dataset.label; }, delay || 1200);
  }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function emitReceipt(source, verdict, extra) {
    var tx = state.transaction.data, policy = state.policy;
    var receipt = {
      id: "LOCAL-" + Date.now().toString(36).toUpperCase(),
      time: new Date().toISOString(), source: source, scope: "LOCAL LAB HISTORY — NOT ONCHAIN",
      policy_hash: policy.hash, objective_hash: null,
      state_root: state.checkpoint.state === "SAFE" ? "LAB_BASELINE_VII" : "LAB_DRIFT_VIII",
      program_ids: tx ? tx.instructions.map(function (ix) { return ix.programId; }) : [],
      accounts: tx ? tx.metas.map(function (m) { return { pubkey: m.pubkey, signer: m.isSigner, writable: m.isWritable }; }) : [],
      simulation: state.transaction.simulation, verdict: verdict,
      checkpoint: state.checkpoint.current, evidence: extra || null
    };
    state.receipt = receipt;
    state.receipts.unshift(receipt); state.receipts = state.receipts.slice(0, 8);
    try { sessionStorage.setItem("merrow.receipts", JSON.stringify(state.receipts)); } catch (_) {}
    event("receipt.generated", source);
    renderReceipt();
    return receipt;
  }
  async function copyText(value) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(value); return true; } } catch (_) {}
    var area = document.createElement("textarea");
    area.value = value; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.left = "-9999px";
    document.body.appendChild(area); area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    area.remove();
    return ok;
  }
  function renderReceipt() {
    var r = state.receipt;
    $("receipt-summary").textContent = r ? "RECEIPT ID    " + r.id + "\nTIME          " + r.time + "\nSOURCE        " + r.source + "\nPOLICY HASH   " + (r.policy_hash || "NOT COMPILED") + "\nSIMULATION    " + r.simulation + "\nVERDICT       " + r.verdict + "\nCHECKPOINT    " + r.checkpoint + "\n\nLOCAL LAB HISTORY — no blockchain transaction." : "No receipt yet.\nRun a lab operation to generate a local receipt.";
    $("receipt-raw").textContent = r ? JSON.stringify(r, null, 2) : "";
    var box = $("receipt-history"); box.textContent = "LOCAL LAB HISTORY  ";
    if (!state.receipts.length) { box.append("EMPTY"); return; }
    state.receipts.forEach(function (item, i) {
      var b = document.createElement("button"); b.type = "button";
      b.textContent = i === 0 ? "LATEST" : String(i + 1).padStart(2, "0");
      b.title = item.source + " · " + item.verdict;
      b.classList.toggle("active", state.receipt && item.id === state.receipt.id);
      b.addEventListener("click", function () { state.receipt = item; renderReceipt(); });
      box.appendChild(b);
    });
  }
  function renderStatus() {
    var items = [
      ["MERROW", state.lab.merrow, "infection-lab"],
      ["NETWORK", "SOLANA", "transaction-gate"],
      ["RPC", state.lab.rpc, "transaction-gate"],
      ["WALLET", state.wallet.connected ? "CONNECTED " + short(state.wallet.pubkey) : "NOT CONNECTED", "transaction-gate"],
      ["POLICY ENGINE", state.policy.loaded ? "READY" : "WAITING", "policy-builder"],
      ["POLICY", state.policy.loaded ? short(state.policy.hash) : "NOT COMPILED", "policy-builder"],
      ["TRANSACTION", state.transaction.loaded ? (state.transaction.parsed ? "ANALYZED" : "LOADED") : "EMPTY", "transaction-gate"],
      ["VERDICT", state.transaction.verdict || "—", "transaction-gate"],
      ["CHECKPOINT", state.checkpoint.current + " " + state.checkpoint.state, "nine-lives"],
      ["QUARANTINE", state.lab.quarantine, "threat-network"],
      ["THREAT", String(state.threat.level).padStart(2, "0"), "threat-network"],
      ["MINT", "TBA", "aboutme"]
    ];
    var grid = $("lab-status-grid"); grid.textContent = "";
    items.forEach(function (item) {
      var row = document.createElement("div"), value = document.createElement("span");
      row.dataset.target = item[2]; row.tabIndex = 0; row.setAttribute("role", "link");
      row.append(item[0] + " "); value.textContent = item[1]; row.appendChild(value);
      if (/QUARANTINE|DENY|OFFLINE/.test(item[1])) value.classList.add("danger-status");
      row.addEventListener("click", function () { $(item[2]).scrollIntoView({ behavior: "smooth", block: "start" }); });
      row.addEventListener("keydown", function (e) { if (e.key === "Enter") row.click(); });
      grid.appendChild(row);
    });
    $("live-rpc") && ($("live-rpc").textContent = state.lab.rpc);
    $("gate-policy").textContent = state.policy.loaded ? "LOADED " + short(state.policy.hash) : "NOT COMPILED";
    $("gate-status").textContent = state.transaction.loaded ? (state.transaction.parsed ? "ANALYZED" : state.transaction.isVector ? "VECTOR LOADED" : "LOADED") : "READY";
    $("gate-simulation").textContent = state.transaction.simulation;
    $("gate-verdict").textContent = state.transaction.verdict || "—";
    $("wallet-status").textContent = state.wallet.connected ? short(state.wallet.pubkey) : "NOT CONNECTED";
    $("header-wallet").hidden = !state.wallet.connected;
    $("header-wallet").textContent = state.wallet.connected ? "WALLET " + short(state.wallet.pubkey) : "WALLET —";
  }
  function renderTelemetry() {
    var values = Object.values(state.threat.nodes);
    var infected = values.filter(function (s) { return s === "CONTAMINATED"; }).length;
    var exposed = values.filter(function (s) { return s === "EXPOSED"; }).length;
    var quarantined = values.filter(function (s) { return s === "QUARANTINED"; }).length;
    $("infection-telemetry").textContent = "THREAT " + String(state.threat.level).padStart(2, "0") + "   INFECTED " + String(infected).padStart(2, "0") + "   EXPOSED " + String(exposed).padStart(2, "0") + "   QUARANTINED " + String(quarantined).padStart(2, "0") + "   STEP " + String(state.infection.step).padStart(2, "0") + "/" + String(state.infection.path.length).padStart(2, "0");
    document.querySelectorAll("#infection-network [data-node]").forEach(function (el) {
      var name = mapNode[el.dataset.node], value = state.threat.nodes[name] || "CLEAN";
      el.classList.remove("exposed", "contaminated", "quarantined", "safe", "active", "critical");
      if (value !== "CLEAN") el.classList.add(value.toLowerCase());
      el.querySelector(".node-state").textContent = value;
    });
  }
  function showThreat(name) {
    if (!name) { $("threat-inspector").textContent = "SELECT A NODE TO INSPECT"; return; }
    var value = state.threat.nodes[name], depth = { DOCUMENT: 0, TOOL: 1, AGENT: 1, MEMORY: 2, PLANNER: 3, EXECUTOR: 4, WALLET: 5, ISOLATION: 0 }[name];
    var links = { DOCUMENT: "AGENT", AGENT: "DOCUMENT / TOOL / MEMORY", TOOL: "AGENT / PLANNER", MEMORY: "AGENT / PLANNER", PLANNER: "MEMORY / EXECUTOR", EXECUTOR: "PLANNER / WALLET", WALLET: "EXECUTOR", ISOLATION: "QUARANTINED NODES" };
    $("threat-inspector").textContent = "NODE          " + name + "\nROLE          " + roles[name] + "\nORIGIN        " + (name === "DOCUMENT" ? "external content" : name === "MEMORY" ? "agent_a" : "lab network") + "\nDEPTH         " + depth + "\nLAST SEEN     " + (state.threat.lastSeen[name] || "—") + "\nTRUST         " + (value === "CLEAN" ? "UNVERIFIED" : "UNTRUSTED") + "\nSTATE         " + value + "\nCONNECTED TO  " + (value === "QUARANTINED" ? "ISOLATION ONLY" : links[name]) + "\nPOLICY        " + (name === "MEMORY" ? "SIGNED BASELINE REQUIRED" : "PRE-SIGN CHECK");
  }
  function renderThreatLines() {
    var graph = $("threat-graph"), svg = $("threat-lines");
    if (!svg) { svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.id = "threat-lines"; svg.setAttribute("aria-hidden", "true"); graph.appendChild(svg); }
    var rect = graph.getBoundingClientRect(), width = graph.clientWidth, height = graph.clientHeight;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height); svg.textContent = "";
    var pairs = [["DOCUMENT", "AGENT"], ["TOOL", "AGENT"], ["AGENT", "MEMORY"], ["MEMORY", "PLANNER"], ["PLANNER", "EXECUTOR"], ["EXECUTOR", "WALLET"]];
    state.threat.quarantinedNodes.forEach(function (n) { if (n !== "ISOLATION") pairs.push([n, "ISOLATION"]); });
    pairs.forEach(function (pair) {
      var a = graph.querySelector('[data-threat="' + pair[0] + '"]'), b = graph.querySelector('[data-threat="' + pair[1] + '"]');
      if (!a || !b) return;
      if (pair[1] !== "ISOLATION" && (state.threat.nodes[pair[0]] === "QUARANTINED" || state.threat.nodes[pair[1]] === "QUARANTINED")) return;
      var ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", ar.left + ar.width / 2 - rect.left); line.setAttribute("y1", ar.top + ar.height / 2 - rect.top);
      line.setAttribute("x2", br.left + br.width / 2 - rect.left); line.setAttribute("y2", br.top + br.height / 2 - rect.top);
      if (pair[1] === "ISOLATION" || ["EXPOSED", "CONTAMINATED"].includes(state.threat.nodes[pair[0]]) || ["EXPOSED", "CONTAMINATED"].includes(state.threat.nodes[pair[1]])) line.classList.add("infected");
      svg.appendChild(line);
    });
  }
  function renderThreat() {
    document.querySelectorAll("[data-threat]").forEach(function (el) {
      var n = el.dataset.threat, value = state.threat.nodes[n];
      el.classList.remove("selected", "exposed", "contaminated", "quarantined");
      if (value !== "CLEAN") el.classList.add(value.toLowerCase());
      if (state.threat.selected === n) el.classList.add("selected");
      el.title = n + " · " + roles[n] + " · " + value;
    });
    var broken = state.threat.quarantinedNodes.length > 0;
    document.querySelectorAll(".threat-edge").forEach(function (el) { el.classList.toggle("broken", broken); el.classList.toggle("infected", !broken && state.threat.level > 0); });
    renderThreatLines();
    showThreat(state.threat.selected);
    renderTelemetry();
    renderStatus();
  }
  function setVerdict(verdict, source, reason) {
    state.transaction.verdict = verdict; state.transaction.reason = reason || ""; state.lastDecisionSource = source;
    if (source !== "proof.lab") { state.proof.mode = verdict === "QUARANTINE" ? "CONTAMINATED" : verdict === "DENY" ? "DENIED" : "CLEAN"; renderProof(); }
    if (verdict === "QUARANTINE") {
      state.lab.quarantine = state.threat.quarantinedNodes.length ? String(state.threat.quarantinedNodes.length).padStart(2, "0") : "ACTIVE";
      state.checkpoint.state = "CONTAMINATED"; state.checkpoint.current = "VIII";
      state.threat.level = Math.max(state.threat.level, 1);
      terminal("> authority frozen"); terminal("> state quarantined");
    } else if (verdict === "DENY") { state.threat.level++; terminal("> execution denied"); }
    else if (verdict === "ALLOW") { terminal("> policy satisfied in local prototype"); terminal("> wallet request permitted by lab gate — no signature requested"); }
    event("decision." + verdict.toLowerCase(), source);
    emitReceipt(source, verdict, reason);
    renderThreat(); renderLives();
  }
  function setProofMode(mode) {
    traceSerial++; state.proof.mode = mode; state.proof.diff = false; renderProof();
    event("proof.sample", mode.toLowerCase());
    if (mode === "CONTAMINATED") { markNode("MEMORY", "CONTAMINATED"); setVerdict("QUARANTINE", "proof.lab", "LAB SIMULATION: memory drift"); }
    if (mode === "DENIED") setVerdict("DENY", "proof.lab", "LAB SIMULATION: unknown program and writable account");
    if (mode === "CLEAN") {
      if (state.lastDecisionSource === "proof.lab") {
        stopInfection(); names.forEach(function (n) { state.threat.nodes[n] = "CLEAN"; });
        state.threat.quarantinedNodes = []; state.threat.level = 0; state.lab.quarantine = "EMPTY";
        state.checkpoint.current = "VII"; state.checkpoint.state = "SAFE";
        state.transaction.verdict = null; state.transaction.reason = "";
        state.lastDecisionSource = null; renderLives();
      }
      terminal("> clean proof sample loaded"); renderThreat();
      renderProof();
    }
  }
  var fieldInfo = {
    principal: ["signing principal", "must match owner-approved wallet", "DENY", "outside model context"],
    objective_hash: ["signed user objective", "compare current proposal to mandate", "DENY", "owner approval"],
    state_root: ["last owner-approved persistent state", "current memory hash must match signed baseline", "QUARANTINE", "outside model context"],
    program_ids: ["allowed Solana programs", "every instruction Program ID must be permitted", "DENY", "compiled policy"],
    writable_accounts: ["mutable account boundary", "reject unexpected writable account metas", "DENY", "compiled policy"],
    allowed_mints: ["allowed SPL assets", "token mint must be explicit and permitted", "DENY", "compiled policy"],
    max_lamports: ["SOL spending ceiling", "transfer amount must stay within lamport limit", "DENY", "compiled policy"],
    max_slippage_bps: ["slippage ceiling", "compare route quote before signing; parser alone cannot infer it", "DENY", "compiled policy"],
    provenance: ["instruction origin", "untrusted instructions cannot grant authority", "QUARANTINE", "external input"],
    simulation: ["pre-sign execution test", "RPC result required for real transaction ALLOW", "DENY", "Solana RPC"],
    memory: ["persistent state integrity", "compare with signed baseline", "QUARANTINE", "outside model context"]
  };
  function renderProof() {
    var p = state.policy, mode = state.proof.mode;
    document.querySelectorAll("[data-proof]").forEach(function (b) { b.classList.toggle("active", b.dataset.proof === mode); b.classList.toggle("danger", b.dataset.proof !== "CLEAN"); });
    $("proof-state").textContent = "POLICY v" + p.policyVersion + " · SAMPLE " + (mode === "CLEAN" ? "SAFE" : mode) + (state.checkpoint.state !== "SAFE" && mode === "CLEAN" ? " · LAB QUARANTINE ACTIVE" : "");
    var proof = {
      principal: state.wallet.pubkey || "<SOLANA_PUBKEY>", cluster: "mainnet-beta",
      intent: { objective_hash: "<SIGNED_OBJECTIVE>", state_root: mode === "CLEAN" ? "<SIGNED_BASELINE>" : "<MUTATED_STATE>" },
      authority: { program_ids: mode === "DENIED" ? ["unknown_program"] : p.loaded ? p.programs : ["<APPROVED_PROGRAM_01>", "<APPROVED_PROGRAM_02>"], writable_accounts: mode === "DENIED" ? ["unexpected_writable_account"] : p.loaded ? p.writableAccounts : ["<EXPECTED_ACCOUNT>"], allowed_mints: p.loaded ? p.mints : ["<TOKEN_MINT>"] },
      limits: { max_lamports: p.maxLamports || "100000000", max_token_amount: p.maxTokenAmount || "2500000", max_slippage_bps: p.maxSlippageBps === null ? 100 : p.maxSlippageBps, max_recursive_delegation: 1 },
      verification: { provenance: mode === "CLEAN" ? "VERIFIED" : "UNTRUSTED", memory: mode === "CLEAN" ? "BASELINE_MATCH" : "DRIFT_DETECTED", simulation: "REQUIRED", wallet_signature: false },
      expires_at: p.expiresAt || "...", policy_version: p.policyVersion
    };
    if (mode !== "CLEAN") proof.verdict = mode === "DENIED" ? "DENY" : "QUARANTINE";
    var box = $("proof-code"); box.textContent = "";
    JSON.stringify(proof, null, 2).split("\n").forEach(function (line) {
      var el = document.createElement("div"), match = line.match(/^\s*"([^"]+)":/);
      el.className = "proof-line"; el.textContent = line;
      if (match && fieldInfo[match[1]]) {
        el.dataset.field = match[1]; el.tabIndex = 0; el.setAttribute("role", "button");
        if (state.proof.selected === match[1]) el.classList.add("selected");
        if (mode !== "CLEAN" && ["state_root", "provenance", "memory", "program_ids", "writable_accounts", "verdict"].includes(match[1])) el.classList.add("mutation");
        el.addEventListener("click", function () { selectProofField(match[1]); });
        el.addEventListener("keydown", function (e) { if (e.key === "Enter") el.click(); });
      }
      box.appendChild(el);
    });
    if (!state.proof.trace) $("proof-progress").textContent = "LOCAL LAB SCHEMA · click a field · no wallet signature";
  }
  function selectProofField(field) {
    state.proof.selected = field;
    document.querySelectorAll(".proof-line").forEach(function (el) { el.classList.toggle("selected", el.dataset.field === field); });
    var info = fieldInfo[field];
    $("proof-field").textContent = field.toUpperCase().replace(/_/g, " ") + "\n──────────────\nPURPOSE\n" + info[0] + "\n\nCHECK\n" + info[1] + "\n\nFAILURE\n" + info[2] + "\n\nTRUST\n" + info[3];
  }
  async function runTrace() {
    var serial = ++traceSerial, steps = [["principal", "READ PRINCIPAL"], ["objective_hash", "VERIFY OBJECTIVE"], ["state_root", "COMPARE STATE ROOT"], ["program_ids", "CHECK PROGRAM IDS"], ["writable_accounts", "CHECK WRITABLE ACCOUNTS"], ["allowed_mints", "CHECK TOKEN MINTS"], ["max_lamports", "APPLY LIMITS"], ["simulation", "REQUIRE SIMULATION"], ["provenance", "EMIT VERDICT"]];
    state.proof.diff = false; renderProof();
    phase($("proof-trace"), "TRACING...", "running", 3000);
    for (var i = 0; i < steps.length; i++) {
      if (serial !== traceSerial) return;
      state.proof.trace = i + 1; selectProofField(steps[i][0]);
      var line = document.querySelector('.proof-line[data-field="' + steps[i][0] + '"]');
      if (line) { line.classList.add("tracing"); line.scrollIntoView({ block: "nearest" }); }
      $("proof-progress").textContent = "TRACE " + String(i + 1).padStart(2, "0") + "/09  " + steps[i][1] + " ........ " + (state.proof.mode === "CLEAN" ? "PASS" : i >= 2 ? "FAIL" : "PASS");
      await sleep(270);
      if (line) line.classList.remove("tracing");
    }
    if (serial === traceSerial) { state.proof.trace = 0; $("proof-progress").textContent = "VERDICT ........ " + (state.proof.mode === "CLEAN" ? "ALLOW · LAB SAMPLE" : state.proof.mode === "DENIED" ? "DENY" : "QUARANTINE"); event("proof.trace", state.proof.mode.toLowerCase()); phase($("proof-trace"), "TRACED", "success"); }
  }
  function showDiff() {
    traceSerial++; state.proof.diff = !state.proof.diff;
    if (!state.proof.diff) { renderProof(); phase($("proof-diff"), "CODE", "success"); return; }
    $("proof-code").textContent = "";
    var pre = document.createElement("pre"); pre.className = "proof-diff-text";
    pre.textContent = state.proof.mode === "CLEAN" ? "SIGNED BASELINE vs CURRENT STATE\n\nNo policy-relevant mutations in this LAB SAMPLE.\n\nVERDICT: ALLOW (sample only)" : "SIGNED BASELINE vs CURRENT STATE\n\n- state_root: A81D...\n+ state_root: F201...\n\n- provenance: VERIFIED\n+ provenance: UNTRUSTED\n\n- memory: BASELINE_MATCH\n+ memory: DRIFT_DETECTED\n\nMERROW: 3 policy-relevant mutations detected.\nVERDICT: " + (state.proof.mode === "DENIED" ? "DENY" : "QUARANTINE");
    $("proof-code").appendChild(pre);
    $("proof-progress").textContent = "DIFF · deterministic LAB SAMPLE, not a live memory comparison";
    phase($("proof-diff"), "DIFF OPEN", "success"); event("proof.diff", state.proof.mode.toLowerCase());
  }
  function pubkeyValid(value) {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
    var alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", n = 0n;
    for (var i = 0; i < value.length; i++) n = n * 58n + BigInt(alphabet.indexOf(value[i]));
    var bytes = 0; while (n > 0n) { bytes++; n >>= 8n; }
    return bytes + (value.match(/^1*/) || [""])[0].length === 32;
  }
  function lines(id) { return ($(id).value || "").split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function policyError(field, why) {
    $("policy-feedback").textContent = "POLICY ERROR\nFIELD: " + field + "\nREASON: " + why;
    var id = { max_lamports: "policy-sol", max_slippage_bps: "policy-slippage", max_token_amount: "policy-token", expires_at: "policy-expiry" }[field] || "policy-" + field;
    var el = $(id);
    if (el) el.classList.add("field-error");
    phase($("compile-policy"), "POLICY ERROR", "error", 1800);
    terminal("> policy rejected: " + field + " — " + why); event("policy.error", field);
    return false;
  }
  function policyHints() {
    var sol = $("policy-sol").value.trim(), n = Number(sol);
    $("policy-sol-hint").textContent = sol && Number.isFinite(n) && n >= 0 ? Math.round(n * 1e9).toLocaleString("en-US") + " lamports" : sol ? "INVALID SOL AMOUNT" : "";
    var slip = $("policy-slippage").value.trim(), bps = Number(slip);
    $("policy-slippage-hint").textContent = slip && Number.isInteger(bps) && bps >= 0 ? (bps / 100).toFixed(2) + "%" : slip ? "INVALID BPS" : "";
    ["programs", "mints", "writable"].forEach(function (field) {
      var el = $("policy-" + field), values = lines("policy-" + field);
      el.classList.toggle("field-error", values.some(function (s) { return !pubkeyValid(s); }));
    });
  }
  async function compilePolicy() {
    document.querySelectorAll(".policy-form .field-error").forEach(function (el) { el.classList.remove("field-error"); });
    var programs = lines("policy-programs"), mints = lines("policy-mints"), writable = lines("policy-writable");
    if (!programs.length) return policyError("programs", "at least one allowed Program ID is required");
    for (var group of [["programs", programs], ["mints", mints], ["writable", writable]]) {
      if (group[1].some(function (v) { return !pubkeyValid(v); })) return policyError(group[0], "each entry must decode to a 32-byte Solana pubkey");
    }
    var sol = $("policy-sol").value.trim(), value = Number(sol);
    if (!sol || !Number.isFinite(value) || value < 0 || value > 1e9 || !Number.isSafeInteger(Math.round(value * 1e9))) return policyError("max_lamports", "enter a finite non-negative SOL limit");
    var bpsText = $("policy-slippage").value.trim(), bps = Number(bpsText);
    if (!bpsText || !Number.isInteger(bps) || bps < 0 || bps > 10000) return policyError("max_slippage_bps", "must be an integer between 0 and 10000");
    var token = $("policy-token").value.trim();
    if (token && !/^\d+$/.test(token)) return policyError("max_token_amount", "must be a non-negative integer in base units");
    var expiry = $("policy-expiry").value;
    if (expiry && new Date(expiry).getTime() <= Date.now()) return policyError("expires_at", "must be in the future");
    var policy = {
      network: "solana", programs: programs, mints: mints, writable_accounts: writable,
      max_lamports: String(Math.round(value * 1e9)), max_token_amount: token || null,
      max_slippage_bps: bps, expires_at: expiry ? new Date(expiry).toISOString() : null, policy_version: 1
    };
    if (!crypto.subtle) return policyError("hash", "Web Crypto is unavailable in this browser context");
    var bytes = new TextEncoder().encode(JSON.stringify(policy));
    var digest = await crypto.subtle.digest("SHA-256", bytes);
    var hash = Array.from(new Uint8Array(digest), function (v) { return v.toString(16).padStart(2, "0"); }).join("");
    state.policy = { loaded: true, hash: hash, programs: programs, mints: mints, writableAccounts: writable, maxLamports: policy.max_lamports, maxTokenAmount: token || null, maxSlippageBps: bps, expiresAt: policy.expires_at, policyVersion: 1 };
    $("policy-json").textContent = JSON.stringify(policy, null, 2);
    $("policy-feedback").textContent = "POLICY HASH  " + hash.slice(0, 12) + "..." + hash.slice(-8) + "\nLOCAL SESSION · transaction gate now uses this policy";
    $("infection-policy").textContent = "POLICY HASH  " + short(hash) + "\nPROGRAMS     " + programs.join(", ") + "\nMINTS        " + (mints.join(", ") || "none") + "\nMAX LAMPORTS " + policy.max_lamports + "\nON DRIFT     QUARANTINE";
    event("policy.compiled", short(hash)); terminal("> policy compiled " + short(hash));
    phase($("compile-policy"), "COMPILED", "success");
    renderStatus(); renderProof();
  }
  function vectorBytes() {
    var bytes = [1]; for (var i = 0; i < 64; i++) bytes.push(0);
    bytes.push(1, 0, 1, 3);
    for (var a = 0; a < 32; a++) bytes.push(7);
    for (var b = 0; b < 32; b++) bytes.push(8);
    for (var c = 0; c < 32; c++) bytes.push(0);
    for (var d = 0; d < 32; d++) bytes.push(2);
    bytes.push(1, 2, 2, 0, 1, 12, 2, 0, 0, 0, 128, 150, 152, 0, 0, 0, 0, 0);
    return new Uint8Array(bytes);
  }
  function loadVector() {
    var bytes = vectorBytes(), encoded = btoa(Array.from(bytes, function (n) { return String.fromCharCode(n); }).join(""));
    $("tx-input").value = encoded;
    state.transaction = { loaded: true, parsed: false, simulated: false, simulation: "IDLE", verdict: null, source: "LAB TEST VECTOR", bytes: bytes, data: null, reason: "", isVector: true };
    $("gate-output").textContent = "DETERMINISTIC LAB TEST VECTOR LOADED\nUnsigned System Program transfer · 10,000,000 lamports.\nClick ANALYZE. No RPC or signing has occurred.";
    $("gate-log").textContent = "> test vector loaded\n";
    event("transaction.loaded", "lab_vector"); terminal("> test vector loaded");
    phase($("load-vector"), "VECTOR LOADED", "success"); renderStatus();
  }
  function describeTransaction(parsed) {
    var lines = ["MERROW // TRANSACTION GATE", "PROTOTYPE // LOCAL PARSER", state.transaction.isVector ? "LAB TEST VECTOR · no onchain transaction" : "SERIALIZED TRANSACTION · no signature requested", "", "FORMAT      " + (parsed.version === null ? "legacy" : "v" + parsed.version), "SIGNATURES  " + parsed.signatureCount, "PROGRAMS    " + parsed.instructions.length, "SIGNERS     " + parsed.metas.filter(function (m) { return m.isSigner; }).length, "WRITABLE    " + parsed.metas.filter(function (m) { return m.isWritable; }).length, ""];
    parsed.instructions.forEach(function (ix, i) {
      lines.push("INSTRUCTION " + (i + 1) + " · " + ix.programId);
      lines.push("  accounts " + ix.accountMetas.length + " · data " + ix.dataHex.slice(0, 32));
    });
    lines.push("", "POLICY      " + (state.policy.loaded ? short(state.policy.hash) : "NOT COMPILED"), "SIMULATION  " + state.transaction.simulation, "VERDICT     " + (state.transaction.verdict || "PENDING"), "REASON      " + state.transaction.reason);
    $("gate-output").textContent = lines.join("\n");
  }
  function policyCheck(parsed) {
    var p = state.policy;
    if (!p.loaded) return { verdict: "DENY", reason: "compile a policy before analysis" };
    if (p.expiresAt && new Date(p.expiresAt).getTime() <= Date.now()) return { verdict: "DENY", reason: "policy expired" };
    if (parsed.lookups) return { verdict: "QUARANTINE", reason: "address lookup table accounts are unresolved by this local parser" };
    if (!parsed.instructions.length) return { verdict: "DENY", reason: "no instructions" };
    var unknown = parsed.instructions.filter(function (ix) { return !p.programs.includes(ix.programId); });
    if (unknown.length) return { verdict: "DENY", reason: "Program ID outside compiled allowlist: " + unknown[0].programId };
    var unexpected = parsed.metas.filter(function (m) { return m.isWritable && !p.writableAccounts.includes(m.pubkey); });
    if (unexpected.length) return { verdict: "DENY", reason: "unexpected writable account: " + unexpected[0].pubkey };
    for (var ix of parsed.instructions) {
      if (ix.programId === SYSTEM && ix.data.length >= 12 && ix.data[0] === 2 && ix.data[1] === 0 && ix.data[2] === 0 && ix.data[3] === 0) {
        var amount = 0n; for (var i = 7; i >= 0; i--) amount = (amount << 8n) + BigInt(ix.data[4 + i]);
        if (amount > BigInt(p.maxLamports)) return { verdict: "DENY", reason: "SOL transfer exceeds max_lamports" };
      } else if (ix.programId === SYSTEM) return { verdict: "QUARANTINE", reason: "System instruction semantics not decoded by this prototype" };
      else if (ix.programId === parser.tokenProgram || ix.programId === parser.token2022Program) {
        if (ix.data[0] === 3) return { verdict: "QUARANTINE", reason: "SPL Transfer does not encode a mint; cannot verify mint allowlist locally" };
        if (ix.data[0] === 12 && ix.data.length >= 10) {
          var mint = ix.accountMetas[1] && ix.accountMetas[1].pubkey;
          if (!mint || !p.mints.includes(mint)) return { verdict: "DENY", reason: "SPL token mint outside compiled allowlist" };
          var tokenAmount = 0n; for (var k = 8; k >= 1; k--) tokenAmount = (tokenAmount << 8n) + BigInt(ix.data[k]);
          if (p.maxTokenAmount && tokenAmount > BigInt(p.maxTokenAmount)) return { verdict: "DENY", reason: "token transfer exceeds max_token_amount" };
        } else return { verdict: "QUARANTINE", reason: "SPL instruction semantics not decoded by this prototype" };
      } else return { verdict: "QUARANTINE", reason: "allowed Program ID, but instruction semantics not decoded by this prototype" };
    }
    if (state.checkpoint.state !== "SAFE" || state.threat.nodes.MEMORY === "CONTAMINATED") return { verdict: "QUARANTINE", reason: "LAB SIMULATION: persistent state drift" };
    return { verdict: null, reason: "local policy checks passed; simulation required before ALLOW" };
  }
  async function analyzeTransaction() {
    if (busy) { terminal("> analysis already running"); return; }
    var raw = $("tx-input").value.trim();
    if (!raw) { $("gate-log").textContent = "NO TRANSACTION LOADED"; terminal("> analysis rejected: no transaction bytes"); phase($("analyze-tx"), "NO TX", "error"); return; }
    busy = true; phase($("analyze-tx"), "ANALYZING...", "running", 3000);
    var steps = ["decoding message...", "reading account keys...", "extracting program ids...", "classifying writable accounts...", "checking signer set...", "detecting token instructions...", "evaluating policy..."];
    $("gate-log").textContent = "";
    try {
      var bytes = parser.decodeInput(raw), parsed = parser.parseTransaction(bytes);
      state.transaction.loaded = true; state.transaction.parsed = true; state.transaction.bytes = bytes; state.transaction.data = parsed;
      state.transaction.simulated = false; state.transaction.simulation = "NOT RUN"; state.transaction.verdict = null;
      for (var i = 0; i < steps.length; i++) {
        $("gate-status").textContent = ["DECODING", "ACCOUNT KEYS", "PROGRAM IDS", "WRITABLES", "SIGNERS", "TOKEN IX", "POLICY CHECK"][i];
        $("gate-log").textContent += "[" + String(i + 1).padStart(2, "0") + "] " + steps[i] + "\n";
        if (i === 2) selectProofField("program_ids");
        if (i === 3) selectProofField("writable_accounts");
        await sleep(85);
      }
      var decision = policyCheck(parsed);
      state.transaction.reason = decision.reason;
      if (decision.verdict) setVerdict(decision.verdict, "transaction.analysis", decision.reason);
      else { event("transaction.parsed", state.transaction.isVector ? "lab_vector" : "serialized"); emitReceipt("transaction.analysis", "PENDING_SIMULATION", decision.reason); renderStatus(); }
      $("gate-log").textContent += "ANALYSIS COMPLETE\n";
      describeTransaction(parsed); selectProofField(decision.reason.includes("writable") ? "writable_accounts" : decision.reason.includes("Program") ? "program_ids" : "state_root");
      terminal("> analysis complete: " + (decision.verdict || "simulation required"));
      phase($("analyze-tx"), "ANALYZED", "success");
    } catch (err) {
      state.transaction.loaded = true; state.transaction.parsed = false; state.transaction.simulation = "NOT RUN";
      state.transaction.verdict = "DENY"; state.transaction.reason = err.message;
      $("gate-output").textContent = "TRANSACTION REJECTED\n" + err.message + "\nNo result inferred from invalid bytes.";
      $("gate-log").textContent += "PARSER ERROR: " + err.message;
      event("transaction.parse_error", err.message); terminal("> analysis rejected: " + err.message);
      emitReceipt("transaction.parse", "DENY", err.message); renderStatus();
      phase($("analyze-tx"), "ERROR", "error");
    } finally { busy = false; }
  }
  async function simulateTransaction() {
    var t = state.transaction;
    if (!t.loaded || !t.parsed || !t.bytes) { $("gate-log").textContent = "NO PARSED TRANSACTION\nClick ANALYZE first."; terminal("> simulation rejected: no parsed transaction bytes"); phase($("simulate-tx"), "NO TX", "error"); return; }
    if (busy) { terminal("> another process is running"); return; }
    busy = true; phase($("simulate-tx"), "SIMULATING...", "running", 5000);
    try {
      var check = policyCheck(t.data);
      if (check.verdict) { t.simulation = "NOT RUN · POLICY BLOCK"; setVerdict(check.verdict, "simulation.policy", check.reason); $("gate-log").textContent = "SIMULATION BLOCKED BY POLICY\n" + check.reason; phase($("simulate-tx"), "BLOCKED", "error"); return; }
      if (t.isVector) {
        await sleep(420); t.simulated = true; t.simulation = "LAB SIMULATION PASS";
        $("gate-log").textContent = "LAB SIMULATION\nDeterministic local vector passed compiled policy.\nNO RPC REQUEST · NO CHAIN RESULT";
        event("simulation.lab_passed", "vector"); setVerdict("ALLOW", "simulation.lab", "LAB SIMULATION only; no onchain execution");
      } else {
        $("gate-log").textContent = "REQUESTING SOLANA RPC SIMULATION...\n";
        try {
          var result = await parser.simulate(t.bytes);
          state.lab.rpc = "ONLINE"; t.simulated = true; t.simulation = result.err ? "RPC ERROR" : "RPC PASS";
          $("gate-log").textContent = "RPC SIMULATION\nCOMPUTE UNITS  " + (result.unitsConsumed == null ? "UNAVAILABLE" : result.unitsConsumed) + "\nERROR          " + JSON.stringify(result.err) + "\nINNER IX       " + (result.innerInstructions ? JSON.stringify(result.innerInstructions).slice(0, 800) : "UNAVAILABLE") + "\nPROGRAM LOGS\n" + (result.logs || []).slice(0, 12).join("\n");
          event(result.err ? "simulation.failed" : "simulation.passed", "rpc");
          setVerdict(result.err ? "DENY" : "ALLOW", "simulation.rpc", result.err ? JSON.stringify(result.err) : "RPC simulation passed local compiled policy; signed objective and state baseline are not verified by this prototype");
        } catch (err) {
          state.lab.rpc = "OFFLINE"; t.simulation = "RPC UNAVAILABLE";
          $("gate-log").textContent = "RPC UNAVAILABLE\n" + err.message + "\nNo simulation result was inferred.";
          event("simulation.unavailable", err.message);
          setVerdict("QUARANTINE", "simulation.rpc", "RPC unavailable; cannot authorize real transaction");
        }
      }
      describeTransaction(t.data); renderStatus();
      phase($("simulate-tx"), "SIMULATED", t.simulated ? "success" : "error");
    } finally { busy = false; }
  }
  function clearTransaction() {
    state.transaction = { loaded: false, parsed: false, simulated: false, simulation: "IDLE", verdict: null, source: null, bytes: null, data: null, reason: "", isVector: false };
    $("tx-input").value = ""; $("gate-log").textContent = "TRANSACTION CLEARED";
    $("gate-output").textContent = "PROTOTYPE READY\nWaiting for a serialized transaction.\nNo result is inferred without bytes.";
    event("transaction.cleared"); terminal("> transaction cleared"); renderStatus(); phase($("clear-gate"), "CLEARED", "success");
  }
  function markNode(name, value) {
    state.threat.nodes[name] = value;
    state.threat.lastSeen[name] = stamp();
    state.threat.level = Object.values(state.threat.nodes).filter(function (v) { return v === "EXPOSED" || v === "CONTAMINATED"; }).length;
    renderThreat();
  }
  function stopInfection() {
    if (state.infection.timer) clearInterval(state.infection.timer);
    state.infection.timer = null; state.infection.running = false;
  }
  function syncInfectionTimer() {
    if (state.infection.timer) { clearInterval(state.infection.timer); state.infection.timer = null; }
    if (state.infection.running && infectionVisible && !document.hidden) state.infection.timer = setInterval(infectionStep, 480);
  }
  function resetInfection() {
    stopInfection(); state.infection.step = 0; state.infection.path = routes[state.infection.scenario].slice();
    names.forEach(function (n) { state.threat.nodes[n] = "CLEAN"; });
    state.threat.quarantinedNodes = []; state.threat.level = 0; state.threat.selected = null;
    state.lab.quarantine = "EMPTY"; state.checkpoint.current = "VII"; state.checkpoint.state = "SAFE";
    if (state.lastDecisionSource === "infection.lab") { state.transaction.verdict = null; state.transaction.reason = ""; state.lastDecisionSource = null; }
    $("infection-verdict").textContent = "VERDICT: —\nMERROW STATUS: AWAKE\nWALLET: SAFE\nLAB SIMULATION RESET";
    document.querySelectorAll(".infection-lines line").forEach(function (l) { l.classList.remove("active"); });
    state.proof.mode = "CLEAN"; renderProof(); renderThreat(); renderLives();
    event("infection.reset"); terminal("> lab infection scenario reset");
    phase($("reset-infection"), "RESET", "success");
  }
  function selectInfectionNode(name) {
    var n = mapNode[name], value = state.threat.nodes[n] || "CLEAN";
    $("infection-inspector").textContent = "NODE          " + name + "\nROLE          " + roles[n] + "\nSOURCE        LAB SIMULATION\nSTATE         " + value + "\nMEMORY ROOT   " + (state.checkpoint.state === "SAFE" ? "BASELINE VII" : "DRIFT VIII") + "\nPOLICY        " + (state.policy.loaded ? short(state.policy.hash) : "NOT COMPILED") + "\nSIGNATURE     NEVER REQUESTED";
  }
  function infectionStep() {
    var inf = state.infection;
    if (inf.step >= inf.path.length) { stopInfection(); phase($("step-infection"), "SCENARIO COMPLETE", "success"); terminal("> infection scenario complete"); return; }
    var labName = inf.path[inf.step], name = mapNode[labName];
    if (state.threat.quarantinedNodes.includes(name)) {
      $("infection-verdict").textContent = "PROPAGATION STOPPED\n" + name + " ISOLATED\nLAB SIMULATION";
      event("infection.path_blocked", name.toLowerCase()); terminal("> infection path blocked at " + name.toLowerCase());
      stopInfection(); return;
    }
    inf.step++;
    if (name === "ISOLATION") {
      $("infection-verdict").textContent = "MERROW INTERCEPTS\nSOURCE: " + inf.scenario.toUpperCase() + "\nWALLET: SAFE\nLAB SIMULATION";
      event("infection.intercepted", inf.scenario);
      setVerdict("QUARANTINE", "infection.lab", "LAB SIMULATION: agent instruction propagated to pre-sign boundary");
      stopInfection(); return;
    }
    markNode(name, inf.step === 1 ? "EXPOSED" : "CONTAMINATED");
    state.threat.selected = name; renderThreat(); selectInfectionNode(labName);
    var edges = document.querySelectorAll(".infection-lines line");
    if (edges[inf.step - 1]) edges[inf.step - 1].classList.add("active");
    event("infection.detected", name.toLowerCase());
    terminal("> " + name.toLowerCase() + " " + state.threat.nodes[name].toLowerCase() + " · LAB");
    $("infection-verdict").textContent = "CURRENT NODE: " + name + "\nSTATE: " + state.threat.nodes[name] + "\nPOLICY: " + (state.policy.loaded ? "COMPILED" : "NOT COMPILED") + "\nWALLET: SAFE";
    phase($("step-infection"), "STEP " + inf.step, "success", 550);
  }
  function runInfection() {
    resetInfection(); state.infection.running = true; infectionStep();
    syncInfectionTimer();
    phase($("run-infection"), "RUNNING", "running", 3500);
    event("infection.started", state.infection.scenario);
  }
  var infectionVisible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (entries) { infectionVisible = entries[0].isIntersecting; syncInfectionTimer(); }, { threshold: 0 }).observe($("infection-lab"));
  document.addEventListener("visibilitychange", syncInfectionTimer);
  function isolateNode(name) {
    name = name || state.threat.selected;
    if (!name || name === "ISOLATION") {
      phase($("isolate-threat"), "SELECT NODE FIRST", "error", 1400);
      terminal("> select an active node first"); return;
    }
    state.threat.selected = name;
    if (!state.threat.quarantinedNodes.includes(name)) state.threat.quarantinedNodes.push(name);
    markNode(name, "QUARANTINED"); stopInfection();
    state.lab.quarantine = String(state.threat.quarantinedNodes.length).padStart(2, "0");
    document.querySelectorAll(".infection-lines line").forEach(function (l) { l.classList.remove("active"); });
    $("infection-verdict").textContent = "PROPAGATION PATH CUT\nNODE: " + name + "\nSTATE: QUARANTINED\nLAB SIMULATION";
    event("node.isolated", name.toLowerCase()); terminal("> node " + name.toLowerCase() + " isolated");
    emitReceipt("node.isolation.lab", "QUARANTINE", "LAB SIMULATION: " + name + " moved to isolation");
    renderThreat(); phase($("isolate-threat"), "ISOLATED " + name, "success");
  }
  function renderLives() {
    document.querySelectorAll("[data-life]").forEach(function (b) {
      var n = b.dataset.life; b.title = n + " · " + checkpoints[n][0] + " · " + checkpoints[n][1];
      b.classList.toggle("selected", state.checkpoint.selected === n);
      b.classList.toggle("contaminated", n === "VIII" && state.checkpoint.state === "CONTAMINATED");
      b.classList.toggle("safe", n === "VII" && state.checkpoint.state === "SAFE");
    });
    var n = state.checkpoint.selected, info = checkpoints[n];
    $("life-inspector").textContent = "CHECKPOINT     " + n + "\nSTATE          " + (n === "VII" && state.checkpoint.state === "SAFE" ? "ACTIVE / LAST SAFE" : n === "VIII" && state.checkpoint.state === "SAFE" ? "QUARANTINED HISTORY" : info[0]) + "\nEVIDENCE       " + info[1] + "\nMEMORY ROOT    " + (n === "VII" ? "A81D... / LAB SCENARIO" : n === "VIII" ? "F201... / LAB SCENARIO" : n === "IX" ? "NOT CREATED" : "SEALED / LAB SCENARIO") + "\nPOLICY HASH    " + (state.policy.hash ? short(state.policy.hash) : "NOT COMPILED") + "\nCONTAMINATION  " + (n === "VIII" ? "memory drift scenario" : "none") + "\n\nLOCAL CHECKPOINT DEMO — not signed or onchain.";
    renderStatus();
  }
  function corruptState() {
    state.checkpoint.current = "VIII"; state.checkpoint.selected = "VIII"; state.checkpoint.state = "CONTAMINATED";
    markNode("MEMORY", "CONTAMINATED"); state.proof.mode = "CONTAMINATED"; renderProof();
    event("checkpoint.corrupted", "viii"); setVerdict("QUARANTINE", "checkpoint.lab", "LAB SIMULATION: memory root drift");
    phase($("corrupt-state"), "CONTAMINATED", "error"); renderLives();
  }
  function compareLives() {
    var el = $("life-compare"); el.hidden = !el.hidden;
    el.textContent = "CHECKPOINT DIFF // LAB SCENARIO\nMEMORY ROOT     VII A81D...  VIII F201...\nPOLICY HASH     same compiled policy\nAUTHORITY       VII active  VIII revoked\nCONTAMINATION   VII none  VIII memory drift\n\nRECOVERY TARGET VII";
    event("checkpoint.compared", "vii_viii"); phase($("compare-lives"), el.hidden ? "COMPARE CLOSED" : "COMPARING", "success");
  }
  async function recoverState() {
    if (busy) { terminal("> another process is running"); return; }
    busy = true; phase($("recover-state"), "RECOVERING...", "running", 3500);
    var steps = ["freeze authority", "preserve current evidence", "locate checkpoint VII", "verify policy hash", "restore memory baseline", "validate state", "reconnect safe nodes", "authority restored"];
    for (var step of steps) { terminal("> " + step + " · LAB"); $("life-inspector").textContent = "RECOVERY // LAB SIMULATION\n" + step; await sleep(115); }
    stopInfection(); names.forEach(function (n) { state.threat.nodes[n] = "CLEAN"; });
    state.threat.level = 0; state.threat.quarantinedNodes = []; state.lab.quarantine = "EMPTY"; state.lab.merrow = "AWAKE";
    state.checkpoint.current = "VII"; state.checkpoint.selected = "VII"; state.checkpoint.state = "SAFE";
    state.transaction.verdict = null; state.transaction.simulated = false; state.transaction.simulation = "IDLE";
    state.proof.mode = "CLEAN"; renderProof(); renderThreat(); renderLives();
    $("infection-verdict").textContent = "RECOVERY COMPLETE\nINFECTION LAB: CLEAN\nWALLET: SAFE\nLAB SIMULATION";
    event("checkpoint.restored", "vii"); emitReceipt("recovery.lab", "RECOVER", "LAB SIMULATION: checkpoint VII restored");
    phase($("recover-state"), "RECOVERED", "success"); busy = false;
  }
  var commands = ["help", "status", "policy", "tx", "analyze", "simulate", "infect", "threats", "nodes", "inspect memory", "isolate memory", "lives", "checkpoint 7", "recover 7", "receipts", "receipt latest", "events", "clear", "scan", "network", "quarantine"];
  function command(input) {
    var c = input.trim().toLowerCase();
    if (!c) return;
    terminal("merrow@immunity-lab:~$ " + input);
    termHistory.push(input); termHistory = termHistory.slice(-60); termIndex = termHistory.length;
    event("terminal.command", c);
    if (c === "help") terminal(commands.join("  ·  "));
    else if (c === "status") terminal("MERROW " + state.lab.merrow + " · RPC " + state.lab.rpc + " · WALLET " + (state.wallet.connected ? short(state.wallet.pubkey) : "NONE") + " · POLICY " + (state.policy.loaded ? short(state.policy.hash) : "NOT COMPILED") + " · TX " + (state.transaction.parsed ? "ANALYZED" : state.transaction.loaded ? "LOADED" : "EMPTY") + " · CHECKPOINT " + state.checkpoint.current + " · QUARANTINE " + state.lab.quarantine);
    else if (c === "policy") terminal(state.policy.loaded ? JSON.stringify(state.policy, null, 2) : "POLICY NOT COMPILED");
    else if (c === "tx") terminal(state.transaction.loaded ? "TX " + (state.transaction.parsed ? "ANALYZED" : "LOADED") + " · " + (state.transaction.source || "SERIALIZED") + " · " + (state.transaction.verdict || "NO VERDICT") : "NO TRANSACTION LOADED");
    else if (c === "analyze") analyzeTransaction();
    else if (c === "simulate") simulateTransaction();
    else if (c === "infect") runInfection();
    else if (c === "threats" || c === "network" || c === "nodes") terminal(names.map(function (n) { return n.padEnd(12) + state.threat.nodes[n]; }).join("\n"));
    else if (c === "inspect memory") { state.threat.selected = "MEMORY"; renderThreat(); terminal($("threat-inspector").textContent); }
    else if (c === "isolate memory") isolateNode("MEMORY");
    else if (c === "lives") terminal(Object.keys(checkpoints).map(function (n) { return n + " " + checkpoints[n][0] + " · " + checkpoints[n][1]; }).join("\n"));
    else if (c === "checkpoint 7") { state.checkpoint.selected = "VII"; renderLives(); terminal($("life-inspector").textContent); }
    else if (c === "recover 7") recoverState();
    else if (c === "receipts") terminal(state.receipts.length ? state.receipts.map(function (r) { return r.id + "  " + r.verdict + "  " + r.source; }).join("\n") : "NO LOCAL RECEIPTS");
    else if (c === "receipt latest") terminal(state.receipts.length ? JSON.stringify(state.receipts[0], null, 2) : "NO LOCAL RECEIPT");
    else if (c === "events") terminal(state.events.slice(-15).join("\n") || "NO EVENTS");
    else if (c === "quarantine") terminal("QUARANTINE " + state.lab.quarantine + " · " + (state.threat.quarantinedNodes.join(", ") || "no isolated nodes"));
    else if (c === "scan") terminal("LOCAL SCAN · threat " + state.threat.level + " · memory " + state.threat.nodes.MEMORY + " · no live mainnet detection");
    else if (c === "clear") { terminalLines = []; $("terminal-output").textContent = ""; }
    else terminal("UNKNOWN COMMAND: " + c + "\nType help.");
  }
  function addInlineNotes() {
    var notes = {
      "Sentinel": "INPUT   retrieved text / tool output\nCHECK   instruction provenance\nOUTPUT  source evidence",
      "Soul Integrity": "INPUT   persistent memory\nCHECK   signed state baseline\nOUTPUT  drift evidence",
      "Intent Firewall": "INPUT   owner objective + transaction\nCHECK   objective binding\nOUTPUT  policy match",
      "Transaction Guard": "INPUT   serialized Solana message\nCHECKS  Program IDs / Account Metas / mints\nOUTPUT  policy evidence",
      "Simulation Gate": "INPUT   serialized transaction\nCHECK   optional Solana RPC simulation\nOUTPUT  logs / error / compute units",
      "Pawprint Receipts": "INPUT   policy verdict\nCHECK   local evidence snapshot\nOUTPUT  local JSON receipt",
      "Nine Lives": "INPUT   LAB state scenario\nCHECK   checkpoint VII versus VIII\nOUTPUT  local recovery trace"
    };
    document.querySelectorAll("#protocol-components li").forEach(function (li) {
      var b = li.querySelector("b"); if (!b) return;
      b.tabIndex = 0; b.setAttribute("role", "button");
      var note = document.createElement("pre"); note.className = "inline-note component-note"; note.hidden = true; note.textContent = notes[b.textContent] || "IMPLEMENTATION DETAIL UNAVAILABLE";
      li.appendChild(note);
      function toggle() { note.hidden = !note.hidden; event("component.inspected", b.textContent.toLowerCase().replace(/ /g, "_")); }
      b.addEventListener("click", toggle); b.addEventListener("keydown", function (e) { if (e.key === "Enter") toggle(); });
    });
    var cases = {
      ALLOW: "PROGRAM       approved\nSTATE         clean\nSIMULATION    pass\nVERDICT       ALLOW · LAB CASE",
      DENY: "PROGRAM       unknown\nWRITABLE      unexpected\nVERDICT       DENY · LAB CASE",
      QUARANTINE: "STATE         drift detected\nAUTHORITY     frozen\nRECOVERY      checkpoint VII\nVERDICT       QUARANTINE · LAB CASE",
      RECOVER: "CHECKPOINT    VII\nMEMORY        baseline restored\nVERDICT       RECOVER · LAB CASE"
    };
    document.querySelectorAll("#decision-states b").forEach(function (b) {
      b.tabIndex = 0; b.setAttribute("role", "button");
      function show() { var box = $("decision-case"); box.hidden = false; box.textContent = cases[b.textContent]; event("decision.case", b.textContent.toLowerCase()); }
      b.addEventListener("click", show); b.addEventListener("keydown", function (e) { if (e.key === "Enter") show(); });
    });
    var whys = [
      "language output cannot change authority policy",
      "retrieved instructions lack owner approval",
      "narrow grants reduce blast radius",
      "execution failures cost less before authorization",
      "a decision without evidence cannot be audited",
      "containment precedes investigation"
    ];
    document.querySelectorAll("#operator-rules li").forEach(function (li, i) { li.dataset.why = whys[i]; });
  }
  function setupPaper() {
    var frame = document.querySelector('iframe[title="Merrow protocol paper"]');
    if (!frame) return;
    function install() {
      try {
        var doc = frame.contentDocument, rows = doc.querySelectorAll(".tbl tbody tr");
        if (doc.querySelector(".merrow-paper-note")) return;
        var details = {
          Sentinel: "inputs: retrieved text / MCP output\noutput: provenance evidence\nstatus: prototype",
          "Soul Integrity": "inputs: persistent state\noutput: baseline comparison\nstatus: prototype",
          "Intent Firewall": "inputs: objective hash\noutput: intent match\nstatus: prototype",
          "Transaction Guard": "inputs: Program IDs / Account Metas / instructions / token mints\noutput: policy evidence\nstatus: local parser prototype",
          "Simulation Gate": "inputs: serialized transaction\noutput: RPC logs / compute units / errors\nstatus: optional RPC",
          Quarantine: "inputs: suspicious state\noutput: frozen LAB path\nstatus: simulation",
          Recovery: "inputs: checkpoint VII\noutput: local recovery trace\nstatus: simulation"
        };
        var style = doc.createElement("style");
        style.textContent = ".tbl tbody tr{cursor:pointer}.tbl tbody tr:hover,.tbl tbody tr.paper-active{background:#edf4e8}.merrow-paper-note{float:right;width:190px;border:1px solid #aaa;background:#fbfcf8;padding:7px;margin:5px 0 8px 12px;font:10px/1.4 Consolas,monospace;white-space:pre-wrap;cursor:pointer}@media(max-width:700px){.merrow-paper-note{float:none;width:auto}}";
        doc.head.appendChild(style);
        var note = doc.createElement("div"); note.className = "merrow-paper-note"; note.hidden = true;
        note.title = "Click to close";
        note.addEventListener("click", function () { note.hidden = true; rows.forEach(function (r) { r.classList.remove("paper-active"); }); });
        var table = doc.querySelector(".tbl"); table.parentNode.insertBefore(note, table);
        rows.forEach(function (row) {
          var name = row.cells[0].textContent.trim();
          row.addEventListener("click", function () {
            var open = !note.hidden && row.classList.contains("paper-active");
            rows.forEach(function (r) { r.classList.remove("paper-active"); });
            note.hidden = open;
            if (!open) { row.classList.add("paper-active"); note.textContent = "MERROW NOTE\n" + name.toUpperCase() + "\n──────────\n" + (details[name] || "status: prototype"); }
            event("paper.inspected", name.toLowerCase().replace(/ /g, "_"));
          });
        });
      } catch (_) { /* embedded paper still works if cross-origin */ }
    }
    frame.addEventListener("load", install);
    if (frame.contentDocument && frame.contentDocument.readyState === "complete") install();
  }
  function setupNavigation() {
    var links = Array.from(document.querySelectorAll("nav .menu a[href^='#']"));
    function update() {
      var active = null;
      links.forEach(function (a) { if (a.getAttribute("href") === "#run" && location.hash !== "#run") return; var el = document.querySelector(a.getAttribute("href")); if (el && el.getBoundingClientRect().top <= innerHeight * .38) active = a; });
      if (!active) active = document.querySelector('nav .menu a[href="./"]');
      document.querySelectorAll("nav .menu a").forEach(function (a) { a.classList.toggle("section-active", a === active); });
    }
    var ticking = false;
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { update(); ticking = false; }); } }, { passive: true });
    links.forEach(function (a) { a.addEventListener("click", function () { setTimeout(update, 100); }); });
    update();
    requestAnimationFrame(update);
    addEventListener("load", update);
    setTimeout(update, 180);
  }
  async function checkRpcHealth() {
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost") { state.lab.rpc = "LOCAL PREVIEW"; renderStatus(); return; }
    state.lab.rpc = "CHECKING"; renderStatus();
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var response = await fetch("/api/rpc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }) });
        var json = await response.json();
        if (response.ok && json.result === "ok") { state.lab.rpc = "ONLINE"; break; }
      } catch (_) {}
      if (attempt === 0) { state.lab.rpc = "RETRYING"; renderStatus(); await sleep(900); }
      else state.lab.rpc = "OFFLINE";
    }
    event("rpc." + state.lab.rpc.toLowerCase()); renderStatus();
  }
  function setupControls() {
    document.querySelectorAll("[data-proof]").forEach(function (b) { b.addEventListener("click", function () { setProofMode(b.dataset.proof); }); });
    $("proof-trace").addEventListener("click", runTrace); $("proof-diff").addEventListener("click", showDiff);
    $("compile-policy").addEventListener("click", compilePolicy);
    ["policy-sol", "policy-slippage", "policy-programs", "policy-mints", "policy-writable"].forEach(function (id) { $(id).addEventListener("input", policyHints); });
    $("load-vector").addEventListener("click", loadVector); $("analyze-tx").addEventListener("click", analyzeTransaction);
    $("simulate-tx").addEventListener("click", simulateTransaction); $("clear-gate").addEventListener("click", clearTransaction);
    $("tx-input").addEventListener("input", function () { state.transaction.isVector = false; state.transaction.source = "SERIALIZED"; state.transaction.bytes = null; state.transaction.data = null; state.transaction.loaded = !!this.value.trim(); state.transaction.parsed = false; state.transaction.verdict = null; state.transaction.simulation = "IDLE"; renderStatus(); });
    $("connect-wallet").addEventListener("click", async function () {
      phase(this, "CONNECTING...", "running", 2500);
      var key = await parser.connectWallet();
      if (key) phase(this, "CONNECTED", "success");
      else { phase(this, "NO WALLET", "error"); terminal("> wallet unavailable or connection declined; no signing request"); }
    });
    addEventListener("merrow:wallet", function (e) { state.wallet.connected = true; state.wallet.pubkey = e.detail.pubkey; event("wallet.connected", short(e.detail.pubkey)); terminal("> wallet attached " + short(e.detail.pubkey)); terminal("> authority remains locked"); renderStatus(); renderProof(); });
    $("run-infection").addEventListener("click", runInfection);
    $("step-infection").addEventListener("click", infectionStep);
    $("reset-infection").addEventListener("click", resetInfection);
    $("infection-scenario").addEventListener("change", function () { state.infection.scenario = this.value; resetInfection(); event("infection.scenario", this.value); });
    document.querySelectorAll("#infection-network [data-node]").forEach(function (b) { b.addEventListener("click", function () { selectInfectionNode(b.dataset.node); state.threat.selected = mapNode[b.dataset.node]; renderThreat(); }); });
    document.querySelectorAll("[data-inspector-tab]").forEach(function (b) { b.addEventListener("click", function () {
      document.querySelectorAll("[data-inspector-tab]").forEach(function (x) { x.classList.toggle("active", x === b); });
      ["inspector", "events", "policy"].forEach(function (n) { $("infection-" + n).style.display = n === b.dataset.inspectorTab ? "block" : "none"; });
    }); });
    document.querySelectorAll("[data-threat]").forEach(function (b) {
      b.addEventListener("mouseenter", function () { showThreat(b.dataset.threat); });
      b.addEventListener("click", function () { state.threat.selected = b.dataset.threat; renderThreat(); event("node.selected", b.dataset.threat.toLowerCase()); });
    });
    $("isolate-threat").addEventListener("click", function () { isolateNode(); });
    document.querySelectorAll("[data-life]").forEach(function (b) { b.addEventListener("click", function () { state.checkpoint.selected = b.dataset.life; renderLives(); event("checkpoint.inspected", b.dataset.life.toLowerCase()); }); });
    $("compare-lives").addEventListener("click", compareLives); $("corrupt-state").addEventListener("click", corruptState);
    $("recover-state").addEventListener("click", recoverState);
    $("view-raw").addEventListener("click", function () {
      if (!state.receipt) { phase(this, "NO RECEIPT", "error"); return; }
      $("pawprint-receipt").classList.toggle("show-raw");
      phase(this, $("pawprint-receipt").classList.contains("show-raw") ? "RAW OPEN" : "RAW CLOSED", "success");
    });
    $("copy-json").addEventListener("click", async function () {
      if (!state.receipt) { phase(this, "NO RECEIPT", "error"); return; }
      if (await copyText(JSON.stringify(state.receipt, null, 2))) { phase(this, "COPIED", "success", 1000); event("receipt.copied", state.receipt.id); }
      else {
        $("pawprint-receipt").classList.add("show-raw");
        var range = document.createRange(); range.selectNodeContents($("receipt-raw"));
        var selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        phase(this, "SELECTED · CTRL+C", "error", 2200);
        terminal("> clipboard blocked; JSON selected for manual copy");
      }
    });
    $("terminal-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { command(this.value); this.value = ""; e.preventDefault(); }
      else if (e.key === "Tab") {
        e.preventDefault(); var value = this.value.toLowerCase(), matches = commands.filter(function (s) { return s.startsWith(value); });
        if (matches.length) this.value = value.indexOf(" ") < 0 && matches[0].indexOf(" ") > 0 ? matches[0].split(" ")[0] : matches[0];
      } else if (e.key === "ArrowUp") { e.preventDefault(); termIndex = Math.max(0, termIndex - 1); this.value = termHistory[termIndex] || ""; }
      else if (e.key === "ArrowDown") { e.preventDefault(); termIndex = Math.min(termHistory.length, termIndex + 1); this.value = termHistory[termIndex] || ""; }
      else if (e.key.toLowerCase() === "l" && e.ctrlKey) { e.preventDefault(); terminalLines = []; $("terminal-output").textContent = ""; }
    });
  }
  function init() {
    var vector = parser.parseTransaction(vectorBytes());
    $("policy-programs").value = SYSTEM; $("policy-writable").value = vector.metas.filter(function (m) { return m.isWritable; }).map(function (m) { return m.pubkey; }).join("\n");
    $("policy-sol").value = "0.1"; $("policy-slippage").value = "100"; policyHints();
    addInlineNotes(); setupPaper(); setupNavigation(); setupControls();
    if ("ResizeObserver" in window) new ResizeObserver(renderThreatLines).observe($("threat-graph"));
    renderProof(); renderThreat(); renderLives(); renderReceipt();
    $("infection-events").textContent = "EVENT LOG // LOCAL LAB\n— waiting for operations —";
    event("lab.ready", "local");
    checkRpcHealth();
    document.querySelectorAll('a[href^="http"]').forEach(function (a) { a.target = "_blank"; a.rel = "noopener noreferrer"; });
  }
  init();
}());
