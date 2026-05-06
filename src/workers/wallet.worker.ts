/// <reference lib="webworker" />
/**
 * Wallet generator Web Worker.
 *
 * Runs an unbounded loop generating Ethereum keypairs and reports back batches
 * of stats + samples to the main thread. Stops cleanly when it receives
 * { type: "stop" }. Designed to leave the UI responsive: each batch yields
 * to the event loop via postMessage / setTimeout(0).
 */
import { generateWallet, type Wallet } from "@/lib/eth";

export interface StartMessage {
  type: "start";
  vanityPrefix: string; // lower-case hex without "0x", may be empty
  batchSize: number; // wallets per micro-batch
  sampleEvery: number; // emit one sample wallet every N generated
}

export interface StopMessage {
  type: "stop";
}

export type WorkerInbound = StartMessage | StopMessage;

export interface TickMessage {
  type: "tick";
  generated: number; // count produced in this batch
  totalGenerated: number; // worker-local cumulative
  elapsedMs: number; // time spent in this batch
  sample: Wallet | null; // optional sample wallet
}

export interface MatchMessage {
  type: "match";
  wallet: Wallet;
  attempts: number; // worker-local total attempts up to and incl. match
}

export type WorkerOutbound = TickMessage | MatchMessage;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let running = false;
let total = 0;

function workLoop(prefix: string, batchSize: number, sampleEvery: number) {
  if (!running) return;
  const start = performance.now();
  let sample: Wallet | null = null;
  let inBatch = 0;

  for (let i = 0; i < batchSize; i++) {
    const wallet = generateWallet();
    total++;
    inBatch++;

    if (prefix.length > 0 && wallet.address.startsWith("0x" + prefix)) {
      const msg: MatchMessage = {
        type: "match",
        wallet,
        attempts: total,
      };
      ctx.postMessage(msg);
    }

    if (sampleEvery > 0 && total % sampleEvery === 0) {
      sample = wallet;
    }
  }

  const elapsedMs = performance.now() - start;
  const tick: TickMessage = {
    type: "tick",
    generated: inBatch,
    totalGenerated: total,
    elapsedMs,
    sample,
  };
  ctx.postMessage(tick);

  // Yield to the event loop so the worker can receive "stop" messages.
  if (running) {
    setTimeout(() => workLoop(prefix, batchSize, sampleEvery), 0);
  }
}

ctx.addEventListener("message", (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;
  if (msg.type === "start") {
    if (running) return;
    running = true;
    total = 0;
    workLoop(msg.vanityPrefix, msg.batchSize, msg.sampleEvery);
  } else if (msg.type === "stop") {
    running = false;
  }
});
