#!/usr/bin/env node
/**
 * scripts/list-wallets.mjs — print the named QA wallets in wallets.json.
 *
 * By default, private keys + mnemonics are masked. Pass --show-secrets to
 * print them in plaintext (use only on a trusted local terminal).
 */
import {
  loadWallets,
  parseArgs,
  shortHex,
  DEFAULT_WALLET_FILE,
} from "./_walletStore.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const showSecrets = Boolean(args["show-secrets"]);

  const wallets = await loadWallets();
  if (wallets.length === 0) {
    console.log(
      `no wallets yet. create one with:\n  npm run wallet:create -- --name <label>`
    );
    return;
  }

  console.log(`# ${wallets.length} wallet(s) in ${DEFAULT_WALLET_FILE}`);
  console.log("");
  for (const w of wallets) {
    console.log(`name:        ${w.name}`);
    console.log(`address:     ${w.address}`);
    console.log(
      `privateKey:  ${showSecrets ? w.privateKey : shortHex(w.privateKey, 6, 4)}`
    );
    if (w.mnemonic) {
      console.log(`mnemonic:    ${showSecrets ? w.mnemonic : "[hidden — pass --show-secrets to reveal]"}`);
    }
    console.log(`createdAt:   ${w.createdAt}`);
    if (w.purpose) console.log(`purpose:     ${w.purpose}`);
    console.log("");
  }
  if (!showSecrets) {
    console.log(
      "// secrets are masked. re-run with `--show-secrets` if you really need them."
    );
  }
}

main().catch((err) => {
  console.error("error:", err && err.message ? err.message : err);
  process.exit(1);
});
