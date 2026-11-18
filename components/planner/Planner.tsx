'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core';
import { getEventCoordinates } from '@dnd-kit/utilities';
import type { BoardData, PedalData } from '@/types/pedal';
import { usePedalStore } from '@/store/usePedalStore';
import { toast, useUiStore } from '@/lib/ui-store';
import { BASE_PPI, clampToBoard, findFreeSpot, pedalImageUrl } from '@/lib/catalog';
import { usePriceLookup } from '@/lib/usePriceLookup';
import { SafeImage } from '@/components/ui';
import Header from './Header';
import Library from './Library';
import Workspace from './Workspace';
import RigPanel from './RigPanel';
import BoardPicker from './BoardPicker';
import ShortcutsDialog from './ShortcutsDialog';
import Toaster from './Toaster';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +z.toFixed(2)));

/** Centre the library drag preview on the cursor. */
const centerOnCursor: Modifier = ({ activatorEvent, draggingNodeRect, overlayNodeRect, transform, active }) => {
  if (active?.data.current?.kind !== 'library' || !activatorEvent || !draggingNodeRect || !overlayNodeRect) return transform;
  const coords = getEventCoordinates(activatorEvent);
  if (!coords) return transform;
  return {
    ...transform,
    x: transform.x + coords.x - draggingNodeRect.left - overlayNodeRect.width / 2,
    y: transform.y + coords.y - draggingNodeRect.top - overlayNodeRect.height / 2,
  };
};

const subscribeNoop = () => () => {};

type Drawer = 'library' | 'rig' | null;

export default function Planner({ pedals: catalog, boards }: { pedals: PedalData[]; boards: BoardData[] }) {
  // Persisted state lives in localStorage, so render only on the client.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const board = usePedalStore((s) => s.board);
  const pedals = usePedalStore((s) => s.pedals);
  const addPedal = usePedalStore((s) => s.addPedal);
  const movePedal = usePedalStore((s) => s.movePedal);

  const [zoom, setZoomState] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [draggingPedal, setDraggingPedal] = useState<PedalData | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const scale = BASE_PPI * zoom;
  usePriceLookup(pedals);

  const setZoom = useCallback((z: number | ((z: number) => number)) => {
    setAutoFit(false);
    setZoomState((prev) => clampZoom(typeof z === 'function' ? z(prev) : z));
  }, []);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || !board) return;
    // Matches the workspace padding plus room for the dimension labels.
    const pad = vp.clientWidth < 640 ? 64 : 136;
    const z = Math.min((vp.clientWidth - pad) / (board.width * BASE_PPI), (vp.clientHeight - pad) / (board.height * BASE_PPI));
    setZoomState(clampZoom(Math.min(z, 2.5)));
    setAutoFit(true);
  }, [board]);

  // Keep the board fitted to the viewport until the user zooms manually.
  useEffect(() => {
    if (!autoFit || !mounted) return;
    fit();
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [autoFit, fit, mounted]);

  // Re-fit whenever a different board is chosen.
  const boardKey = board ? `${board.brand}|${board.name}|${board.width}|${board.height}` : '';
  const lastBoardKey = useRef(boardKey);
  useEffect(() => {
    if (lastBoardKey.current !== boardKey) {
      lastBoardKey.current = boardKey;
      fit();
    }
  }, [boardKey, fit]);

  const handleAdd = useCallback(
    (pedal: PedalData) => {
      const s = usePedalStore.getState();
      if (!s.board) {
        toast({ message: 'Pick a pedalboard first, then add pedals to it.', tone: 'warning' });
        setPickerOpen(true);
        return;
      }
      const spot = findFreeSpot(pedal, s.pedals, s.board.width, s.board.height);
      addPedal(pedal, spot.x, spot.y);
      setDrawer(null);
    },
    [addPedal],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (data?.kind === 'library') setDraggingPedal(data.pedal as PedalData);
    else if (data?.kind === 'placed') usePedalStore.getState().select(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingPedal(null);
    const data = e.active.data.current;
    const s = usePedalStore.getState();

    if (data?.kind === 'library') {
      const pedal = data.pedal as PedalData;
      if (!s.board) {
        toast({ message: 'Pick a pedalboard first, then add pedals to it.', tone: 'warning' });
        setPickerOpen(true);
        return;
      }
      if (e.over?.id !== 'board' || !boardRef.current) return;
      const start = getEventCoordinates(e.activatorEvent);
      if (!start) return;
      const rect = boardRef.current.getBoundingClientRect();
      const cx = (start.x + e.delta.x - rect.left) / scale;
      const cy = (start.y + e.delta.y - rect.top) / scale;
      const pos = clampToBoard({ ...pedal, rotation: 0 }, cx - pedal.width / 2, cy - pedal.height / 2, s.board.width, s.board.height);
      addPedal(pedal, pos.x, pos.y);
      return;
    }

    if (data?.kind === 'placed') {
      const p = s.pedals.find((x) => x.instanceId === e.active.id);
      if (!p || (e.delta.x === 0 && e.delta.y === 0)) return;
      movePedal(p.instanceId, p.x + e.delta.x / scale, p.y + e.delta.y / scale);
    }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return;
      const s = usePedalStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const id = s.selectedId;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd' && id) {
        e.preventDefault();
        s.duplicatePedal(id);
        return;
      }
      if (mod || e.altKey) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          setDrawer('library');
          requestAnimationFrame(() => searchRef.current?.focus());
          return;
        case '?':
          setShortcutsOpen(true);
          return;
        case '=':
        case '+':
          setZoom((z) => z * 1.2);
          return;
        case '-':
        case '_':
          setZoom((z) => z / 1.2);
          return;
        case '0':
          fit();
          return;
        case 'Escape':
          s.select(null);
          setDrawer(null);
          return;
      }

      if (!id) return;
      const pedal = s.pedals.find((p) => p.instanceId === id);
      if (!pedal) return;
      const step = e.shiftKey ? 1 : 0.125;
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          s.removePedal(id);
          toast({ message: `Removed ${pedal.name}`, action: { label: 'Undo', run: () => usePedalStore.getState().undo() } });
          break;
        case 'r':
        case 'R':
          s.rotatePedal(id, e.shiftKey ? -1 : 1);
          break;
        case ']':
          s.bringToFront(id);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          s.nudgePedal(id, -step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          s.nudgePedal(id, step, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          s.nudgePedal(id, 0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          s.nudgePedal(id, 0, step);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fit, setZoom]);

  // Clear hover highlight if the hovered pedal disappears.
  useEffect(() => {
    const { hoveredId, setHovered } = useUiStore.getState();
    if (hoveredId && !pedals.some((p) => p.instanceId === hoveredId)) setHovered(null);
  }, [pedals]);

  if (!mounted) return <ShellSkeleton />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingPedal(null)}
    >
      <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
        <Header
          onOpenPicker={() => setPickerOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onToggleLibrary={() => setDrawer((d) => (d === 'library' ? null : 'library'))}
          onToggleRig={() => setDrawer((d) => (d === 'rig' ? null : 'rig'))}
        />

        <div className="relative flex min-h-0 flex-1">
          {drawer && (
            <button
              aria-label="Close panel"
              className="fixed inset-0 z-30 animate-fade-in bg-black/40 backdrop-blur-[1px] xl:hidden"
              onClick={() => setDrawer(null)}
            />
          )}

          <Library
            catalog={catalog}
            onAdd={handleAdd}
            searchRef={searchRef}
            open={drawer === 'library'}
            onClose={() => setDrawer(null)}
          />

          <Workspace
            viewportRef={viewportRef}
            boardRef={boardRef}
            scale={scale}
            zoom={zoom}
            setZoom={setZoom}
            onFit={fit}
            onOpenPicker={() => setPickerOpen(true)}
            onOpenLibrary={() => {
              setDrawer('library');
              requestAnimationFrame(() => searchRef.current?.focus());
            }}
          />

          <RigPanel open={drawer === 'rig'} onClose={() => setDrawer(null)} onOpenPicker={() => setPickerOpen(true)} />
        </div>
      </div>

      <DragOverlay dropAnimation={null} modifiers={[centerOnCursor]} zIndex={70}>
        {draggingPedal ? (
          <div
            className="pointer-events-none opacity-90 drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
            style={{ width: draggingPedal.width * scale, height: draggingPedal.height * scale }}
          >
            <SafeImage
              src={pedalImageUrl(draggingPedal.image)}
              alt=""
              eager
              className="size-full object-contain"
              fallback={<div className="size-full rounded-md border-2 border-dashed border-accent bg-accent-soft" />}
            />
          </div>
        ) : null}
      </DragOverlay>

      <BoardPicker boards={boards} open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Toaster />
    </DndContext>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-bg">
      <div className="h-14 border-b border-line bg-panel" />
      <div className="flex flex-1">
        <div className="hidden w-80 border-r border-line bg-panel lg:block" />
        <div className="canvas-grid flex-1" />
        <div className="hidden w-80 border-l border-line bg-panel xl:block" />
      </div>
    </div>
  );
}
