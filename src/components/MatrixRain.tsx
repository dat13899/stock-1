"use client";

import { useEffect, useRef } from "react";

/**
 * Classic falling-glyph "Matrix rain" rendered to a canvas.
 *
 * Uses hex-style glyphs (0-9 a-f) plus a few ETH-flavoured symbols so the
 * background visually rhymes with the keypair stream the user is watching.
 * It runs entirely in requestAnimationFrame and pauses when off-screen.
 */
const GLYPHS = "0123456789abcdefΞ⟠";

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drops: number[] = [];
    let columns = 0;
    const fontSize = 14;
    let dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas || !ctx) return;
      dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(w / fontSize);
      drops = new Array(columns)
        .fill(0)
        .map(() => Math.floor(Math.random() * 50));
    }

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let lastFrame = 0;
    const FRAME_INTERVAL = 1000 / 24; // ~24 fps is plenty for rain

    function draw(t: number) {
      if (!canvas || !ctx) return;
      raf = requestAnimationFrame(draw);
      if (t - lastFrame < FRAME_INTERVAL) return;
      lastFrame = t;

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      // Trail fade
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (let i = 0; i < drops.length; i++) {
        const ch = GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // Brighter at the leading edge.
        ctx.fillStyle = "rgba(0, 255, 120, 0.85)";
        ctx.fillText(ch, x, y);
        ctx.fillStyle = "rgba(0, 200, 90, 0.35)";
        ctx.fillText(ch, x, y - fontSize);

        if (y > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-40"
    />
  );
}
