"use client";

import { useMemo } from "react";
import {
  computeVanityStats,
  attemptsToSeconds,
  formatBigInt,
  formatBigIntCompact,
  formatDuration,
} from "@/lib/vanity";

/**
 * Math-only display: given a vanity prefix and the user's current measured
 * hashes/sec, show the search-space size, the geometric-distribution mean /
 * median / p99 attempts, and the wall-clock estimate at that rate.
 *
 * The point is to make the "0xdead" vs "0xdeadbeefdeadbeef" leap viscerally
 * obvious — a few seconds vs many ages of the universe.
 */
export default function VanityCalculator({
  prefix,
  onPrefixChange,
  hashesPerSecond,
}: {
  prefix: string;
  onPrefixChange: (next: string) => void;
  hashesPerSecond: number;
}) {
  const stats = useMemo(() => computeVanityStats(prefix), [prefix]);

  return (
    <div className="rounded-md border border-amber-500/30 bg-black/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-amber-300">
          {"// vanity probability"}
        </h2>
        <span className="font-mono text-[10px] text-zinc-500">
          16^N · pure math · no brute-force
        </span>
      </div>

      <label className="mt-4 block">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400">
          prefix (after 0x)
        </span>
        <div className="mt-1 flex items-center rounded-md border border-amber-500/40 bg-black/80 font-mono text-sm focus-within:border-amber-300">
          <span className="select-none px-3 py-2 text-amber-300/60">0x</span>
          <input
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value)}
            placeholder="0000"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent py-2 pr-3 text-amber-200 placeholder:text-zinc-700 focus:outline-none"
          />
        </div>
      </label>

      {stats === null ? (
        <p className="mt-3 font-mono text-xs text-red-400">
          ! invalid prefix — only hex chars [0-9 a-f], up to 40 long
        </p>
      ) : stats.prefixLength === 0 ? (
        <p className="mt-3 font-mono text-xs text-zinc-500">
          enter a prefix to compute the search space
        </p>
      ) : (
        <Result hashesPerSecond={hashesPerSecond} stats={stats} />
      )}
    </div>
  );
}

function Result({
  stats,
  hashesPerSecond,
}: {
  stats: NonNullable<ReturnType<typeof computeVanityStats>>;
  hashesPerSecond: number;
}) {
  const meanS = attemptsToSeconds(stats.expectedAttempts, hashesPerSecond);
  const medianS = attemptsToSeconds(stats.medianAttempts, hashesPerSecond);
  const p99S = attemptsToSeconds(stats.p99Attempts, hashesPerSecond);

  return (
    <div className="mt-4 grid gap-4 font-mono text-xs sm:grid-cols-2">
      <Row
        label="prefix length"
        value={`${stats.prefixLength} hex char${stats.prefixLength === 1 ? "" : "s"}`}
      />
      <Row
        label="search space (16^N)"
        value={formatBigIntCompact(stats.searchSpace)}
      />
      <Row
        label="probability per try"
        value={
          stats.probability > 0
            ? `1 in ${formatBigIntCompact(stats.searchSpace)} (${stats.probability.toExponential(2)})`
            : "≈ 0 (underflow)"
        }
      />
      <Row label="your rate" value={`${hashesPerSecond.toFixed(0)} keys/s`} />

      <Row
        label="mean attempts"
        value={formatBigInt(stats.expectedAttempts)}
        sub={`@ rate → ${formatDuration(meanS)}`}
      />
      <Row
        label="median (50%)"
        value={formatBigInt(stats.medianAttempts)}
        sub={`@ rate → ${formatDuration(medianS)}`}
      />
      <Row
        label="99% by"
        value={formatBigInt(stats.p99Attempts)}
        sub={`@ rate → ${formatDuration(p99S)}`}
        accent
      />
      <Row
        label="full address (160 bits)"
        value="2^160 ≈ 1.46 × 10^48"
        sub="targeting a specific address is computationally infeasible"
      />
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-l border-amber-500/20 pl-3">
      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <span
        className={`break-all ${accent ? "text-amber-200" : "text-zinc-200"}`}
      >
        {value}
      </span>
      {sub ? <span className="text-[11px] text-zinc-500">{sub}</span> : null}
    </div>
  );
}
