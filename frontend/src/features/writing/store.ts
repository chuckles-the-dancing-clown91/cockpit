/**
 * Writing state management with Zustand
 * Persists active writing ID across navigation
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WritingStore {
  activeWritingId: number | null;
  setActiveWriting: (id: number) => void;
  clearActiveWriting: () => void;
}

export const useWritingStore = create<WritingStore>()(
  persist(
    (set) => ({
      activeWritingId: null,
      setActiveWriting: (id: number) => set({ activeWritingId: id }),
      clearActiveWriting: () => set({ activeWritingId: null }),
    }),
    {
      name: 'writing-storage',
    }
  )
);
