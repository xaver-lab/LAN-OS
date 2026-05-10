// §14.1 Soulmask-spezifischer Hook — Live-Updates für Tasks, Goals, Morale.
// Verhindert UI-Flicker durch Change-Detection beim Polling.

import { useMemo } from "react";
import type { SystemState, SoulmaskTask, GlobalGoal } from "@lan-os/shared";

export interface SoulmaskPlayerState {
  currentRole: string | undefined;
  myTasks: SoulmaskTask[];
  activeTasks: SoulmaskTask[];
  doneTasks: SoulmaskTask[];
  morale: number;
  goals: GlobalGoal[];
}

/**
 * Derive player-specific Soulmask state from SystemState.
 * Memoized to prevent unnecessary re-renders on unchanged data.
 */
export function useSoulmaskState(
  state: SystemState | null,
  playerId: string
): SoulmaskPlayerState {
  return useMemo(() => {
    if (!state) {
      return {
        currentRole: undefined,
        myTasks: [],
        activeTasks: [],
        doneTasks: [],
        morale: 0,
        goals: [],
      };
    }

    const sm = state.soulmaskData;

    // Aktuelle Rolle
    const currentRole = sm.activeRoles[playerId];

    // Alle Tasks für diesen Player
    const myTasks = sm.tasks.filter((t) => t.playerId === playerId);

    // Tasks für aktuelle Rolle
    const myRoleTasks = myTasks.filter((t) => t.role === currentRole);

    // Sortierung: Pending first
    const activeTasks = myRoleTasks.filter((t) => !t.done);
    const doneTasks = myRoleTasks.filter((t) => t.done);

    // Morale: aus allen Team-Tasks berechnet
    const allTasks = sm.tasks;
    const morale =
      allTasks.length === 0
        ? 100
        : Math.round(
            (allTasks.filter((t) => t.done).length / allTasks.length) * 100
          );

    return {
      currentRole,
      myTasks,
      activeTasks,
      doneTasks,
      morale,
      goals: sm.globalGoals,
    };
  }, [state, playerId]);
}
