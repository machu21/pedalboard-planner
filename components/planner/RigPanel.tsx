'use client';

import { useMemo } from 'react';
import { usePedalStore } from '@/store/usePedalStore';
import { toast, useUiStore } from '@/lib/ui-store';
import { findProblems, footprint, formatPHP, formatSize, pedalImageUrl, pedalKey } from '@/lib/catalog';
import { IconButton, SafeImage } from '@/components/ui';
import { AlertIcon, ExternalIcon, ShopIcon, TrashIcon, XIcon } from '@/components/icons';

export default function RigPanel({
  open,
  onClose,
  onOpenPicker,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPicker: () => void;
}) {
  const board = usePedalStore((s) => s.board);
  const pedals = usePedalStore((s) => s.pedals);
  const prices = usePedalStore((s) => s.prices);
  const units = usePedalStore((s) => s.units);
  const selectedId = usePedalStore((s) => s.selectedId);
  const select = usePedalStore((s) => s.select);
  const remove = usePedalStore((s) => s.removePedal);
  const clear = usePedalStore((s) => s.clearBoard);
  const hoveredId = useUiStore((s) => s.hoveredId);
  const setHovered = useUiStore((s) => s.setHovered);

  const stats = useMemo(() => {
    const area = pedals.reduce((sum, p) => sum + p.width * p.height, 0);
    const boardArea = board ? board.width * board.height : 0;
    const problems = board ? findProblems(pedals, board.width, board.height) : null;
    let total = 0;
    let priced = 0;
    let loading = 0;
    for (const p of pedals) {
      const pr = prices[pedalKey(p)];
      if (pr?.status === 'ready') {
        total += pr.php;
        priced++;
      } else if (!pr || pr.status === 'loading') loading++;
    }
    return { used: boardArea ? area / boardArea : 0, problems, total, priced, loading };
  }, [pedals, board, prices]);

  const usedPct = Math.round(stats.used * 100);
  const meterColor = stats.used > 1 ? 'bg-danger' : stats.used > 0.85 ? 'bg-[#eab308]' : 'bg-accent';

  return (
    <aside
      aria-label="Your rig"
      className={`fixed inset-y-0 right-0 z-40 flex w-[min(22rem,88vw)] flex-col border-l border-line bg-panel shadow-[var(--shadow-float)] transition-[transform,visibility] duration-200 ease-out xl:static xl:z-auto xl:w-80 xl:translate-x-0 xl:shadow-none ${
        open ? 'translate-x-0' : 'translate-x-full max-xl:invisible'
      }`}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-fg">Your rig</h2>
          <p className="font-mono text-[11px] text-fg-subtle">
            {pedals.length} pedal{pedals.length === 1 ? '' : 's'}
          </p>
        </div>
        <IconButton label="Close" className="xl:hidden" onClick={onClose}>
          <XIcon size={18} />
        </IconButton>
      </div>

      {/* Board summary */}
      {board ? (
        <div className="space-y-3 border-b border-line px-4 py-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] text-fg-muted">Space used</span>
            <span className="font-mono text-[12px] font-medium text-fg tabular-nums">{usedPct}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-panel-3"
            role="meter"
            aria-valuenow={usedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Board space used"
          >
            <div className={`h-full rounded-full transition-[width] duration-300 ${meterColor}`} style={{ width: `${Math.min(100, usedPct)}%` }} />
          </div>
          <p className="font-mono text-[10.5px] text-fg-subtle">
            {board.custom ? 'Custom board' : `${board.brand} ${board.name}`} · {formatSize(board.width, board.height, units)}
          </p>

          {stats.problems && (stats.problems.overlapping.size > 0 || stats.problems.outside.size > 0) && (
            <div className="flex gap-2 rounded-xl border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
              <AlertIcon size={15} className="mt-px shrink-0" />
              <div className="space-y-0.5">
                {stats.problems.overlapping.size > 0 && <p>{stats.problems.overlapping.size} pedals overlap each other</p>}
                {stats.problems.outside.size > 0 && (
                  <p>
                    {stats.problems.outside.size} pedal{stats.problems.outside.size === 1 ? '' : 's'} too big for this board
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-b border-line px-4 py-4">
          <button
            type="button"
            onClick={onOpenPicker}
            className="w-full rounded-xl border border-dashed border-line-strong px-3 py-3 text-[12.5px] text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            No board selected — choose one
          </button>
        </div>
      )}

      {/* Pedal list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {pedals.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-panel-2 text-fg-subtle">
              <ShopIcon size={20} />
            </div>
            <p className="text-[13px] font-medium text-fg">No pedals yet</p>
            <p className="mt-1 max-w-56 text-[12px] leading-relaxed text-fg-muted">
              Pedals you add appear here with estimated prices and shop links.
            </p>
          </div>
        ) : (
          <ul className="p-2">
            {[...pedals].reverse().map((p) => {
              const price = prices[pedalKey(p)];
              const active = p.instanceId === selectedId;
              const hovered = p.instanceId === hoveredId;
              const fp = footprint(p);
              const lazada = `https://www.lazada.com.ph/catalog/?q=${encodeURIComponent(`${p.brand} ${p.name} guitar pedal`)}`;
              const problem = stats.problems?.overlapping.has(p.instanceId) || stats.problems?.outside.has(p.instanceId);
              return (
                <li
                  key={p.instanceId}
                  onPointerEnter={() => setHovered(p.instanceId)}
                  onPointerLeave={() => setHovered(null)}
                  className={`group relative flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
                    active ? 'bg-accent-soft' : hovered ? 'bg-panel-2' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => select(active ? null : p.instanceId)}
                    className="absolute inset-0 rounded-xl"
                    aria-label={`Select ${p.brand} ${p.name}`}
                    aria-pressed={active}
                  />
                  <span className="pointer-events-none relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-panel-2 p-1">
                    <SafeImage src={pedalImageUrl(p.image)} alt="" className="size-full object-contain" fallback={null} />
                    {problem && <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-danger ring-2 ring-panel" />}
                  </span>
                  <span className="pointer-events-none min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-tight font-medium text-fg">{p.name}</span>
                    <span className="block truncate text-[11.5px] leading-tight text-fg-muted">{p.brand}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-fg-subtle">
                      {formatSize(fp.w, fp.h, units)}
                    </span>
                  </span>
                  <span className="pointer-events-none flex flex-col items-end gap-1">
                    <PriceTag price={price} />
                  </span>
                  <div className="relative flex flex-col gap-0.5 opacity-100 transition-opacity xl:opacity-0 xl:group-focus-within:opacity-100 xl:group-hover:opacity-100">
                    <a
                      href={lazada}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Search ${p.name} on Lazada`}
                      data-tip="Find on Lazada"
                      data-tip-pos="left"
                      className="inline-flex size-7 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-panel-3 hover:text-fg"
                    >
                      <ExternalIcon size={14} />
                    </a>
                    <IconButton
                      label="Remove"
                      tipPos="left"
                      tone="danger"
                      size="sm"
                      onClick={() => {
                        remove(p.instanceId);
                        toast({ message: `Removed ${p.name}`, action: { label: 'Undo', run: () => usePedalStore.getState().undo() } });
                      }}
                    >
                      <TrashIcon size={14} />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-3 border-t border-line bg-panel-2/60 px-4 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Estimated total</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {pedals.length === 0
                ? 'Add pedals to see a total'
                : stats.loading > 0
                  ? 'Checking market prices…'
                  : stats.priced === 0
                    ? 'Prices unavailable right now'
                    : `${stats.priced} of ${pedals.length} priced · Reverb used median`}
            </p>
          </div>
          <p className={`font-display text-[30px] leading-none tracking-wide tabular-nums ${stats.priced > 0 ? 'text-accent' : 'text-fg-subtle'}`}>
            {stats.priced > 0 ? formatPHP(stats.total) : '—'}
          </p>
        </div>
        {pedals.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const n = pedals.length;
              clear();
              toast({
                message: `Cleared ${n} pedal${n === 1 ? '' : 's'}`,
                action: { label: 'Undo', run: () => usePedalStore.getState().undo() },
              });
            }}
            className="w-full rounded-xl border border-line py-2 text-[12.5px] font-medium text-fg-muted transition-colors hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
          >
            Clear board
          </button>
        )}
      </div>
    </aside>
  );
}

function PriceTag({ price }: { price: ReturnType<typeof usePedalStore.getState>['prices'][string] | undefined }) {
  if (!price || price.status === 'loading') return <span className="skeleton h-3.5 w-14 rounded" aria-label="Loading price" />;
  if (price.status === 'unavailable') return null;
  return <span className="font-mono text-[12px] font-medium text-fg tabular-nums">{formatPHP(price.php)}</span>;
}
