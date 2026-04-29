// TV Mode: Spin — 3 Wheel-Variants (pie / orbital / fortune).
// Animation: easing-out-quartic, ~3.7s, SPIN_DURATION_MS from constants.
// Kandidaten = state.spinSession.candidates.

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { SystemState } from "@lan-os/shared";

interface Props {
  state: SystemState;
}

export function SpinMode({ state }: Props) {
  const variant = state.uiPreferences.wheelVariant ?? "pie";
  const spin = state.spinSession;
  if (!spin) return null;

  const candidates = spin.candidates;
  // Map to {id, name} for wheel components (use title as name)
  const games = candidates
    .map((id) => state.games.find((g) => g.id === id))
    .filter(Boolean)
    .map((g) => ({ id: g!.id, name: g!.title }));

  const finished = !!spin.winnerId;
  const winnerGame = finished ? state.games.find((g) => g.id === spin.winnerId) : null;
  const winner = winnerGame ? { id: winnerGame.id, name: winnerGame.title } : null;

  return (
    <div
      className="grid-bg scanline"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 40,
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          color: "var(--muted)",
          letterSpacing: "0.2em",
          marginBottom: 8,
        }}
      >
        {finished ? "WINNER" : "SPINNING…"}
      </div>

      {variant === "pie"     && <PieWheel games={games} winnerId={spin.winnerId ?? null} spinning={!finished} />}
      {variant === "orbital" && <OrbitalWheel games={games} winnerId={spin.winnerId ?? null} spinning={!finished} />}
      {variant === "fortune" && <FortuneWheel games={games} winnerId={spin.winnerId ?? null} spinning={!finished} />}

      {finished && winner && (
        <div
          style={{
            textAlign: "center",
            animation: "fadeIn 0.6s ease",
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "var(--neon)",
              textShadow: "0 0 20px var(--neon), 0 0 60px var(--neon)",
              letterSpacing: "0.05em",
            }}
          >
            {winner.name}
          </div>
          <div style={{ fontSize: 16, color: "var(--muted)", marginTop: 8, letterSpacing: "0.1em" }}>
            Nächstes Spiel!
          </div>
        </div>
      )}
    </div>
  );
}

// ── Easing ────────────────────────────────────────────────────────────────
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

const SPIN_MS = 3700;
const NEON_COLORS = [
  "#39ff6e", "#00e5ff", "#ff2d6b", "#ffb830",
  "#b040ff", "#ff6b2b", "#00ffcc", "#fff700",
];

// ── Pie Wheel ─────────────────────────────────────────────────────────────
function PieWheel({
  games,
  winnerId,
  spinning,
}: {
  games: { id: string; name: string }[];
  winnerId: string | null;
  spinning: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const targetAngle = useRef(0);
  const rafRef = useRef<number>(0);

  const sliceAngle = (2 * Math.PI) / Math.max(games.length, 1);

  const draw = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = Math.min(cx, cy) - 8;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      games.forEach((g, i) => {
        const startA = i * sliceAngle + rotation;
        const endA   = startA + sliceAngle;
        const color  = NEON_COLORS[i % NEON_COLORS.length]!;
        const isWinner = g.id === winnerId;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startA, endA);
        ctx.closePath();
        ctx.fillStyle = isWinner && winnerId ? color : color + "44";
        ctx.fill();
        ctx.strokeStyle = "var(--bg)";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (isWinner && winnerId) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 20;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Label
        const midA = startA + sliceAngle / 2;
        const lx = cx + (r * 0.65) * Math.cos(midA);
        const ly = cy + (r * 0.65) * Math.sin(midA);
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(midA + Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Rajdhani, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(g.name.slice(0, 12), 0, 0);
        ctx.restore();
      });

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
      ctx.fillStyle = "var(--bg)";
      ctx.fill();
      ctx.strokeStyle = "var(--neon)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pointer
      ctx.beginPath();
      ctx.moveTo(cx + r + 8, cy);
      ctx.lineTo(cx + r - 20, cy - 10);
      ctx.lineTo(cx + r - 20, cy + 10);
      ctx.closePath();
      ctx.fillStyle = "var(--neon)";
      ctx.fill();
    },
    [games, sliceAngle, winnerId],
  );

  useEffect(() => {
    if (spinning) {
      targetAngle.current = angleRef.current + 6 * Math.PI + Math.random() * 4 * Math.PI;
      startRef.current = null;

      const animate = (now: number) => {
        if (!startRef.current) startRef.current = now;
        const elapsed = now - startRef.current;
        const progress = Math.min(1, elapsed / SPIN_MS);
        const eased = easeOutQuart(progress);
        const current = angleRef.current + (targetAngle.current - angleRef.current) * eased;
        draw(current);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          angleRef.current = targetAngle.current;
        }
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    } else {
      draw(angleRef.current);
    }
  }, [spinning, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={480}
      style={{ borderRadius: "50%", filter: "drop-shadow(0 0 20px var(--neon-dim))" }}
    />
  );
}

// ── Orbital Wheel ─────────────────────────────────────────────────────────
function OrbitalWheel({
  games,
  winnerId,
  spinning,
}: {
  games: { id: string; name: string }[];
  winnerId: string | null;
  spinning: boolean;
}) {
  const [rotation, setRotation] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const currentRef = useRef(0);
  const targetRef = useRef(0);

  useEffect(() => {
    if (spinning) {
      targetRef.current = currentRef.current + 360 * 5 + Math.random() * 360;
      startRef.current = null;

      const animate = (now: number) => {
        if (!startRef.current) startRef.current = now;
        const elapsed = now - startRef.current;
        const progress = Math.min(1, elapsed / SPIN_MS);
        const eased = easeOutQuart(progress);
        const val = currentRef.current + (targetRef.current - currentRef.current) * eased;
        setRotation(val);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          currentRef.current = targetRef.current;
        }
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [spinning]);

  const radius = 200;
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {games.map((g, i) => {
        const angle = (i / games.length) * 360 + rotation;
        const rad = (angle * Math.PI) / 180;
        const x = cx + radius * Math.cos(rad) - 60;
        const y = cy + radius * Math.sin(rad) - 20;
        const isWinner = g.id === winnerId;

        return (
          <div
            key={g.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 120,
              padding: "6px 10px",
              background: isWinner && winnerId ? "var(--neon-dim)" : "var(--bg2)",
              border: `1px solid ${isWinner && winnerId ? "var(--neon)" : NEON_COLORS[i % NEON_COLORS.length]! + "66"}`,
              borderRadius: 6,
              color: isWinner && winnerId ? "var(--neon)" : "var(--text)",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
              boxShadow: isWinner && winnerId ? "0 0 20px var(--neon)" : "none",
              transition: "all 0.1s",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {g.name}
          </div>
        );
      })}
      {/* Center */}
      <div
        style={{
          position: "absolute",
          left: cx - 24,
          top: cy - 24,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--bg3)",
          border: "2px solid var(--neon)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--neon)",
          fontSize: 20,
          boxShadow: "0 0 16px var(--neon-dim)",
        }}
      >
        ◎
      </div>
    </div>
  );
}

// ── Fortune Wheel (vertical strip) ────────────────────────────────────────
function FortuneWheel({
  games,
  winnerId,
  spinning,
}: {
  games: { id: string; name: string }[];
  winnerId: string | null;
  spinning: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const ITEM_H = 72;
  const totalH = games.length * ITEM_H;

  useEffect(() => {
    if (spinning) {
      targetRef.current = currentRef.current + totalH * 4 + Math.random() * totalH;
      startRef.current = null;

      const animate = (now: number) => {
        if (!startRef.current) startRef.current = now;
        const elapsed = now - startRef.current;
        const progress = Math.min(1, elapsed / SPIN_MS);
        const eased = easeOutQuart(progress);
        const val = currentRef.current + (targetRef.current - currentRef.current) * eased;
        setOffset(val % totalH);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          currentRef.current = targetRef.current;
        }
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [spinning, totalH]);

  const doubled = [...games, ...games]; // seamless loop

  return (
    <div
      style={{
        position: "relative",
        width: 360,
        height: 360,
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--bg2)",
      }}
    >
      {/* Gradient masks */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, var(--bg2) 0%, transparent 30%, transparent 70%, var(--bg2) 100%)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      {/* Pointer line */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: ITEM_H,
          marginTop: -ITEM_H / 2,
          border: "2px solid var(--neon)",
          boxShadow: "0 0 12px var(--neon-dim)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          transform: `translateY(-${offset}px)`,
          transition: spinning ? "none" : "none",
        }}
      >
        {doubled.map((g, i) => {
          const isWinner = !spinning && g.id === winnerId;
          return (
            <div
              key={`${g.id}-${i}`}
              style={{
                height: ITEM_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: isWinner ? "var(--neon)" : "var(--text)",
                textShadow: isWinner ? "0 0 12px var(--neon)" : "none",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {g.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
