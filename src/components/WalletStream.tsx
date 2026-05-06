"use client";

import type { Wallet } from "@/lib/eth";

/**
 * Rolling list of recently sampled wallets.
 *
 * Important: this is a SAMPLE feed for visualization — it shows ~one wallet
 * per sampleEvery N generated, never the full keystream. Nothing here is
 * persisted to disk or sent over the network. Private keys are masked by
 * default and revealed only on click so the user has to opt in.
 */
export default function WalletStream({
  wallets,
  highlightPrefix,
}: {
  wallets: Wallet[];
  highlightPrefix: string;
}) {
  if (wallets.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-lime-500/20 bg-black/60 font-mono text-sm text-zinc-500">
        [ awaiting keystream ]
      </div>
    );
  }
  const prefix = highlightPrefix.toLowerCase();
  return (
    <div className="rounded-md border border-lime-500/30 bg-black/60 backdrop-blur">
      <div className="flex items-center justify-between border-b border-lime-500/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        <span>{"// keystream sample (in-memory only, never written to disk)"}</span>
        <span>last {wallets.length}</span>
      </div>
      <ul className="max-h-72 divide-y divide-lime-500/10 overflow-y-auto font-mono text-xs">
        {wallets.map((w, i) => {
          const matched =
            prefix.length > 0 && w.address.startsWith("0x" + prefix);
          return (
            <li
              key={`${w.address}-${i}`}
              className={`flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:gap-4 ${
                matched ? "bg-lime-500/10" : ""
              }`}
            >
              <span className="break-all text-lime-300">
                {prefix.length > 0 ? (
                  <>
                    <span
                      className={
                        matched
                          ? "rounded bg-lime-400 px-1 text-black"
                          : "text-lime-300"
                      }
                    >
                      0x{w.address.slice(2, 2 + prefix.length)}
                    </span>
                    <span className="text-lime-300/80">
                      {w.address.slice(2 + prefix.length)}
                    </span>
                  </>
                ) : (
                  w.address
                )}
              </span>
              <span className="text-zinc-600 sm:ml-auto">
                priv: <PrivateKey value={w.privateKey} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PrivateKey({ value }: { value: string }) {
  return (
    <span
      className="cursor-pointer select-none text-zinc-500 hover:text-zinc-300"
      title="Click to reveal (then clear by re-clicking)"
      onClick={(e) => {
        const el = e.currentTarget;
        el.dataset.shown = el.dataset.shown === "1" ? "0" : "1";
        el.textContent = el.dataset.shown === "1" ? value : mask(value);
      }}
    >
      {mask(value)}
    </span>
  );
}

function mask(s: string) {
  return s.slice(0, 4) + "…" + s.slice(-4);
}
