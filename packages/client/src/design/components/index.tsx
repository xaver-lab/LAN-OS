// Shared design-system components — Dark Arcade OS
// All visual primitives extracted from LAN OS.html mockup.

import React, {
  type ReactNode,
  type CSSProperties,
  useState,
  useEffect,
} from "react";

// ── GridBg ────────────────────────────────────────────────────────────────
export function GridBg({
  children,
  style,
  className = "",
}: {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={`grid-bg ${className}`} style={style}>
      {children}
    </div>
  );
}

// ── ScanLine ──────────────────────────────────────────────────────────────
export function ScanLine({
  children,
  style,
  className = "",
}: {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={`scanline ${className}`} style={style}>
      {children}
    </div>
  );
}

// ── PulsingDot ────────────────────────────────────────────────────────────
export function PulsingDot({
  color = "var(--neon)",
  size = 8,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        animation: "pulse-neon 1.4s ease-in-out infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = "neon" | "cyan" | "magenta" | "amber" | "muted" | "ghost";

const BADGE_COLORS: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  neon:    { bg: "var(--neon-dim)",   color: "var(--neon)",    border: "var(--neon)" },
  cyan:    { bg: "#00e5ff18",         color: "var(--cyan)",    border: "var(--cyan)" },
  magenta: { bg: "#ff2d6b18",         color: "var(--magenta)", border: "var(--magenta)" },
  amber:   { bg: "#ffb83018",         color: "var(--amber)",   border: "var(--amber)" },
  muted:   { bg: "transparent",       color: "var(--muted)",   border: "var(--border)" },
  ghost:   { bg: "transparent",       color: "var(--text)",    border: "transparent" },
};

export function Badge({
  children,
  variant = "muted",
  style,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  style?: CSSProperties;
}) {
  const c = BADGE_COLORS[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 4,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.color,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 500,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ── NeonBar ───────────────────────────────────────────────────────────────
export function NeonBar({
  value,
  max = 100,
  color = "var(--neon)",
  height = 6,
  style,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  style?: CSSProperties;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      style={{
        height,
        background: "var(--bg3)",
        borderRadius: height,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 8px ${color}`,
          borderRadius: height,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ── NeonButton ────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "amber";

const BTN_STYLES: Record<BtnVariant, CSSProperties> = {
  primary: {
    background: "var(--neon-dim)",
    color: "var(--neon)",
    border: "1px solid var(--neon)",
    boxShadow: "0 0 10px var(--neon-dim)",
  },
  secondary: {
    background: "transparent",
    color: "var(--cyan)",
    border: "1px solid var(--cyan)",
  },
  danger: {
    background: "#ff2d6b18",
    color: "var(--magenta)",
    border: "1px solid var(--magenta)",
  },
  ghost: {
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid var(--border)",
  },
  amber: {
    background: "#ffb83018",
    color: "var(--amber)",
    border: "1px solid var(--amber)",
  },
};

export function NeonButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  style,
  fullWidth = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  fullWidth?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "8px 20px",
        borderRadius: 4,
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 600,
        fontSize: 15,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.15s ease",
        width: fullWidth ? "100%" : undefined,
        ...(BTN_STYLES[variant] as CSSProperties),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── NeonInput ─────────────────────────────────────────────────────────────
export function NeonInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  style,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        background: "var(--bg3)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        color: "var(--text)",
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 15,
        padding: "8px 12px",
        outline: "none",
        width: "100%",
        transition: "border-color 0.15s",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--neon)";
        e.currentTarget.style.boxShadow = "0 0 8px var(--neon-dim)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

// ── NeonSelect ────────────────────────────────────────────────────────────
export function NeonSelect({
  value,
  onChange,
  options,
  disabled = false,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        background: "var(--bg3)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        color: "var(--text)",
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 15,
        padding: "8px 12px",
        outline: "none",
        width: "100%",
        cursor: "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({
  children,
  title,
  accent,
  style,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  accent?: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--bg2)",
        border: `1px solid ${accent ?? "var(--border)"}`,
        borderRadius: 8,
        overflow: "hidden",
        ...(accent ? { boxShadow: `0 0 12px ${accent}22` } : {}),
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            padding: "10px 16px",
            borderBottom: `1px solid ${accent ?? "var(--border)"}`,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: accent ?? "var(--muted)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {title}
        </div>
      )}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────
export function Tabs({
  tabs,
  active,
  onSelect,
  style,
}: {
  tabs: { id: string; label: string; icon?: string }[];
  active: string;
  onSelect: (id: string) => void;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 3,
        ...style,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              flex: 1,
              padding: "7px 14px",
              borderRadius: 4,
              border: "none",
              background: isActive ? "var(--bg3)" : "transparent",
              color: isActive ? "var(--neon)" : "var(--muted)",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: isActive ? 700 : 500,
              fontSize: 13,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: isActive ? "0 0 8px var(--neon-dim)" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {t.icon && <span style={{ marginRight: 4 }}>{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  dangerous = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,10,20,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--bg2)",
          border: `1px solid ${dangerous ? "var(--magenta)" : "var(--border)"}`,
          borderRadius: 8,
          padding: 28,
          maxWidth: 420,
          width: "90%",
          boxShadow: dangerous
            ? "0 0 24px #ff2d6b44"
            : "0 8px 32px rgba(0,0,0,0.6)",
          animation: "fadeIn 0.2s ease",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: dangerous ? "var(--magenta)" : "var(--text)",
            marginBottom: 12,
          }}
        >
          {title}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <NeonButton variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </NeonButton>
          <NeonButton variant={dangerous ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </NeonButton>
        </div>
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 24, color = "var(--neon)" }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ── ConnectionBanner — design-feedback #2 ────────────────────────────────
export function ConnectionBanner({ error }: { error: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "var(--magenta)",
        color: "#fff",
        padding: "8px 16px",
        textAlign: "center",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.06em",
        zIndex: 9998,
        boxShadow: "0 2px 16px #ff2d6b88",
      }}
    >
      ⚠ VERBINDUNG UNTERBROCHEN — {error} — Reconnect…
    </div>
  );
}

// ── SimulationBanner ──────────────────────────────────────────────────────
export function SimulationBanner() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => !v), 700);
    return () => clearInterval(t);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#ffb83022",
        border: "1px solid var(--amber)",
        color: "var(--amber)",
        padding: "6px 16px",
        textAlign: "center",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.1em",
        zIndex: 9998,
        opacity: visible ? 1 : 0.3,
        transition: "opacity 0.3s",
      }}
    >
      ⚡ SIMULATION MODE AKTIV — Kein echter State wird verändert
    </div>
  );
}
