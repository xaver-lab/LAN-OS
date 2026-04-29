// §5.5 SYSTEM_BOOT — letzten State laden, Schema-Check, Crash-Recovery.

import {
  createEmptyState,
  SCHEMA_VERSION,
  type SystemState,
} from "@lan-os/shared";
import {
  readSimulationState,
  readState,
} from "./persistence.js";
import { initContainer, makeFreshSimState } from "./state.js";

export async function boot(): Promise<{
  real: SystemState;
  sim: SystemState;
  recoveryNote: string | null;
}> {
  const fromDisk = await readState();
  let real: SystemState;
  let recoveryNote: string | null = null;

  if (!fromDisk) {
    real = createEmptyState();
  } else if (fromDisk.schemaVersion !== SCHEMA_VERSION) {
    // Schema-Mismatch — README sagt Konsistenz-Check, MVP: Hinweis + leerer State.
    real = createEmptyState();
    recoveryNote = `Schema-Mismatch (war ${fromDisk.schemaVersion}, erwartet ${SCHEMA_VERSION}). Neuer State angelegt.`;
  } else {
    real = fromDisk;
    // Crash-Recovery: war MATCH_ACTIVE → zurück auf MATCH_SETUP.
    if (real.tournamentState === "MATCH_ACTIVE") {
      real = { ...real, tournamentState: "MATCH_SETUP" };
      recoveryNote =
        "Crash während laufendem Match erkannt — State auf MATCH_SETUP zurückgesetzt.";
    }
  }

  const simFromDisk = await readSimulationState();
  const sim = simFromDisk ?? makeFreshSimState();

  initContainer(real, sim);
  return { real, sim, recoveryNote };
}
