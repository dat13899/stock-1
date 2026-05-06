"use client";

import type { ReactNode } from "react";

/**
 * Simple terminal-style stat tile. Used by the dashboard for hashes/sec,
 * total generated, uptime etc.
 */
export default function StatCard({
  label,
  value,
  hint,
  accent = "lime",
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "lime" | "amber" | "cyan" | "red";
  children?: ReactNode;
}) {
  const accentClass = {
    lime: "text-lime-300 border-lime-500/40 shadow-[0_0_24px_-12px_rgba(132,255,180,0.6)]",
    amber:
      "text-amber-300 border-amber-500/40 shadow-[0_0_24px_-12px_rgba(255,200,80,0.6)]",
    cyan: "text-cyan-300 border-cyan-500/40 shadow-[0_0_24px_-12px_rgba(120,220,255,0.6)]",
    red: "text-red-300 border-red-500/40 shadow-[0_0_24px_-12px_rgba(255,120,120,0.6)]",
  }[accent];

  return (
    <div
      className={`relative flex flex-col rounded-md border bg-black/60 p-4 backdrop-blur ${accentClass}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl tabular-nums sm:text-3xl">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 font-mono text-[11px] text-zinc-500">{hint}</div>
      ) : null}
      {children}
    </div>
  );
}
