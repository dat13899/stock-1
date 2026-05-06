/**
 * Ethereum address derivation utilities.
 *
 * For a 32-byte secp256k1 private key:
 *   1. derive uncompressed public key (65 bytes, leading 0x04 prefix)
 *   2. drop the prefix, keccak256 the remaining 64 bytes
 *   3. take the last 20 bytes — that is the address
 *
 * Everything here is pure-JS, runs locally in the browser / Web Worker, and
 * never leaves the user's machine.
 */
import { getPublicKey } from "@noble/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";

const HEX_LOOKUP = "0123456789abcdef";

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += HEX_LOOKUP[b >>> 4] + HEX_LOOKUP[b & 0x0f];
  }
  return out;
}

export function randomPrivateKey(): Uint8Array {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  // Vanishingly rare invalid keys (zero or >= n) are still 256-bit numbers, so
  // for a stats simulator we simply accept whatever the RNG returns. Real
  // wallet code would reject them; here it has no observable effect.
  return buf;
}

export function privateKeyToAddress(privateKey: Uint8Array): string {
  const pub = getPublicKey(privateKey, false); // 65 bytes, 0x04 prefix
  const hashed = keccak_256(pub.slice(1));
  return "0x" + bytesToHex(hashed.slice(-20));
}

export interface Wallet {
  privateKey: string; // hex without 0x prefix
  address: string; // 0x... lowercase
}

export function generateWallet(): Wallet {
  const pk = randomPrivateKey();
  return {
    privateKey: bytesToHex(pk),
    address: privateKeyToAddress(pk),
  };
}
