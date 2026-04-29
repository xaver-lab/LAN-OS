# 🎨 Feedback an Claude Design — Lücken im LAN OS Mockup

Stand nach README v3 (Planning Pass). Mockup-Quelle: `.claude/_design_bundle/project/LAN OS.html`.

Was bereits **stark** ist — bleibt:
- 2 Voting-Varianten (Multi-Vote + Elimination-Vote) — beide werden in v3 als gleichwertige Modi übernommen ✅
- 3 Wheel-Varianten (Pie / Orbital / Fortune) — alle drei bleiben als Setting verfügbar ✅
- 3 TV-Themes (Dark Arcade / Synthwave / Arctic) — alle drei bleiben verfügbar ✅
- Match-Editor mit 1v1/2v2/Team/FFA + Live-Punkteberechnung + Sidebar mit Runden-Liste ✅
- Punktesystem im Code (Win/Draw/Loss + Bonus + MVP) — exakt so übernommen ✅
- Admin-Panel mit 5 Tabs + Spieler-Management (Edit/Warn/Kick mit Confirm) + Voting-Timer-Slider + Backup-Liste ✅
- Soulmask TV-Screen (Rollen-Cards, Global Goals, Live Task Feed, Moral-Meter) ✅

---

## 🚧 Was im Mockup noch fehlt / unklar ist

### 1. Browser-UI: Player-Login fehlt
- **Problem:** Self-Service-Anmeldung (Name eintippen, Farb-Wahl, Re-Connect über sessionToken) hat im Mockup keinen Login-Screen.
- **Bitte ergänzen:** Login-Layout für `/play` — Name-Input, optional Color-Picker, Submit-Feedback bei Name-Konflikt.

### 2. Browser-UI: Reconnect / Verbindungsverlust-State fehlt
- **Problem:** Was sieht ein Player, wenn der Server kurz weg ist (z. B. Admin-PC kurz blockiert)?
- **Bitte ergänzen:** Toast / Banner „Verbindung verloren — versuche Re-Connect", Reconnect-Indicator.

### 3. Admin-Panel: Modifier-Konfigurations-UI fehlt
- **Problem:** Modifier-System (Risk/Reward · Balance · Chaos) ist in v3 ein Kern-Feature, im Mockup gibt es nur Spuren im Voting-Tab.
- **Bitte ergänzen:** im Turnier-Tab ein „Modifier"-Panel: Liste aktiver Modifier, Toggle, Modifier-Library mit Add/Remove, Modifier vor/während Match setzen.

### 4. Admin-Panel: AI-Game-Analysis-Trigger fehlt
- **Problem:** AI Pre-Analysis ist in v3 formalisiert, aber im Mockup gibt es keinen Trigger / keine Game-Card-Verwaltung.
- **Bitte ergänzen:** Game-Library-View (eigener Tab oder im Übersicht-Tab): Liste aller `games[]`, Status `aiAnalyzed`, „Re-Analyze"-Button, AI-Score-Anzeige (Tournament Suitability, Chaos Potential).

### 5. Admin-Panel: Track-Switch (Tournament/Soulmask parallel) fehlt
- **Problem:** v3 erlaubt **beide Tracks gleichzeitig**. Mockup hat im Mode-Switcher nur einen aktiven Mode (`['LOBBY','VOTING','ELIMINATION','SPIN','MATCH']`).
- **Bitte ergänzen:** Im Übersicht-Tab zwei separate Toggle-Switches: „TOURNAMENT TRACK" an/aus + „SOULMASK TRACK" an/aus (unabhängig). Aktueller `tournamentState` und `soulmaskState` separat anzeigen.

### 6. Admin-Panel: Soulmask-Tab fehlt komplett
- **Problem:** v3 hat einen eigenen Soulmask-Admin-Tab (Rollen zuweisen, Custom-Rollen anlegen, Tasks/Goals verwalten, Quick-Role-Switch).
- **Bitte ergänzen:** Sechster Admin-Tab „Soulmask": Player→Rollen-Mapping (drag/drop oder dropdown), Custom-Rolle anlegen-Modal, Task-CRUD, Goal-Progress-Slider.

### 7. TV: „Last Game Winner"-Widget für LOBBY-Mode noch nicht spezifiziert
- **Problem:** feature.md §5 will einen Last-Winner-Block (Spieler · Spiel · Zeit) auf der LOBBY-Seite — Mockup zeigt nur Leaderboard.
- **Bitte ergänzen:** Card-Layout in TV-LOBBY-Mode für „Last Winner" mit Spieler-Avatar, Spiel-Name, Zeitpunkt.

### 8. TV: Event-Timeline / „Weak Tree" fehlt
- **Problem:** feature.md §5 nennt eine visuelle Darstellung des Spielverlaufs — kein visuelles Konzept im Mockup.
- **Bitte ergänzen:** Konzept für eine horizontale oder vertikale Timeline der Runden (Zeit, Match-Typ, Sieger) — kann auf TV-LOBBY oder als eigener TV-Screen.

### 9. TV: Soulmask ↔ Tournament Übergänge / Banner
- **Problem:** Beide Tracks können parallel laufen — TV muss ggf. wechseln oder kombinieren. Im Mockup ist Soulmask als Stand-Alone-Screen designt.
- **Bitte ergänzen:** Konzept für: (a) Soulmask als Picture-in-Picture während Tournament-Match, ODER (b) automatischer Wechsel-Slideshow zwischen Tournament-LOBBY und Soulmask-Screen.

### 10. Spin: Tie-Break-Hinweis-Overlay fehlt
- **Problem:** Bei Voting-Tie braucht das System eine Admin-Entscheidung („Override" oder „Multi-Eliminate"). Mockup zeigt keinen Tie-Break-State.
- **Bitte ergänzen:** Modal/Overlay auf TV (informativ) + Admin-Panel (Aktion): „Tie zwischen [Game A], [Game B] — wie auflösen?".

### 11. Match-Setup: Modifier-Slot fehlt
- **Problem:** Match-Editor hat Team-Builder + Score-Eingabe, aber keinen Modifier-Slot.
- **Bitte ergänzen:** Im Match-Setup-Step (zwischen Team-Auswahl und „Match starten") ein „Modifier"-Block: Vorschläge basierend auf Game-Tag, optional „Random Modifier"-Button.

### 12. Match: MVP-Selection-UI fehlt
- **Problem:** Punktesystem im Code rechnet MVP-Bonus (+50), aber kein UI zum Auswählen.
- **Bitte ergänzen:** Im `MATCH_RESULT_PENDING`-Step eine MVP-Auswahl: Spieler-Liste mit Radio-Select, optional Voting-Mode (Match-Teilnehmer stimmen).

### 13. Streak-Visualisierung im Leaderboard
- **Problem:** v3 hat Streak-System mit Boni (3w +50, 5w +150). Mockup zeigt nur Punkte.
- **Bitte ergänzen:** Leaderboard-Eintrag um Streak-Indicator erweitern (z. B. „🔥 4" für aktuelle Streak, Glow-Effekt ab 3+).

### 14. Voting: Stimmen-Limit-Anzeige (MULTI-Modus)
- **Problem:** MULTI-Modus erlaubt config-basiertes Limit pro Spieler (`config.votingMaxVotesPerPlayer`). Mockup zeigt unbegrenzt.
- **Bitte ergänzen:** Wenn Limit gesetzt: „Du hast 3/5 Stimmen abgegeben"-Indicator im Browser-UI.

### 15. Pool-Management
- **Problem:** Voting-Pool wird vom Admin aus `games[]` zusammengestellt (`inActivePool`-Flag) — Mockup hat fixen Pool im Code.
- **Bitte ergänzen:** Im Admin Voting-Tab ein „Pool-Builder": Drag-In/Out aus `games[]`, Live-Preview (4–8 Limit), Save → triggert Voting-Start.

### 16. Browser-UI: Track-Indikator
- **Problem:** Player kann an `TOURNAMENT`, `SOULMASK` oder beiden teilnehmen — Status muss erkennbar sein.
- **Bitte ergänzen:** Header-Badge im Browser-UI: „🎮 Tournament aktiv" / „🌍 Soulmask aktiv" (parallel möglich).

### 17. Spin: Wheel-Variante während Spin austauschbar?
- **Problem:** Mockup zeigt 3 Varianten als nebeneinander stehende Mockups — unklar ob ein Setting wechselt oder alle drei live im UI vorhanden sind.
- **Bitte klären:** Soll der Show-Operator die Wheel-Variante pro Voting wählen können (z. B. „heute Fortune"), oder ist eine fixe Variante pro Event ausreichend?

### 18. Theme-Switcher
- **Problem:** 3 TV-Themes (Dark Arcade / Synthwave / Arctic) sind designt, aber kein Theme-Switcher im Admin gezeigt.
- **Bitte ergänzen:** Im System- oder Übersicht-Tab ein Theme-Dropdown (`uiPreferences.tvTheme`).

### 19. Simulation Mode UI
- **Problem:** Simulation Mode ist in v3 ein Admin-Feature (Test-Daten ohne echte Punktevergabe). Im Mockup nicht vorhanden.
- **Bitte ergänzen:** Im System-Tab ein Toggle „Simulation Mode" + visuelles Banner auf allen Screens (TV / Browser), wenn aktiv (z. B. „⚠ TEST-MODUS").

### 20. Schema-Version / System-Info-Block
- **Problem:** v3 trägt `schemaVersion: '3.0'`, hilfreich für Restore/Debug.
- **Bitte ergänzen:** Im System-Tab ein „System Info"-Block: Schema-Version, State-Version, Server-Uptime, Anzahl Online-Players.

---

## 📋 Zusammenfassung — Priorität für Design-Pass

**Hoch** (blocking für v3-Implementierung):
- #1 Player-Login
- #5 Track-Switch parallel
- #6 Soulmask-Admin-Tab
- #11 Match-Setup Modifier-Slot
- #12 MVP-Selection
- #15 Pool-Management

**Mittel** (Feature-Parität mit v3):
- #3 Modifier-Konfiguration
- #4 AI-Game-Analysis-Trigger
- #7 Last Game Winner
- #10 Tie-Break-Overlay
- #13 Streak-Visualisierung
- #16 Track-Indikator (Browser)

**Niedrig** (Nice-to-have / Show-Layer):
- #2 Reconnect-State
- #8 Event-Timeline
- #9 Soulmask ↔ Tournament Layouts
- #14 Stimmen-Limit-Anzeige
- #17 Wheel-Variante Switch
- #18 Theme-Switcher
- #19 Simulation Mode UI
- #20 System Info-Block

---

## 🎯 Nächster Schritt für Claude Design

1. README v3 lesen (besonders §4 Datenmodell, §5 State Machine, §6 Voting, §8 Modifier, §9 Soulmask, §10 UI-Architektur, §11 Self-Service, §16 Admin-Tabs)
2. Hoch-Prio-Items (#1, #5, #6, #11, #12, #15) im Mockup ergänzen
3. Mittel-Prio-Items in einem zweiten Pass
4. Bei Unklarheiten zur Logik: Rückfrage an Planning Agent (nicht selbst entscheiden)
