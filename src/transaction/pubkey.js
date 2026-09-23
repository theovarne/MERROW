const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function decodeBase58(value) {
  if (typeof value !== "string" || !value.length) throw new Error("invalid base58 public key");
  const bytes = [0];
  for (const ch of value) {
    let carry = ALPHABET.indexOf(ch);
    if (carry < 0) throw new Error("invalid base58 public key");
    for (let i = 0; i < bytes.length; i++) {
      const n = bytes[i] * 58 + carry;
      bytes[i] = n & 255;
      carry = n >> 8;
    }
    while (carry) { bytes.push(carry & 255); carry >>= 8; }
  }
  let leading = 0;
  while (leading < value.length && value[leading] === "1") leading++;
  if (leading === value.length) return new Uint8Array(leading);
  const out = new Uint8Array(leading + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[out.length - 1 - i] = bytes[i];
  return out;
}
export function isSolanaPubkey(value) {
  try { return decodeBase58(value).length === 32; } catch { return false; }
}

