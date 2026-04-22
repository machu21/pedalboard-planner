// src/store/usePedalStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ActivePedal, PedalData, BoardData } from '@/types/pedal';

interface PedalStore {
  activeBoard: ActivePedal[];
  selectedBoard: BoardData | null;
  addPedal: (pedal: PedalData, x: number, y: number) => void;
  movePedal: (instanceId: string, x: number, y: number) => void;
  removePedal: (instanceId: string) => void;
  rotatePedal: (instanceId: string) => void; // NEW
  setBoard: (board: BoardData) => void;
}

export const PIXELS_PER_INCH = 25;

export const usePedalStore = create<PedalStore>()(
  persist(
    (set) => ({
      activeBoard: [],
      selectedBoard: null,
      
      setBoard: (board) => set({ selectedBoard: board }),
      
      addPedal: (pedal, x, y) => set((state) => ({
        activeBoard: [
          ...state.activeBoard, 
          { 
            ...pedal, 
            instanceId: `${pedal.name}-${Date.now()}`, 
            x, 
            y,
            rotation: 0, // INITIALIZE
            width: pedal.width * PIXELS_PER_INCH,
            height: pedal.height * PIXELS_PER_INCH
          }
        ]
      })),

      movePedal: (instanceId, x, y) => set((state) => ({
        activeBoard: state.activeBoard.map((p) => 
          p.instanceId === instanceId ? { ...p, x, y } : p
        )
      })),

      // NEW ROTATION LOGIC (Increments by 90 degrees)
      rotatePedal: (instanceId) => set((state) => ({
        activeBoard: state.activeBoard.map((p) => 
          p.instanceId === instanceId ? { ...p, rotation: (p.rotation + 90) % 360 } : p
        )
      })),

      removePedal: (instanceId) => set((state) => ({
        activeBoard: state.activeBoard.filter((p) => p.instanceId !== instanceId)
      })),
    }),
    {
      name: 'pedalboard-cache', 
    }
  )
);