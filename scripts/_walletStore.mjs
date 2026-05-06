// Shared helpers for the testnet QA wallet scripts.
//
// Storage format: a single JSON file (default `wallets.json`) at the repo
// root. Each entry is a named, user-created wallet:
//
//   {
//     "name": "alice",
//     "address": "0x...",
//     "privateKey": "0x...",
//     "mnemonic": "twelve words ...",
//     "createdAt": "2025-01-01T00:00:00.000Z",
//     "purpose": "Sepolia QA — please fund from a faucet"
//   }
//
// This file is NOT a key-search artefact. It only ever contains wallets that
// the human operator explicitly created via `wallet:create --name <label>`.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "..");
export const DEFAULT_WALLET_FILE = path.join(REPO_ROOT, "wallets.json");

export const SEPOLIA_CHAIN_ID = 11155111;

export async function loadWallets(file = DEFAULT_WALLET_FILE) {
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(
        `Expected ${path.basename(file)} to contain a JSON array of wallets.`
      );
    }
    return parsed;
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}

export async function saveWallets(wallets, file = DEFAULT_WALLET_FILE) {
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(wallets, null, 2) + "\n", {
    mode: 0o600,
  });
  await fs.rename(tmp, file);
}

/** Parse `--key value` and `--flag` style args. Returns a flat object. */
export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

export function fail(msg) {
  console.error(`\x1b[31merror:\x1b[0m ${msg}`);
  process.exit(1);
}

/** Truncate hex strings for safe-ish console display. */
export function shortHex(s, head = 6, tail = 4) {
  if (typeof s !== "string") return String(s);
  if (s.length <= head + tail + 2) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}
