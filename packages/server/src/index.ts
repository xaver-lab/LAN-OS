// LAN OS — Express Bootstrap
// Startet Server auf PORT (default 3000), mounted alle Routen, served Client-Bundles.

import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { boot } from "./boot.js";
import { stateRouter } from "./routes/state.js";
import { authRouter } from "./routes/auth.js";
import { playerRouter } from "./routes/player.js";
import { adminRouter } from "./routes/admin.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env["PORT"] ?? 3000);

async function main() {
  // §5.5 Boot-Sequenz
  await boot();

  const app = express();

  // ── Middleware ────────────────────────────────────────────────────────────
  // LAN-Only: großzügiges CORS (alle Origins im LAN erlaubt)
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  // ── API-Routen ────────────────────────────────────────────────────────────
  app.use("/api/state", stateRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/player", playerRouter);
  app.use("/api/admin", adminRouter);

  // ── Client-Bundles (Vite Build-Output) ───────────────────────────────────
  // Liegt nach `pnpm -r build` unter packages/client/dist/
  // __dirname = packages/server/dist → ../../client/dist = packages/client/dist
  const clientDist = join(__dirname, "../../client/dist");

  // Statische Assets (JS, CSS, Fonts, …)
  app.use(express.static(clientDist));

  // SPA-Routen: jede dieser URLs bekommt ihre eigene HTML-Datei
  app.get("/tv", (_req, res) => {
    res.sendFile(join(clientDist, "tv.html"));
  });
  app.get("/play", (_req, res) => {
    res.sendFile(join(clientDist, "play.html"));
  });
  app.get("/admin", (_req, res) => {
    res.sendFile(join(clientDist, "admin.html"));
  });

  // Root → /play weiterleiten
  app.get("/", (_req, res) => {
    res.redirect("/play");
  });

  // 404 für unbekannte API-Routes
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  // Alle anderen Pfade → play.html (fallback SPA)
  app.get("*", (_req, res) => {
    res.sendFile(join(clientDist, "play.html"));
  });

  // ── Server starten ────────────────────────────────────────────────────────
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║       LAN OS — Server gestartet        ║`);
    console.log(`╠════════════════════════════════════════╣`);
    console.log(`║  http://localhost:${PORT}/admin           ║`);
    console.log(`║  http://localhost:${PORT}/play            ║`);
    console.log(`║  http://localhost:${PORT}/tv              ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
  });
}

main().catch((err) => {
  console.error("[BOOT FAIL]", err);
  process.exit(1);
});
