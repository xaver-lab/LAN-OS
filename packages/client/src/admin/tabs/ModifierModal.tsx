// Modifier-Selection Modal für Admin Match-Setup
// Tab-Navigation nach Category (risk-reward, balance, chaos)
// Checkbox-Selection + Impact-Preview + Quick-Scenario Buttons

import React, { useState, useMemo } from "react";
import type { SystemState, Modifier, Match } from "@lan-os/shared";
import { Card, NeonButton, NeonSelect, Badge, Tabs } from "../../design/components/index.js";
import { post } from "../../api/client.js";

const CATEGORY_COLORS: Record<string, string> = {
  "risk-reward": "#ffb830",   // Neon-Gelb
  "balance": "#39ff6e",        // Neon-Grün
  "chaos": "#ff006e",          // Neon-Magenta
};

const QUICK_SCENARIOS = {
  balanced: {
    label: "Quick: Balanced",
    description: "Gleichgewicht + Stabilität",
    modifierIds: [] as string[], // Wird gefüllt basierend auf verfügbaren Modifiern
  },
  chaotic: {
    label: "Quick: Chaotic",
    description: "Chaos & Überraschungen",
    modifierIds: [] as string[],
  },
  risky: {
    label: "Quick: Risky",
    description: "Hohes Risiko, hoher Gewinn",
    modifierIds: [] as string[],
  },
};

interface Props {
  open: boolean;
  state: SystemState;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModifierModal({ open, state, onClose, onSuccess }: Props) {
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"risk-reward" | "balance" | "chaos">("risk-reward");
  const [busy, setBusy] = useState(false);

  // Match-Optionen: nur open/active matches
  const matchOptions = state.matches
    .filter((m) => m.status === "open" || m.status === "active")
    .map((m) => {
      const game = state.games.find((g) => g.id === m.gameId);
      return {
        value: m.id,
        label: `${game?.title || m.gameId} (${m.type})`,
      };
    });

  // Ausgewähltes Match
  const selectedMatch = state.matches.find((m) => m.id === selectedMatchId);
  const game = selectedMatch ? state.games.find((g) => g.id === selectedMatch.gameId) : null;

  // Modifier gruppiert nach Category
  const modifiersByCategory = useMemo(() => {
    const grouped: Record<"risk-reward" | "balance" | "chaos", Modifier[]> = {
      "risk-reward": [],
      "balance": [],
      "chaos": [],
    };
    state.modifiers.filter((m) => m.enabled).forEach((m) => {
      grouped[m.category].push(m);
    });
    return grouped;
  }, [state.modifiers]);

  // Quick Scenarios basierend auf verfügbaren Modifiern füllen
  const quickScenarios = useMemo(() => {
    const scenarios = { ...QUICK_SCENARIOS };
    const allModifiers = state.modifiers.filter((m) => m.enabled);

    // Balance: Mix aus risk-reward und chaos
    scenarios.balanced.modifierIds = allModifiers
      .filter((m) => m.category === "balance")
      .slice(0, 2)
      .map((m) => m.id);

    // Chaotic: Primär chaos
    scenarios.chaotic.modifierIds = allModifiers
      .filter((m) => m.category === "chaos")
      .slice(0, 3)
      .map((m) => m.id);

    // Risky: Primär risk-reward
    scenarios.risky.modifierIds = allModifiers
      .filter((m) => m.category === "risk-reward")
      .slice(0, 2)
      .map((m) => m.id);

    return scenarios;
  }, [state.modifiers]);

  async function saveModifiers() {
    if (!selectedMatchId) {
      alert("Wähle ein Match aus");
      return;
    }
    setBusy(true);
    try {
      await post(`/admin/matches/${selectedMatchId}/modifiers`, {
        modifierIds: selectedModifierIds,
      });
      // Reset und close
      setSelectedMatchId("");
      setSelectedModifierIds([]);
      setActiveTab("risk-reward");
      onClose();
      onSuccess();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleModifier(modifierId: string) {
    setSelectedModifierIds((ids) =>
      ids.includes(modifierId)
        ? ids.filter((x) => x !== modifierId)
        : [...ids, modifierId]
    );
  }

  function applyQuickScenario(scenario: typeof QUICK_SCENARIOS.balanced) {
    setSelectedModifierIds(scenario.modifierIds);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg1)",
          border: "2px solid var(--neon)",
          borderRadius: 12,
          padding: 20,
          maxWidth: 900,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 0 20px var(--neon-dim)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "var(--neon)", fontFamily: "'Rajdhani', sans-serif" }}>
            ⚙️ Modifiers für Match
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 24,
              color: "var(--neon)",
              cursor: "pointer",
              padding: 0,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {/* Match-Selector */}
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 700 }}>
              MATCH WÄHLEN
            </label>
            <NeonSelect
              value={selectedMatchId}
              onChange={setSelectedMatchId}
              options={[{ value: "", label: "Match wählen…" }, ...matchOptions]}
            />
          </div>

          {/* Match-Info Panel */}
          {selectedMatch && (
            <Card title="📊 Match-Info" accent="var(--cyan)">
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Spiel:</span>
                  <span style={{ marginLeft: 8, fontWeight: 700 }}>{game?.title || "–"}</span>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Typ:</span>
                  <Badge variant="cyan" style={{ marginLeft: 8 }}>
                    {selectedMatch.type}
                  </Badge>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Teams:</span>
                  <span style={{ marginLeft: 8, fontSize: 12 }}>
                    {selectedMatch.teamA.length} vs {selectedMatch.teamB.length} Spieler
                  </span>
                </div>
                {selectedMatch.activeModifiers.length > 0 && (
                  <div>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Aktuelle Modifiers:</span>
                    <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {selectedMatch.activeModifiers.map((modId) => {
                        const mod = state.modifiers.find((m) => m.id === modId);
                        return mod ? (
                          <Badge key={modId} variant="muted" style={{ fontSize: 11 }}>
                            {mod.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Scenarios */}
          {selectedMatch && (
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 700 }}>
                💡 QUICK-SZENARIEN
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {Object.entries(quickScenarios).map(([key, scenario]) => (
                  <NeonButton
                    key={key}
                    variant="ghost"
                    onClick={() => applyQuickScenario(scenario)}
                    style={{
                      fontSize: 12,
                      padding: "8px 12px",
                      border: `1px solid var(--${key === "chaotic" ? "magenta" : key === "risky" ? "amber" : "cyan"})`,
                      color: `var(--${key === "chaotic" ? "magenta" : key === "risky" ? "amber" : "cyan"})`,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{scenario.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{scenario.description}</div>
                  </NeonButton>
                ))}
              </div>
            </div>
          )}

          {/* Modifier Selection Tabs */}
          {selectedMatch && (
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 8, fontWeight: 700 }}>
                MODIFIERS WÄHLEN
              </label>
              <Tabs
                tabs={[
                  { id: "risk-reward", label: "Risk-Reward", icon: "💰" },
                  { id: "balance", label: "Balance", icon: "⚖️" },
                  { id: "chaos", label: "Chaos", icon: "🌪️" },
                ]}
                active={activeTab}
                onSelect={(id) => setActiveTab(id as typeof activeTab)}
              />

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {modifiersByCategory[activeTab].length > 0 ? (
                  modifiersByCategory[activeTab].map((mod) => (
                    <ModifierCheckbox
                      key={mod.id}
                      modifier={mod}
                      selected={selectedModifierIds.includes(mod.id)}
                      onToggle={() => toggleModifier(mod.id)}
                      color={CATEGORY_COLORS[mod.category]}
                    />
                  ))
                ) : (
                  <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0", textAlign: "center" }}>
                    Keine Modifiers in dieser Kategorie verfügbar.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Impact Preview */}
          {selectedMatch && selectedModifierIds.length > 0 && (
            <Card title="📈 Impact-Preview" accent="var(--amber)">
              <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>
                <div>
                  <strong>{selectedModifierIds.length} Modifier aktiv:</strong>
                </div>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: 16 }}>
                  {selectedModifierIds.map((modId) => {
                    const mod = state.modifiers.find((m) => m.id === modId);
                    if (!mod) return null;
                    return (
                      <li key={modId} style={{ margin: "4px 0" }}>
                        <strong>{mod.label}:</strong>{" "}
                        {mod.rules.multiplier && `×${mod.rules.multiplier} Punkte`}
                        {mod.rules.handicap && `${mod.rules.handicap > 0 ? "+" : ""}${mod.rules.handicap} Handicap`}
                        {mod.rules.note && ` — ${mod.rules.note}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <NeonButton onClick={onClose} variant="ghost" disabled={busy}>
              Abbrechen
            </NeonButton>
            <NeonButton
              onClick={saveModifiers}
              variant="primary"
              disabled={busy || !selectedMatchId}
            >
              {busy ? "Speichern..." : "Modifiers speichern"}
            </NeonButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModifierCheckbox({
  modifier,
  selected,
  onToggle,
  color,
}: {
  modifier: Modifier;
  selected: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: selected ? color + "22" : "var(--bg3)",
        border: `2px solid ${selected ? color : "var(--border)"}`,
        borderRadius: 6,
        cursor: "pointer",
        transition: "all 0.15s",
        textAlign: "left",
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          border: `2px solid ${color}`,
          borderRadius: 3,
          background: selected ? color : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: selected ? "var(--bg1)" : "transparent",
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        ✓
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: selected ? color : "var(--text)", fontSize: 13 }}>
          {modifier.label}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {modifier.rules.multiplier && `Multiplikator: ×${modifier.rules.multiplier}`}
          {modifier.rules.handicap && `Handicap: ${modifier.rules.handicap > 0 ? "+" : ""}${modifier.rules.handicap}`}
          {modifier.rules.note && `— ${modifier.rules.note}`}
        </div>
      </div>
      <Badge variant="muted" style={{ fontSize: 10, whiteSpace: "nowrap" }}>
        {modifier.appliesTo}
      </Badge>
    </button>
  );
}
