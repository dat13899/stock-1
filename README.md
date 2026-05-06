# stock-1

Two small, deliberately-separate tools for blockchain security study & dApp QA:

1. **ETH Keyspace Simulator** — a Next.js + Tailwind web app, dark Matrix theme,
   that visualises Ethereum keypair generation throughput and the math of
   *vanity addresses*. Runs entirely in the browser (Web Worker), no network
   calls, no key persistence.
2. **Testnet QA Wallet Manager** — a tiny set of Node.js scripts (using
   [ethers.js](https://docs.ethers.org/)) for creating *named* test wallets
   on **Sepolia** and checking their balances via a public RPC. One wallet per
   command, by design.

These two tools are intentionally **not connected**. The simulator does not
export keys; the QA scripts do not consume the simulator's keystream.

> ⚠️ Both halves are for **legitimate research and your own testnet wallets only**.
> The simulator is purely educational — its whole point is to show why
> brute-forcing a specific Ethereum address is computationally infeasible.
> The QA scripts are for managing wallets *you create yourself* on Sepolia.

---

## 1. ETH Keyspace Simulator (web app)

A Next.js 16 + Tailwind v4 + React 19 app. All cryptography (`secp256k1`,
`keccak256`) runs locally via `@noble/secp256k1` and `@noble/hashes`.

### Features

- **Live throughput dashboard** — instantaneous and rolling hashes-per-second,
  total generated this session, uptime, sparkline of the last 60 seconds.
- **Vanity probability calculator** — given a target prefix (e.g. `0x0000`),
  computes the search space `16^N`, mean / median / p99 attempts, and the
  ETA at the user's *measured* local rate. Makes the gap between a 4-char
  prefix (~seconds) and a 16-char prefix (≫ age of universe) visceral.
- **Sample keystream** — shows ~one wallet per 500 generated as a visual
  trace. Private keys are masked by default. Nothing is persisted to disk
  or sent over the network.
- **Optional vanity match feed** — if a prefix is set, the worker reports
  any matches it stumbles across. Even with a 4-char prefix this is a
  deliberately rare event in a few seconds; with 8+ chars it's effectively
  never. That's the lesson.

### Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

### Architectural notes

- `src/lib/eth.ts` — pure-JS keypair → address derivation.
  `secp256k1.getPublicKey(priv, isCompressed=false)` → drop 0x04 prefix →
  `keccak256` → last 20 bytes.
- `src/lib/vanity.ts` — `BigInt`-precise probability + ETA math.
- `src/workers/wallet.worker.ts` — generates keys in batches and yields
  to the event loop between batches. `postMessage` reports stats + an
  occasional sample wallet to the main thread.
- `src/components/Simulator.tsx` — orchestrates the worker, dashboard,
  vanity calculator, and keystream feed.
- `src/components/MatrixRain.tsx` — canvas background animation.

---

## 2. Testnet QA Wallet Manager (Node.js scripts)

For a QA team that needs a handful of named test wallets on Sepolia
(funded from a faucet) and a way to check whether faucet drops landed.

Three scripts, one storage file:

| Command                                        | Effect                                        |
| ---------------------------------------------- | --------------------------------------------- |
| `npm run wallet:create -- --name alice`        | Create exactly one named wallet → `wallets.json` |
| `npm run wallet:list`                          | List wallets (private keys masked by default)    |
| `npm run wallet:list -- --show-secrets`        | Reveal private keys + mnemonics                  |
| `npm run wallet:balance`                       | Sepolia balance for every wallet (250ms apart)   |
| `npm run wallet:balance -- --rpc <URL>`        | Use a different RPC (still must be chainId 11155111) |

### Storage

`wallets.json` lives at the repo root and is **gitignored**. Each entry:

```json
{
  "name": "alice",
  "address": "0x…",
  "privateKey": "0x…",
  "mnemonic": "twelve words …",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "purpose": "Sepolia QA — please fund from a faucet"
}
```

The file is written with mode `0600`. Treat it like any other secrets
file — don't commit, don't email, don't reuse on mainnet.

### Safety guarantees baked into the scripts

- **One wallet per `wallet:create` invocation.** No `--count`. No batching.
- **Names are required and unique.** You can't accidentally generate hundreds
  of anonymous wallets.
- **`wallet:balance` is Sepolia-only.** It checks `eth_chainId` first and
  refuses to query any RPC that doesn't report `11155111`. Mainnet RPCs are
  rejected by design, even if you pass them via `--rpc`.
- **Sequential balance checks** with a 250 ms gap. This is a QA helper, not
  a scanner.
- **No automated loop** between key creation and balance checking. The two
  scripts only share a JSON file you control.

### Faucets

After creating a wallet, fund the address from a Sepolia faucet:

- <https://sepoliafaucet.com>
- <https://www.alchemy.com/faucets/ethereum-sepolia>
- <https://cloud.google.com/application/web3/faucet/ethereum/sepolia>

Then run `npm run wallet:balance` to confirm the drop landed.

---

## Project structure

```
stock-1/
├── src/                       # Next.js Educational Simulator
│   ├── app/                   # routing, layout, global styles
│   ├── components/            # Dashboard, VanityCalculator, MatrixRain, …
│   ├── lib/                   # eth.ts, vanity.ts (pure logic)
│   └── workers/               # wallet.worker.ts (Web Worker)
├── scripts/                   # Testnet QA Wallet Manager (Node.js)
│   ├── _walletStore.mjs       # shared file IO + arg parsing helpers
│   ├── create-wallet.mjs      # `wallet:create`
│   ├── list-wallets.mjs       # `wallet:list`
│   └── check-balance.mjs      # `wallet:balance`
├── wallets.json               # (gitignored) created at runtime
├── package.json
└── README.md
```

## License

Not yet specified. Pick one before publishing (MIT or Apache-2.0 are common).
