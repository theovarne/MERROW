// Narrow same-origin bridge for public Solana RPC. Never accepts signing methods.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: { message: "POST required" } });
  let body = req.body;
  try { if (typeof body === "string") body = JSON.parse(body); } catch (_) { return res.status(400).json({ error: { message: "invalid JSON" } }); }
  if (!body || typeof body !== "object") return res.status(400).json({ error: { message: "invalid request" } });
  const method = body.method;
  if (method !== "getHealth" && method !== "simulateTransaction") return res.status(400).json({ error: { message: "RPC method not permitted" } });
  let params;
  if (method === "simulateTransaction") {
    const encoded = body.params && body.params[0];
    if (typeof encoded !== "string" || encoded.length < 8 || encoded.length > 5000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
      return res.status(400).json({ error: { message: "invalid serialized transaction" } });
    }
    params = [encoded, { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true, innerInstructions: true }];
  }
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 8500);
  try {
    const upstream = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, ...(params ? { params: params } : {}) }),
      signal: abort.signal
    });
    if (!upstream.ok) return res.status(200).json({ error: { message: "Solana RPC HTTP " + upstream.status } });
    const result = await upstream.json();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(200).json({ error: { message: error.name === "AbortError" ? "Solana RPC timed out" : "Solana RPC unavailable" } });
  } finally { clearTimeout(timer); }
};
