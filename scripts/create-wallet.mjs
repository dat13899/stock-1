#!/usr/bin/env node
/**
 * scripts/create-wallet.mjs — create ONE named testnet wallet.
 *
 * Usage:
 *   npm run wallet:create -- --name alice
 *   npm run wallet:create -- --name bob --purpose "smoke test for swap UI"
 *
 * Constraints by design:
 *   • Exactly one wallet per invocation (no count flag, no batching).
 *   • A unique --name is REQUIRED so each wallet has a human-meaningful label.
 *   • Refuses to overwrite an existing entry; use a different name instead.
 *   • Writes to ./wallets.json (gitignored). File mode 0600.
 *
 * This is the "testnet QA wallet manager" half of the repo. It is deliberately
 * separate from the educational simulator under src/ — there is no automated
 * loop here, and it does not consume the simulator's keystream.
 */
import { Wallet } from "ethers";
import {
  loadWallets,
  saveWallets,
  parseArgs,
  fail,
  shortHex,
  DEFAULT_WALLET_FILE,
  SEPOLIA_CHAIN_ID,
} from "./_walletStore.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printHelp();
    return;
  }

  if (!args.name || typeof args.name !== "string") {
    fail("missing required --name <label>. example: --name alice");
  }

  const name = args.name.trim();
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(name)) {
    fail(
      "name must be 1–32 chars, [a-zA-Z0-9_-]. Pick a meaningful QA label."
    );
  }

  const wallets = await loadWallets();
  if (wallets.some((w) => w.name === name)) {
    fail(
      `a wallet named "${name}" already exists in ${DEFAULT_WALLET_FILE}.\n` +
        `       pick a different --name (e.g. --name ${name}-2).`
    );
  }

  const wallet = Wallet.createRandom();
  const entry = {
    name,
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic ? wallet.mnemonic.phrase : null,
    createdAt: new Date().toISOString(),
    purpose:
      typeof args.purpose === "string"
        ? args.purpose
        : `Sepolia testnet QA wallet (chainId ${SEPOLIA_CHAIN_ID}). Fund from a faucet.`,
  };

  wallets.push(entry);
  await saveWallets(wallets);

  console.log("\x1b[32m✓\x1b[0m created testnet wallet");
  console.log(`  name        ${entry.name}`);
  console.log(`  address     ${entry.address}`);
  console.log(`  privateKey  ${shortHex(entry.privateKey, 6, 4)}  (saved to wallets.json)`);
  if (entry.mnemonic) {
    console.log(`  mnemonic    [12 words, saved to wallets.json]`);
  }
  console.log(`  createdAt   ${entry.createdAt}`);
  console.log("");
  console.log(
    "next: fund this address on Sepolia from a public faucet, e.g. https://sepoliafaucet.com"
  );
  console.log(
    "     then run `npm run wallet:balance` to verify funding landed."
  );
}

function printHelp() {
  console.log(`Usage: npm run wallet:create -- --name <label> [--purpose "..."]

Creates exactly one Ethereum keypair (Address / PrivateKey / Mnemonic) using
ethers.js Wallet.createRandom(), and appends it to ./wallets.json.

Options:
  --name <label>       (required) unique label for this QA wallet
  --purpose "<text>"   (optional) free-form note about what this wallet is for
  --help, -h           show this help

Notes:
  • Designed for managing your OWN test wallets on Sepolia. Do NOT reuse
    these keys on mainnet — they are saved in plaintext in wallets.json.
  • One wallet per invocation by design. No batching, no automation.
`);
}

main().catch((err) => {
  fail(err && err.message ? err.message : String(err));
});
