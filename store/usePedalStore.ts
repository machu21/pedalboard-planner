import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivePedal, BoardData, PedalData, PriceState, Rotation } from '@/types/pedal';
import { clampToBoard, pedalKey, type Units } from '@/lib/catalog';

interface Snapshot {
  pedals: ActivePedal[];
  board: BoardData | null;
}

interface PedalStore extends Snapshot {
  selectedId: string | null;
  units: Units;
  prices: Record<string, PriceState>;
  past: Snapshot[];
  future: Snapshot[];
  /** Used to merge rapid repeated edits (e.g. arrow-key nudges) into one undo step. */
  lastCommit: { tag: string; at: number } | null;

  setBoard: (board: BoardData) => void;
  addPedal: (pedal: PedalData, x: number, y: number) => string;
  movePedal: (id: string, x: number, y: number) => void;
  nudgePedal: (id: string, dx: number, dy: number) => void;
  rotatePedal: (id: string, direction?: 1 | -1) => void;
  duplicatePedal: (id: string) => string | null;
  bringToFront: (id: string) => void;
  removePedal: (id: string) => void;
  clearBoard: () => void;
  select: (id: string | null) => void;
  setUnits: (units: Units) => void;
  setPrice: (key: string, price: PriceState) => void;
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 100;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const usePedalStore = create<PedalStore>()(
  persist(
    (set, get) => {
      /** Apply a change to pedals/board and record it in the undo history. */
      const commit = (next: Partial<Snapshot> & { selectedId?: string | null }, tag?: string) => {
        const s = get();
        const now = Date.now();
        const merge = tag && s.lastCommit?.tag === tag && now - s.lastCommit.at < 800;
        set({
          ...next,
          past: merge ? s.past : [...s.past, { pedals: s.pedals, board: s.board }].slice(-HISTORY_LIMIT),
          future: [],
          lastCommit: tag ? { tag, at: now } : null,
        });
      };

      const boardSize = () => {
        const b = get().board;
        return b ? { w: b.width, h: b.height } : null;
      };

      return {
        pedals: [],
        board: null,
        selectedId: null,
        units: 'in',
        prices: {},
        past: [],
        future: [],
        lastCommit: null,

        setBoard: (board) => {
          // Keep pedals on the new board.
          const pedals = get().pedals.map((p) => ({ ...p, ...clampToBoard(p, p.x, p.y, board.width, board.height) }));
          commit({ board, pedals });
        },

        addPedal: (pedal, x, y) => {
          const id = newId();
          const placed: ActivePedal = {
            brand: pedal.brand,
            name: pedal.name,
            width: pedal.width,
            height: pedal.height,
            image: pedal.image,
            instanceId: id,
            x,
            y,
            rotation: 0,
          };
          commit({ pedals: [...get().pedals, placed], selectedId: id });
          return id;
        },

        movePedal: (id, x, y) => {
          const size = boardSize();
          commit({
            pedals: get().pedals.map((p) =>
              p.instanceId === id ? { ...p, ...(size ? clampToBoard(p, x, y, size.w, size.h) : { x, y }) } : p,
            ),
          });
        },

        nudgePedal: (id, dx, dy) => {
          const size = boardSize();
          commit(
            {
              pedals: get().pedals.map((p) =>
                p.instanceId === id
                  ? { ...p, ...(size ? clampToBoard(p, p.x + dx, p.y + dy, size.w, size.h) : { x: p.x + dx, y: p.y + dy }) }
                  : p,
              ),
            },
            `nudge:${id}`,
          );
        },

        rotatePedal: (id, direction = 1) => {
          const size = boardSize();
          commit({
            pedals: get().pedals.map((p) => {
              if (p.instanceId !== id) return p;
              const rotation = (((p.rotation + direction * 90) % 360) + 360) % 360 as Rotation;
              const next = { ...p, rotation };
              return size ? { ...next, ...clampToBoard(next, p.x, p.y, size.w, size.h) } : next;
            }),
          });
        },

        duplicatePedal: (id) => {
          const src = get().pedals.find((p) => p.instanceId === id);
          if (!src) return null;
          const size = boardSize();
          const nid = newId();
          const offset = 0.5;
          const pos = size
            ? clampToBoard(src, src.x + offset, src.y + offset, size.w, size.h)
            : { x: src.x + offset, y: src.y + offset };
          commit({ pedals: [...get().pedals, { ...src, ...pos, instanceId: nid }], selectedId: nid });
          return nid;
        },

        bringToFront: (id) => {
          const pedals = get().pedals;
          const target = pedals.find((p) => p.instanceId === id);
          if (!target || pedals[pedals.length - 1] === target) return;
          commit({ pedals: [...pedals.filter((p) => p !== target), target] });
        },

        removePedal: (id) => {
          const s = get();
          commit({
            pedals: s.pedals.filter((p) => p.instanceId !== id),
            selectedId: s.selectedId === id ? null : s.selectedId,
          });
        },

        clearBoard: () => commit({ pedals: [], selectedId: null }),

        select: (id) => set({ selectedId: id }),
        setUnits: (units) => set({ units }),
        setPrice: (key, price) => set((s) => ({ prices: { ...s.prices, [key]: price } })),

        undo: () => {
          const s = get();
          const prev = s.past[s.past.length - 1];
          if (!prev) return;
          set({
            ...prev,
            past: s.past.slice(0, -1),
            future: [{ pedals: s.pedals, board: s.board }, ...s.future],
            selectedId: prev.pedals.some((p) => p.instanceId === s.selectedId) ? s.selectedId : null,
            lastCommit: null,
          });
        },

        redo: () => {
          const s = get();
          const next = s.future[0];
          if (!next) return;
          set({
            ...next,
            past: [...s.past, { pedals: s.pedals, board: s.board }],
            future: s.future.slice(1),
            selectedId: next.pedals.some((p) => p.instanceId === s.selectedId) ? s.selectedId : null,
            lastCommit: null,
          });
        },
      };
    },
    {
      name: 'pedalboard-cache',
      version: 1,
      partialize: (s) => ({
        pedals: s.pedals,
        board: s.board,
        units: s.units,
        // Only keep resolved prices; in-flight lookups restart on reload.
        prices: Object.fromEntries(Object.entries(s.prices).filter(([, v]) => v.status === 'ready')),
      }),
      migrate: (persisted, version) => {
        if (version === 0 && persisted && typeof persisted === 'object') {
          // v0 stored pixel sizes/positions at 25px per inch under different keys.
          const old = persisted as {
            activeBoard?: Array<Record<string, unknown>>;
            selectedBoard?: Record<string, unknown> | null;
          };
          const PPI = 25;
          const pedals: ActivePedal[] = (old.activeBoard ?? []).map((p) => ({
            brand: String(p.brand ?? ''),
            name: String(p.name ?? ''),
            image: String(p.image ?? ''),
            width: Number(p.width) / PPI || 3,
            height: Number(p.height) / PPI || 5,
            x: Number(p.x) / PPI || 0,
            y: Number(p.y) / PPI || 0,
            rotation: ((Number(p.rotation) || 0) % 360) as Rotation,
            instanceId: newId(),
          }));
          const b = old.selectedBoard;
          const board: BoardData | null = b
            ? {
                brand: String(b.brand ?? ''),
                name: String(b.name ?? ''),
                width: Number(b.width) || 18,
                height: Number(b.height) || 12,
                image: String(b.image ?? ''),
              }
            : null;
          return { pedals, board, units: 'in', prices: {} };
        }
        return persisted as PedalStore;
      },
    },
  ),
);

export { pedalKey };
