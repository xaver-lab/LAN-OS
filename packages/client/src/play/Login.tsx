// §11 Self-Service Player Login.

import React, { useState } from "react";
import { login, reconnect } from "../api/client.js";
import { NeonButton, NeonInput, NeonSelect, Card } from "../design/components/index.js";
import type { Session } from "../api/useSession.js";
import type { PlayerRole, Track } from "@lan-os/shared";

interface Props {
  onLogin: (session: Session) => void;
}

// 6 vordefinierte Arcade-Farben aus Design-System
const PRESET_COLORS = [
  "#39ff6e", // neon (grün)
  "#00e5ff", // cyan
  "#ff2d6b", // magenta
  "#ffb830", // amber
  "#f72fff", // synthwave pink
  "#80ffea", // arctic cyan
];

// Helper: Validiere Namen (min 2 Zeichen, nur alphanumeric + spaces)
function validateName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Name darf nicht leer sein." };
  if (trimmed.length < 2) return { valid: false, error: "Name muss mindestens 2 Zeichen lang sein." };
  if (!/^[a-zA-Z0-9\s\-äöüß]+$/i.test(trimmed)) {
    return { valid: false, error: "Name: nur Buchstaben, Zahlen, Bindestriche und Umlaute erlaubt." };
  }
  return { valid: true };
}

// Helper: Validiere Hex-Farbe
function validateHexColor(hex: string): { valid: boolean; color: string } {
  const trimmed = hex.trim();
  if (!trimmed) return { valid: true, color: "" };
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return { valid: false, color: "" };
  }
  return { valid: true, color: trimmed };
}

export function Login({ onLogin }: Props) {
  const [name, setName] = useState("");
  const [presetColor, setPresetColor] = useState<string>("");
  const [customColor, setCustomColor] = useState("");
  const [role, setRole] = useState<PlayerRole>("Spieler");
  const [activeTracks, setActiveTracks] = useState<Track[]>(["TOURNAMENT"]);
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"login" | "reconnect">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Ermittle finale Farbe: custom > preset > ""
  const finalColor = customColor && validateHexColor(customColor).valid ? customColor : presetColor;

  async function handleLogin() {
    // Validiere Name
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      setError(nameValidation.error ?? "Name ungültig.");
      return;
    }

    // Validiere CustomColor falls gesetzt
    if (customColor && !validateHexColor(customColor).valid) {
      setError("Hex-Farbe ungültig (Format: #RRGGBB)");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await login(name.trim(), finalColor || undefined, role, activeTracks);
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

  function toggleTrack(track: Track) {
    setActiveTracks((prev) =>
      prev.includes(track) ? prev.filter((t) => t !== track) : [...prev, track]
    );
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
      <div style={{ width: "100%", maxWidth: 480 }}>
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
              {/* Name Input */}
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  NAME *
                </label>
                <NeonInput
                  value={name}
                  onChange={setName}
                  placeholder="Dein Name (2-24 Zeichen)"
                />
              </div>

              {/* Color Section */}
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  FARBE (opt.)
                </label>

                {/* Preset Color Picker */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setPresetColor(color);
                        setCustomColor("");
                      }}
                      style={{
                        height: 40,
                        background: color,
                        border: presetColor === color && !customColor ? "2px solid var(--text)" : "1px solid var(--border)",
                        borderRadius: 4,
                        cursor: "pointer",
                        boxShadow:
                          presetColor === color && !customColor ? `0 0 8px ${color}66` : "none",
                        transition: "all 0.15s",
                      }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Custom Hex Input */}
                <NeonInput
                  value={customColor}
                  onChange={(val) => {
                    setCustomColor(val);
                    if (validateHexColor(val).valid) setPresetColor("");
                  }}
                  placeholder="#RRGGBB (custom)"
                  type="text"
                />

                {/* Color Preview */}
                {finalColor && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      borderRadius: 4,
                      background: finalColor + "22",
                      border: `1px solid ${finalColor}`,
                      fontSize: 11,
                      color: "var(--text)",
                      textAlign: "center",
                    }}
                  >
                    Deine Farbe: <strong>{finalColor}</strong>
                  </div>
                )}
              </div>

              {/* Role Select */}
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  ROLLE
                </label>
                <NeonSelect
                  value={role}
                  onChange={(val) => setRole(val as PlayerRole)}
                  options={[
                    { value: "Spieler", label: "Spieler" },
                    { value: "Zuschauer", label: "Zuschauer" },
                    { value: "GameMaster", label: "Game Master" },
                  ]}
                />
              </div>

              {/* Active Tracks */}
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  AKTIVE TRACKS
                </label>
                <div style={{ display: "grid", gap: 6 }}>
                  {(["TOURNAMENT", "SOULMASK"] as const).map((track) => (
                    <label
                      key={track}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: "var(--bg3)",
                        border: activeTracks.includes(track) ? "1px solid var(--neon)" : "1px solid var(--border)",
                        borderRadius: 4,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={activeTracks.includes(track)}
                        onChange={() => toggleTrack(track)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: "pointer",
                          accentColor: "var(--neon)",
                        }}
                      />
                      <span style={{ fontSize: 14, color: "var(--text)" }}>
                        {track === "TOURNAMENT" ? "Turnier" : "Soulmask"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    color: "var(--magenta)",
                    fontSize: 13,
                    padding: "8px 10px",
                    background: "#ff2d6b18",
                    border: "1px solid var(--magenta)",
                    borderRadius: 4,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Login Button */}
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
