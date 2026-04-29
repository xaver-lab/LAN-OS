// §13 Persistence — JSON-Files mit atomic writes (write-to-tmp + rename).

import { promises as fs } from "node:fs";
import path from "node:path";
import type { CheckpointMeta, SystemState } from "@lan-os/shared";

const DATA_DIR = path.resolve(
  process.env["LAN_OS_DATA_DIR"] ?? "./data",
);
const STATE_FILE = path.join(DATA_DIR, "state.json");
const SIM_STATE_FILE = path.join(DATA_DIR, "simulation.json");
const CHECKPOINT_DIR = path.join(DATA_DIR, "checkpoints");

export async function ensureDirs(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
}

async function atomicWriteJson(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

export async function writeState(state: SystemState): Promise<void> {
  await ensureDirs();
  await atomicWriteJson(STATE_FILE, state);
}

export async function readState(): Promise<SystemState | null> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(raw) as SystemState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeSimulationState(state: SystemState): Promise<void> {
  await ensureDirs();
  await atomicWriteJson(SIM_STATE_FILE, state);
}

export async function readSimulationState(): Promise<SystemState | null> {
  try {
    const raw = await fs.readFile(SIM_STATE_FILE, "utf-8");
    return JSON.parse(raw) as SystemState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export interface WriteCheckpointArgs {
  label: string;
  trigger: "auto" | "manual";
  state: SystemState;
}

export async function writeCheckpoint(
  args: WriteCheckpointArgs,
): Promise<CheckpointMeta> {
  await ensureDirs();
  const now = Date.now();
  const safeLabel = args.label.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const filename = `checkpoint_${safeLabel}_${Math.floor(now / 1000)}.json`;
  const file = path.join(CHECKPOINT_DIR, filename);
  await atomicWriteJson(file, args.state);
  return {
    label: args.label,
    filename,
    createdAt: now,
    trigger: args.trigger,
    stateVersion: args.state.version,
  };
}

export async function readCheckpoint(
  filename: string,
): Promise<SystemState | null> {
  try {
    const raw = await fs.readFile(path.join(CHECKPOINT_DIR, filename), "utf-8");
    return JSON.parse(raw) as SystemState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function listCheckpointFiles(): Promise<string[]> {
  await ensureDirs();
  const files = await fs.readdir(CHECKPOINT_DIR);
  return files.filter((f) => f.startsWith("checkpoint_") && f.endsWith(".json"));
}

export async function deleteCheckpoint(filename: string): Promise<void> {
  await fs.unlink(path.join(CHECKPOINT_DIR, filename)).catch(() => {});
}

export const PATHS = {
  DATA_DIR,
  STATE_FILE,
  CHECKPOINT_DIR,
};
