/**
 * Probability + ETA helpers for vanity address search.
 *
 * Ethereum addresses are 20 bytes = 40 hex chars. A vanity prefix of N hex
 * chars (after the leading "0x") matches with probability 1 / 16^N.
 *
 * Expected attempts to find one match = 16^N (geometric distribution mean).
 * Variance is large, so we also compute the median (≈ 0.693 · 16^N) and the
 * 99th percentile (≈ 4.605 · 16^N) so users get an honest picture.
 */

export interface VanityStats {
  /** Hex characters required (after "0x"). */
  prefixLength: number;
  /** 16^prefixLength as a BigInt — exact. */
  searchSpace: bigint;
  /** 1 / 16^N as a JS number (may underflow to 0 for huge prefixes). */
  probability: number;
  /** Mean attempts before first hit. */
  expectedAttempts: bigint;
  /** Median attempts (50% chance of finding by here). */
  medianAttempts: bigint;
  /** P99 attempts (99% chance of finding by here). */
  p99Attempts: bigint;
}

const LN2 = Math.log(2);
// ln(1 - 0.99) = ln(0.01) ≈ -4.605, so attempts for 99% = 4.605 / -ln(15/16)
// Easier: median = ln(2) * mean, p99 ≈ ln(100) * mean for geometric-ish.
const LN100 = Math.log(100);

export function computeVanityStats(rawPrefix: string): VanityStats | null {
  const cleaned = normalizePrefix(rawPrefix);
  if (cleaned === null) return null;
  const n = cleaned.length;
  const searchSpace = 16n ** BigInt(n);
  const probability = n === 0 ? 1 : Math.pow(16, -n);
  return {
    prefixLength: n,
    searchSpace,
    probability,
    expectedAttempts: searchSpace,
    medianAttempts: scaleBigInt(searchSpace, LN2),
    p99Attempts: scaleBigInt(searchSpace, LN100),
  };
}

/** Returns the hex part (without "0x"), or null if the input contains
 *  non-hex characters. Empty string is a valid (no-op) prefix. */
export function normalizePrefix(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  if (s.startsWith("0x")) s = s.slice(2);
  if (s.length > 40) return null;
  if (s.length === 0) return "";
  if (!/^[0-9a-f]+$/.test(s)) return null;
  return s;
}

/** Multiply a BigInt by a positive float and round to the nearest BigInt. */
function scaleBigInt(value: bigint, factor: number): bigint {
  if (factor <= 0) return 0n;
  // Use 1e9 fixed-point so we don't lose precision for very small factors.
  const SCALE = 1_000_000_000n;
  const scaled = BigInt(Math.round(factor * 1_000_000_000));
  return (value * scaled) / SCALE;
}

/** Estimate seconds to reach a target number of attempts at given hashes/sec.
 *  Returns Infinity when rate is 0 or non-positive. */
export function attemptsToSeconds(
  attempts: bigint,
  hashesPerSecond: number
): number {
  if (hashesPerSecond <= 0) return Infinity;
  // Convert BigInt to a Number; for huge attempts we use logs to avoid overflow.
  if (attempts < BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(attempts) / hashesPerSecond;
  }
  // attempts is too big for a safe Number — fall back to Infinity-ish display.
  // (Caller will format as ">heat death of the universe" anyway.)
  return Number.POSITIVE_INFINITY;
}

/** Format a BigInt with thousands separators. */
export function formatBigInt(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const SECOND = 1;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const YEAR = 365.25 * DAY;
const UNIVERSE_AGE_SECONDS = 13.8e9 * YEAR;

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "∞ (effectively never)";
  if (seconds < 1e-3) return `${(seconds * 1000).toFixed(2)} ms`;
  if (seconds < SECOND) return `${(seconds * 1000).toFixed(0)} ms`;
  if (seconds < MINUTE) return `${seconds.toFixed(1)} s`;
  if (seconds < HOUR) return `${(seconds / MINUTE).toFixed(1)} min`;
  if (seconds < DAY) return `${(seconds / HOUR).toFixed(1)} h`;
  if (seconds < YEAR) return `${(seconds / DAY).toFixed(1)} days`;
  if (seconds < UNIVERSE_AGE_SECONDS) {
    const years = seconds / YEAR;
    if (years < 1e6) return `${years.toFixed(1)} years`;
    if (years < 1e9) return `${(years / 1e6).toFixed(2)} million years`;
    return `${(years / 1e9).toFixed(2)} billion years`;
  }
  const universes = seconds / UNIVERSE_AGE_SECONDS;
  if (universes < 1e6) return `${universes.toFixed(2)}× age of universe`;
  return `${universes.toExponential(2)}× age of universe`;
}

/** Compact scientific notation for very large BigInts. */
export function formatBigIntCompact(value: bigint): string {
  const s = value.toString();
  if (s.length <= 6) return s;
  const exp = s.length - 1;
  const lead = s[0];
  const next = s.slice(1, 3);
  return `${lead}.${next} × 10^${exp}`;
}
