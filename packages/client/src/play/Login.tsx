// §11 Self-Service Player Login.

import React, { useState } from "react";
import { login, reconnect } from "../api/client.js";
import { NeonButton, NeonInput, Card } from "../design/components/index.js";
import type { Session } from "../api/useSession.js";

interface Props {
  onLogin: (session: Session) => void;
}

export function Login({ onLogin }: Props) {
  const [name, setName] = useState("");
  const [colorWish, setColorWish] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"login" | "reconnect">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!name.trim()) { setError("Name darf nicht leer sein."); return; }
    setBusy(true);
    setError("");
    try {
      const result = await login(name.trim(), colorWish || undefined);
      onLogin({ token: result.sessionToken, playerId: result.playerId, playerName: result.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleReconnect() {
    if (!token.trim()) { setError("Token darf nicht leer sein."); return; }
    setBusy(true);
    setError("");
    try {
      const result = await reconnect(token.trim());
      onLogin({ token: result.sessionToken, playerId: result.playerId, playerName: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--neon)",
              textShadow: "0 0 20px var(--neon), 0 0 40px var(--neon)",
              letterSpacing: "0.2em",
            }}
          >
            LAN OS
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, letterSpacing: "0.1em", marginTop: 6 }}>
            EVENT SYSTEM
          </div>
        </div>

        <Card>
          {/* Mode toggle */}
          <div style={{ display: "flex", marginBottom: 20, gap: 4 }}>
            {(["login", "reconnect"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  background: mode === m ? "var(--bg3)" : "transparent",
                  border: `1px solid ${mode === m ? "var(--neon)" : "var(--border)"}`,
                  borderRadius: 4,
                  color: mode === m ? "var(--neon)" : "var(--muted)",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {m === "login" ? "Anmelden" : "Reconnect"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  NAME
                </label>
                <NeonInput
                  value={name}
                  onChange={setName}
                  placeholder="Dein Name (max. 24 Zeichen)"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  WUNSCHFARBE (opt.)
                </label>
                <NeonInput value={colorWish} onChange={setColorWish} placeholder="#39ff6e" />
              </div>
              {error && (
                <div style={{ color: "var(--magenta)", fontSize: 13, padding: "6px 10px", background: "#ff2d6b18", borderRadius: 4 }}>
                  {error}
                </div>
              )}
              <NeonButton
                onClick={handleLogin}
                disabled={busy}
                fullWidth
                style={{ marginTop: 4 }}
              >
                {busy ? "Anmelden…" : "Anmelden"}
              </NeonButton>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  SESSION TOKEN
                </label>
                <NeonInput value={token} onChange={setToken} placeholder="Token aus vorheriger Sitzung" />
              </div>
              {error && (
                <div style={{ color: "var(--magenta)", fontSize: 13, padding: "6px 10px", background: "#ff2d6b18", borderRadius: 4 }}>
                  {error}
                </div>
              )}
              <NeonButton onClick={handleReconnect} disabled={busy} fullWidth>
                {busy ? "Verbinde…" : "Reconnect"}
              </NeonButton>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
