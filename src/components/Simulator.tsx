"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StatCard from "./StatCard";
import Sparkline from "./Sparkline";
import WalletStream from "./WalletStream";
import VanityCalculator from "./VanityCalculator";
import MatrixRain from "./MatrixRain";
import type {
  WorkerOutbound,
  WorkerInbound,
} from "@/workers/wallet.worker";
import { normalizePrefix } from "@/lib/vanity";
import type { Wallet } from "@/lib/eth";

const SAMPLE_WINDOW = 12; // recent wallets to keep on screen
const RATE_WINDOW = 60; // sparkline samples (~60 seconds)
const BATCH_SIZE = 1000;
const SAMPLE_EVERY = 500;

interface MatchedWallet extends Wallet {
  attempts: number;
  foundAt: number;
}

export default function Simulator() {
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [hps, setHps] = useState(0);
  const [rateHistory, setRateHistory] = useState<number[]>([]);
  const [recent, setRecent] = useState<Wallet[]>([]);
  const [matches, setMatches] = useState<MatchedWallet[]>([]);
  const [prefix, setPrefix] = useState("");
  const [prefixError, setPrefixError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const tickAccumRef = useRef({ count: 0, ms: 0, lastFlush: 0 });

  // Keep a rolling 1-second view of hashes/sec.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const acc = tickAccumRef.current;
      const elapsed = acc.ms || 1;
      const inst = (acc.count / elapsed) * 1000;
      setHps(inst);
      setRateHistory((h) => {
        const next = [...h, inst];
        return next.length > RATE_WINDOW ? next.slice(-RATE_WINDOW) : next;
      });
      tickAccumRef.current = { count: 0, ms: 0, lastFlush: performance.now() };
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const handleWorkerMessage = useCallback(
    (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data;
      if (msg.type === "tick") {
        tickAccumRef.current.count += msg.generated;
        tickAccumRef.current.ms += msg.elapsedMs;
        setTotal(msg.totalGenerated);
        if (msg.sample) {
          setRecent((r) => {
            const next = [msg.sample as Wallet, ...r];
            return next.slice(0, SAMPLE_WINDOW);
          });
        }
      } else if (msg.type === "match") {
        const m: MatchedWallet = {
          ...msg.wallet,
          attempts: msg.attempts,
          foundAt: Date.now(),
        };
        setMatches((arr) => [m, ...arr].slice(0, 5));
      }
    },
    []
  );

  const start = useCallback(() => {
    const cleaned = normalizePrefix(prefix);
    if (cleaned === null) {
      setPrefixError("Invalid hex prefix (use 0-9, a-f, max 40 chars)");
      return;
    }
    setPrefixError(null);
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../workers/wallet.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current.addEventListener("message", handleWorkerMessage);
    }
    setTotal(0);
    setRecent([]);
    setMatches([]);
    setRateHistory([]);
    setHps(0);
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    tickAccumRef.current = { count: 0, ms: 0, lastFlush: performance.now() };
    const startMsg: WorkerInbound = {
      type: "start",
      vanityPrefix: cleaned,
      batchSize: BATCH_SIZE,
      sampleEvery: SAMPLE_EVERY,
    };
    workerRef.current.postMessage(startMsg);
    setRunning(true);
  }, [prefix, handleWorkerMessage]);

  const stop = useCallback(() => {
    if (workerRef.current) {
      const stopMsg: WorkerInbound = { type: "stop" };
      workerRef.current.postMessage(stopMsg);
    }
    setRunning(false);
  }, []);

  // Tear down the worker on unmount.
  useEffect(() => {
    return () => {
      const w = workerRef.current;
      if (w) {
        const stopMsg: WorkerInbound = { type: "stop" };
        w.postMessage(stopMsg);
        w.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const uptimeSeconds = startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;
  const avgHps = uptimeSeconds > 0 ? total / uptimeSeconds : 0;

  const cleanedPrefix = useMemo(() => normalizePrefix(prefix) ?? "", [prefix]);

  return (
    <>
      <MatrixRain />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
        <Header />

      <Controls
        running={running}
        prefix={prefix}
        onPrefixChange={(v) => {
          setPrefix(v);
          setPrefixError(null);
        }}
        prefixError={prefixError}
        onStart={start}
        onStop={stop}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="hashes / sec"
          value={hps.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          hint={`avg ${avgHps.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })} since start`}
          accent="lime"
        />
        <StatCard
          label="total generated"
          value={total.toLocaleString()}
          hint="this session, in-memory only"
          accent="cyan"
        />
        <StatCard
          label="uptime"
          value={formatUptime(uptimeSeconds)}
          hint={running ? "running…" : "stopped"}
          accent={running ? "amber" : "red"}
        />
        <StatCard
          label="vanity matches"
          value={matches.length.toString()}
          hint={
            cleanedPrefix
              ? `prefix 0x${cleanedPrefix}`
              : "set a prefix to enable"
          }
          accent="amber"
        />
      </div>

      <div className="rounded-md border border-lime-500/30 bg-black/60 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-lime-300">
            {"// throughput · keys / sec"}
          </h2>
          <span className="font-mono text-[10px] text-zinc-500">
            window: last {RATE_WINDOW}s
          </span>
        </div>
        <div className="mt-3">
          <Sparkline values={rateHistory} height={120} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <VanityCalculator
          prefix={prefix}
          onPrefixChange={(v) => {
            setPrefix(v);
            setPrefixError(null);
          }}
          hashesPerSecond={hps || avgHps}
        />
        <Matches matches={matches} />
      </div>

        <WalletStream wallets={recent} highlightPrefix={cleanedPrefix} />

        <Footer />
      </div>
    </>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-lime-400">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-lime-400 shadow-[0_0_12px_rgba(132,255,180,0.9)]" />
        <span>local · educational · no network</span>
      </div>
      <h1 className="font-mono text-3xl font-semibold tracking-tight text-lime-200 drop-shadow-[0_0_24px_rgba(132,255,180,0.35)] sm:text-4xl">
        ETH KEYSPACE SIMULATOR
      </h1>
      <p className="max-w-2xl font-mono text-xs leading-relaxed text-zinc-400 sm:text-sm">
        Generate Ethereum keypairs locally to visualise throughput and the math
        of vanity addresses. Keys are produced in a Web Worker, never written
        to disk, and never sent over the network. The point is to feel why
        targeting a specific 160-bit address is intractable.
      </p>
    </header>
  );
}

function Controls({
  running,
  prefix,
  onPrefixChange,
  prefixError,
  onStart,
  onStop,
}: {
  running: boolean;
  prefix: string;
  onPrefixChange: (v: string) => void;
  prefixError: string | null;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-lime-500/30 bg-black/60 p-4 backdrop-blur sm:flex-row sm:items-center">
      <label className="flex flex-1 flex-col gap-1 font-mono text-xs">
        <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          target vanity prefix (optional)
        </span>
        <div className="flex items-center rounded-md border border-lime-500/40 bg-black/80 focus-within:border-lime-300">
          <span className="select-none px-3 py-2 text-lime-300/60">0x</span>
          <input
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value)}
            placeholder="optional, e.g. 0000 or dead"
            spellCheck={false}
            autoComplete="off"
            disabled={running}
            className="w-full bg-transparent py-2 pr-3 text-lime-200 placeholder:text-zinc-700 focus:outline-none disabled:opacity-60"
          />
        </div>
        {prefixError ? (
          <span className="text-[11px] text-red-400">{prefixError}</span>
        ) : null}
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={running}
          className="rounded-md border border-lime-400 bg-lime-400/20 px-4 py-2 font-mono text-sm uppercase tracking-[0.2em] text-lime-200 transition hover:bg-lime-400/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ▶ start
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!running}
          className="rounded-md border border-red-400 bg-red-500/10 px-4 py-2 font-mono text-sm uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ■ stop
        </button>
      </div>
    </div>
  );
}

function Matches({ matches }: { matches: MatchedWallet[] }) {
  return (
    <div className="rounded-md border border-amber-500/30 bg-black/60 p-4 backdrop-blur">
      <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-amber-300">
        {"// vanity matches (this session)"}
      </h2>
      {matches.length === 0 ? (
        <p className="mt-3 font-mono text-xs text-zinc-500">
          none yet — addresses are random; see calculator for ETA.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 font-mono text-xs">
          {matches.map((m) => (
            <li
              key={m.address + m.foundAt}
              className="flex flex-col gap-0.5 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2"
            >
              <span className="break-all text-amber-200">{m.address}</span>
              <span className="text-[11px] text-zinc-400">
                found after {m.attempts.toLocaleString()} attempts
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-lime-500/20 pt-4 font-mono text-[11px] leading-relaxed text-zinc-500">
      <p>
        {"// pure secp256k1 + keccak256 in the browser. nothing leaves this tab."}
      </p>
      <p>
        {"// keyspace = 2^160 ≈ 1.46 × 10^48 — that's why this is safe."}
      </p>
    </footer>
  );
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm.toString().padStart(2, "0")}m`;
}
