// §14.2 Soulmask Task Manager — Toggle Logic mit Optimistic Updates.
// Ermöglicht schnelle UI-Feedback, bevor Server antwortet.

import { useState, useCallback } from "react";
import { toggleTask, setSoulmaskRole } from "./client.js";

export interface TaskManagerState {
  busyTaskId: string | null;
  busyRoleChange: boolean;
  error: string | null;
}

export interface TaskManagerActions {
  toggleTaskAsync: (taskId: string, done: boolean, onOptimistic?: () => void) => Promise<void>;
  changeRoleAsync: (roleId: string, onOptimistic?: () => void) => Promise<void>;
  clearError: () => void;
}

/**
 * Manage Soulmask task toggling with optional optimistic updates.
 * Callback `onOptimistic` fires immediately; on error, caller is responsible for reverting UI.
 */
export function useSoulmaskTaskManager(): [TaskManagerState, TaskManagerActions] {
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [busyRoleChange, setBusyRoleChange] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTaskAsync = useCallback(
    async (taskId: string, done: boolean, onOptimistic?: () => void) => {
      setBusyTaskId(taskId);
      setError(null);
      try {
        if (onOptimistic) onOptimistic();
        await toggleTask(taskId, done);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setBusyTaskId(null);
      }
    },
    []
  );

  const changeRoleAsync = useCallback(
    async (roleId: string, onOptimistic?: () => void) => {
      setBusyRoleChange(true);
      setError(null);
      try {
        if (onOptimistic) onOptimistic();
        await setSoulmaskRole(roleId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setBusyRoleChange(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return [
    { busyTaskId, busyRoleChange, error },
    { toggleTaskAsync, changeRoleAsync, clearError },
  ];
}
