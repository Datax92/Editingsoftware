import { create } from 'zustand';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  set: (newPresent: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// Generic history factory or creator for our annotations
export const createHistoryStore = <T>(initialPresent: T) => {
  return create<HistoryState<T>>((set, get) => ({
    past: [],
    present: initialPresent,
    future: [],
    set: (newPresent: T) => {
      const { present, past } = get();
      if (JSON.stringify(present) === JSON.stringify(newPresent)) return; // Skip duplicate states
      set({
        past: [...past, present],
        present: newPresent,
        future: [], // Clear future on new action
      });
    },
    undo: () => {
      const { past, present, future } = get();
      if (past.length === 0) return null;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      set({
        past: newPast,
        present: previous,
        future: [present, ...future],
      });
      return previous;
    },
    redo: () => {
      const { past, present, future } = get();
      if (future.length === 0) return null;

      const next = future[0];
      const newFuture = future.slice(1);

      set({
        past: [...past, present],
        present: next,
        future: newFuture,
      });
      return next;
    },
    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  }));
};