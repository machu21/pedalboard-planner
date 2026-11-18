'use client';

import { useEffect, useMemo, type RefObject } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ActivePedal } from '@/types/pedal';
import { usePedalStore } from '@/store/usePedalStore';
import { toast, useUiStore } from '@/lib/ui-store';
import { boardImageUrl, findProblems, footprint, formatLength, formatSize, pedalImageUrl } from '@/lib/catalog';
import { IconButton, Kbd, SafeImage } from '@/components/ui';
import {
  AlertIcon,
  BoardIcon,
  CopyIcon,
  FitIcon,
  LayersIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SearchIcon,
  TrashIcon,
} from '@/components/icons';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export default function Workspace({
  viewportRef,
  boardRef,
  scale,
  zoom,
  setZoom,
  onFit,
  onOpenPicker,
  onOpenLibrary,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  boardRef: RefObject<HTMLDivElement | null>;
  scale: number;
  zoom: number;
  setZoom: (z: number | ((z: number) => number)) => void;
  onFit: () => void;
  onOpenPicker: () => void;
  onOpenLibrary: () => void;
}) {
  const board = usePedalStore((s) => s.board);
  const pedals = usePedalStore((s) => s.pedals);
  const selectedId = usePedalStore((s) => s.selectedId);
  const select = usePedalStore((s) => s.select);
  const units = usePedalStore((s) => s.units);

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'board' });

  const problems = useMemo(
    () => (board ? findProblems(pedals, board.width, board.height) : { overlapping: new Set<string>(), outside: new Set<string>() }),
    [pedals, board],
  );

  // Ctrl/⌘ + wheel (and trackpad pinch) zooms the board.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => z * Math.exp(-e.deltaY * 0.0025));
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [viewportRef, setZoom]);

  const selected = pedals.find((p) => p.instanceId === selectedId) ?? null;
  const problemCount = new Set([...problems.overlapping, ...problems.outside]).size;

  return (
    <section aria-label="Board workspace" className="relative min-w-0 flex-1">
      <div
        ref={viewportRef}
        className="canvas-grid absolute inset-0 overflow-auto"
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest('[data-pedal]')) select(null);
        }}
      >
        {board ? (
          <div className="flex min-h-full w-max min-w-full items-center justify-center p-6 pt-8 pl-8 sm:p-14">
            <div className="relative" style={{ width: board.width * scale, height: board.height * scale }}>
              {/* Dimension labels */}
              <div className="pointer-events-none absolute inset-x-0 bottom-full mb-2 flex items-center gap-2 font-mono text-[10.5px] text-fg-subtle select-none">
                <span className="h-px flex-1 bg-fg-subtle/30" />
                {formatLength(board.width, units)}
                <span className="h-px flex-1 bg-fg-subtle/30" />
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-full mr-2 flex flex-col items-center gap-2 font-mono text-[10.5px] text-fg-subtle select-none">
                <span className="w-px flex-1 bg-fg-subtle/30" />
                <span className="[writing-mode:vertical-rl] rotate-180">{formatLength(board.height, units)}</span>
                <span className="w-px flex-1 bg-fg-subtle/30" />
              </div>

              <div
                ref={(el) => {
                  setDropRef(el);
                  boardRef.current = el;
                }}
                className={`relative size-full rounded-[10px] shadow-[var(--shadow-float)] transition-[box-shadow] ${
                  isOver ? 'ring-4 ring-accent/60' : 'ring-1 ring-black/20'
                }`}
              >
                <BoardSurface image={board.custom ? '' : board.image} />

                {pedals.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                    <div className="animate-fade-in rounded-xl border border-dashed border-white/25 bg-black/45 px-4 py-3 text-center text-white backdrop-blur-sm">
                      <p className="text-[13px] font-semibold">Your board is empty</p>
                      <p className="mt-0.5 text-[11.5px] text-white/70">Drag pedals here, or click one in the library</p>
                    </div>
                  </div>
                )}

                {pedals.map((p, i) => (
                  <PlacedPedal
                    key={p.instanceId}
                    pedal={p}
                    index={i}
                    scale={scale}
                    selected={p.instanceId === selectedId}
                    problem={problems.overlapping.has(p.instanceId) || problems.outside.has(p.instanceId)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <NoBoard onOpenPicker={onOpenPicker} />
        )}
      </div>

      {/* Status chip */}
      {board && pedals.length > 0 && (
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2">
          {problemCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                const first = pedals.find((p) => problems.overlapping.has(p.instanceId) || problems.outside.has(p.instanceId));
                if (first) select(first.instanceId);
              }}
              className="pointer-events-auto flex animate-pop-in items-center gap-1.5 rounded-full border border-danger/30 bg-panel/90 px-3 py-1.5 text-[12px] font-medium text-danger shadow-[var(--shadow-pop)] backdrop-blur"
            >
              <AlertIcon size={14} />
              {problems.overlapping.size > 0 && `${problems.overlapping.size} overlapping`}
              {problems.overlapping.size > 0 && problems.outside.size > 0 && ' · '}
              {problems.outside.size > 0 && `${problems.outside.size} off the board`}
            </button>
          ) : (
            <span className="flex animate-pop-in items-center gap-1.5 rounded-full border border-line bg-panel/90 px-3 py-1.5 text-[12px] font-medium text-fg-muted shadow-[var(--shadow-pop)] backdrop-blur">
              <span className="size-1.5 rounded-full bg-success" />
              Everything fits
            </span>
          )}
        </div>
      )}

      {/* Mobile: quick add */}
      {board && (
        <button
          type="button"
          onClick={onOpenLibrary}
          className="absolute bottom-4 left-4 flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-[13px] font-semibold text-on-accent shadow-[var(--shadow-float)] transition hover:brightness-110 active:scale-[0.98] lg:hidden"
        >
          <PlusIcon size={16} strokeWidth={2.25} />
          Add pedal
        </button>
      )}

      {/* Zoom controls */}
      {board && (
        <div className="absolute right-3 bottom-4 flex items-center gap-0.5 rounded-xl border border-line bg-panel/95 p-1 shadow-[var(--shadow-pop)] backdrop-blur">
          <IconButton label="Zoom out" shortcut="−" tipPos="top" size="sm" onClick={() => setZoom((z) => z / 1.2)}>
            <MinusIcon size={15} />
          </IconButton>
          <button
            type="button"
            onClick={() => setZoom(1)}
            data-tip="Reset to 100%"
            data-tip-pos="top"
            className="h-7 w-12 rounded-md font-mono text-[11px] text-fg-muted tabular-nums transition-colors hover:bg-panel-3 hover:text-fg"
          >
            {Math.round(zoom * 100)}%
          </button>
          <IconButton label="Zoom in" shortcut="+" tipPos="top" size="sm" onClick={() => setZoom((z) => z * 1.2)}>
            <PlusIcon size={15} />
          </IconButton>
          <span className="mx-0.5 h-4 w-px bg-line" />
          <IconButton label="Fit to screen" shortcut="0" tipPos="top" size="sm" onClick={onFit}>
            <FitIcon size={15} />
          </IconButton>
        </div>
      )}

      {selected && <SelectionBar pedal={selected} />}
    </section>
  );
}

function BoardSurface({ image }: { image: string }) {
  const fallback = <div className="board-surface absolute inset-0 rounded-[10px]" />;
  if (!image) return fallback;
  return (
    <SafeImage
      src={boardImageUrl(image)}
      alt=""
      eager
      className="pointer-events-none absolute inset-0 size-full rounded-[10px] object-fill select-none"
      fallback={fallback}
    />
  );
}

function PlacedPedal({
  pedal,
  index,
  scale,
  selected,
  problem,
}: {
  pedal: ActivePedal;
  index: number;
  scale: number;
  selected: boolean;
  problem: boolean;
}) {
  const select = usePedalStore((s) => s.select);
  const rotatePedal = usePedalStore((s) => s.rotatePedal);
  const hovered = useUiStore((s) => s.hoveredId === pedal.instanceId);
  const setHovered = useUiStore((s) => s.setHovered);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pedal.instanceId,
    data: { kind: 'placed' },
  });

  const translate = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) ` : '';

  return (
    <div
      ref={setNodeRef}
      data-pedal
      {...attributes}
      {...listeners}
      aria-label={`${pedal.brand} ${pedal.name}`}
      aria-pressed={selected}
      onPointerDown={(e) => {
        select(pedal.instanceId);
        listeners?.onPointerDown?.(e);
      }}
      onFocus={() => select(pedal.instanceId)}
      onDoubleClick={() => rotatePedal(pedal.instanceId)}
      onPointerEnter={() => setHovered(pedal.instanceId)}
      onPointerLeave={() => setHovered(null)}
      className={`absolute touch-none outline-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: pedal.x * scale,
        top: pedal.y * scale,
        width: pedal.width * scale,
        height: pedal.height * scale,
        transform: `${translate}rotate(${pedal.rotation}deg)`,
        zIndex: isDragging ? 1000 : selected ? 500 : index + 1,
      }}
    >
      <div className="size-full animate-pop-in">
        <SafeImage
          src={pedalImageUrl(pedal.image)}
          alt=""
          eager
          className={`pointer-events-none size-full object-contain transition-[filter] ${
            isDragging
              ? 'drop-shadow-[0_0_18px_rgba(0,0,0,0.6)]'
              : 'drop-shadow-[0_0_5px_rgba(0,0,0,0.55)]'
          }`}
          fallback={
            <div className="flex size-full flex-col items-center justify-center rounded-md border border-white/20 bg-[#2c2c30] p-1 text-center text-white">
              <span className="line-clamp-1 font-mono text-[9px] text-white/60">{pedal.brand}</span>
              <span className="line-clamp-2 text-[10px] leading-tight font-semibold">{pedal.name}</span>
            </div>
          }
        />
      </div>

      {/* State rings */}
      {(selected || problem || hovered) && (
        <div
          className={`pointer-events-none absolute -inset-1 rounded-lg ${
            problem
              ? 'border-2 border-dashed border-danger bg-danger/10'
              : selected
                ? 'border-2 border-accent'
                : 'border-2 border-accent/50'
          } ${selected && problem ? 'outline-2 outline-offset-2 outline-accent' : ''}`}
        />
      )}
    </div>
  );
}

function SelectionBar({ pedal }: { pedal: ActivePedal }) {
  const units = usePedalStore((s) => s.units);
  const rotate = usePedalStore((s) => s.rotatePedal);
  const duplicate = usePedalStore((s) => s.duplicatePedal);
  const front = usePedalStore((s) => s.bringToFront);
  const remove = usePedalStore((s) => s.removePedal);
  const fp = footprint(pedal);
  const mod = isMac ? '⌘' : 'Ctrl+';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-3 lg:bottom-4">
      <div
        key={pedal.instanceId}
        role="toolbar"
        aria-label="Selected pedal"
        className="pointer-events-auto flex max-w-full animate-slide-up items-center gap-1 rounded-2xl border border-line bg-panel/95 p-1.5 pl-3 shadow-[var(--shadow-float)] backdrop-blur"
      >
        <div className="mr-1 min-w-0 max-w-44 sm:max-w-60">
          <p className="truncate text-[13px] leading-tight font-semibold text-fg">{pedal.name}</p>
          <p className="truncate font-mono text-[10.5px] leading-tight text-fg-subtle">
            {pedal.brand} · {formatSize(fp.w, fp.h, units)}
          </p>
        </div>
        <span className="mx-0.5 h-6 w-px bg-line" />
        <IconButton label="Rotate left" shortcut="Shift+R" tipPos="top" className="max-sm:hidden" onClick={() => rotate(pedal.instanceId, -1)}>
          <RotateCcwIcon size={16} />
        </IconButton>
        <IconButton label="Rotate" shortcut="R" tipPos="top" onClick={() => rotate(pedal.instanceId, 1)}>
          <RotateCwIcon size={16} />
        </IconButton>
        <IconButton label="Duplicate" shortcut={`${mod}D`} tipPos="top" onClick={() => duplicate(pedal.instanceId)}>
          <CopyIcon size={16} />
        </IconButton>
        <IconButton label="Bring to front" shortcut="]" tipPos="top" className="max-sm:hidden" onClick={() => front(pedal.instanceId)}>
          <LayersIcon size={16} />
        </IconButton>
        <IconButton
          label="Remove"
          shortcut="Del"
          tipPos="top"
          tone="danger"
          onClick={() => {
            remove(pedal.instanceId);
            toast({ message: `Removed ${pedal.name}`, action: { label: 'Undo', run: () => usePedalStore.getState().undo() } });
          }}
        >
          <TrashIcon size={16} />
        </IconButton>
      </div>
    </div>
  );
}

function NoBoard({ onOpenPicker }: { onOpenPicker: () => void }) {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up rounded-3xl border border-line bg-panel p-8 text-center shadow-[var(--shadow-float)]">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <BoardIcon size={26} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Plan your pedalboard to scale</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-fg-muted">
          Pick a real board (or enter a custom size), then drag pedals on to see exactly what fits — and what it’ll cost.
        </p>
        <button
          type="button"
          onClick={onOpenPicker}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent shadow-[var(--shadow-pop)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <SearchIcon size={16} strokeWidth={2.25} />
          Choose a pedalboard
        </button>
        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-5 text-left">
          {[
            ['1', 'Pick a board'],
            ['2', 'Add pedals'],
            ['3', 'Check fit & cost'],
          ].map(([n, label]) => (
            <div key={n} className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-panel-3 font-mono text-[10px] text-fg-muted">
                {n}
              </span>
              <span className="text-[12px] text-fg-muted">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 hidden text-[11px] text-fg-subtle md:block">
          Press <Kbd>?</Kbd> any time for keyboard shortcuts
        </p>
      </div>
    </div>
  );
}
