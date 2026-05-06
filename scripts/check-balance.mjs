#!/usr/bin/env node
/**
 * scripts/check-balance.mjs — Sepolia balance lookup for the named QA wallets.
 *
 * Usage:
 *   npm run wallet:balance
 *   npm run wallet:balance -- --rpc https://your-sepolia-rpc.example
 *
 * Behavior + safety choices:
 *   • Reads addresses from ./wallets.json (created by create-wallet.mjs).
 *     Will not generate new keys, will not derive new addresses.
 *   • Talks ONLY to a Sepolia RPC. After the first eth_chainId call, the
 *     script exits if the chain ID is not 11155111. Mainnet RPCs are refused.
 *   • Sequential, low-rate — one address every 250ms — so this won't be
 *     mistaken for a balance scanner against an arbitrary keyspace.
 *   • Read-only: only `eth_chainId` and `eth_getBalance` are issued.
 */
import { JsonRpcProvider, formatEther } from "ethers";
import {
  loadWallets,
  parseArgs,
  fail,
  SEPOLIA_CHAIN_ID,
} from "./_walletStore.mjs";

const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const SLEEP_MS = 250;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rpcUrl = typeof args.rpc === "string" ? args.rpc : DEFAULT_RPC;

  const wallets = await loadWallets();
  if (wallets.length === 0) {
    console.log(
      "no wallets to check. create one first with: npm run wallet:create -- --name <label>"
    );
    return;
  }

  const provider = new JsonRpcProvider(rpcUrl);
  let net;
  try {
    net = await provider.getNetwork();
  } catch (err) {
    fail(
      `failed to reach RPC ${rpcUrl}: ${err && err.message ? err.message : err}`
    );
  }
  const chainId = Number(net.chainId);
  if (chainId !== SEPOLIA_CHAIN_ID) {
    fail(
      `RPC at ${rpcUrl} reports chainId ${chainId}, expected ${SEPOLIA_CHAIN_ID} (Sepolia).\n` +
        "       this script refuses to query non-Sepolia networks by design."
    );
  }

  console.log(
    `// Sepolia (chainId ${chainId}) via ${rpcUrl} — checking ${wallets.length} wallet(s)`
  );
  console.log("");

  let total = 0n;
  for (const w of wallets) {
    let balanceWei;
    try {
      balanceWei = await provider.getBalance(w.address);
    } catch (err) {
      console.log(
        `${w.name.padEnd(20)} ${w.address}  ERROR  ${err && err.message ? err.message : err}`
      );
      await sleep(SLEEP_MS);
      continue;
    }
    total += balanceWei;
    const eth = formatEther(balanceWei);
    const flag =
      balanceWei === 0n
        ? "\x1b[33mempty — fund from a faucet\x1b[0m"
        : "\x1b[32mfunded\x1b[0m";
    console.log(
      `${w.name.padEnd(20)} ${w.address}  ${eth.padStart(16)} SepoliaETH  ${flag}`
    );
    await sleep(SLEEP_MS);
  }

  console.log("");
  console.log(`// total across all wallets: ${formatEther(total)} SepoliaETH`);
}

main().catch((err) => {
  fail(err && err.message ? err.message : String(err));
});
