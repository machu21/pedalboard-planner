'use client';

import { memo, useDeferredValue, useMemo, useRef, useState, type RefObject } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PedalData } from '@/types/pedal';
import { usePedalStore } from '@/store/usePedalStore';
import { formatSize, pedalImageUrl, pedalKey, type Units } from '@/lib/catalog';
import { IconButton, Kbd, SafeImage } from '@/components/ui';
import { PlusIcon, SearchIcon, XIcon } from '@/components/icons';

type Row = { type: 'brand'; brand: string; count: number } | { type: 'pedal'; pedal: PedalData };

const BRAND_ROW = 34;
const PEDAL_ROW = 60;

export default function Library({
  catalog,
  onAdd,
  searchRef,
  open,
  onClose,
}: {
  catalog: PedalData[];
  onAdd: (p: PedalData) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const units = usePedalStore((s) => s.units);
  const onBoard = usePedalStore((s) => s.pedals);

  const onBoardCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of onBoard) m.set(pedalKey(p), (m.get(pedalKey(p)) ?? 0) + 1);
    return m;
  }, [onBoard]);

  const haystack = useMemo(() => catalog.map((p) => `${p.brand} ${p.name}`.toLowerCase()), [catalog]);

  const { rows, matches } = useMemo(() => {
    const tokens = deferredQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = tokens.length ? catalog.filter((_, i) => tokens.every((t) => haystack[i].includes(t))) : catalog;
    const rows: Row[] = [];
    let i = 0;
    while (i < filtered.length) {
      const brand = filtered[i].brand;
      let j = i;
      while (j < filtered.length && filtered[j].brand === brand) j++;
      rows.push({ type: 'brand', brand, count: j - i });
      for (let k = i; k < j; k++) rows.push({ type: 'pedal', pedal: filtered[k] });
      i = j;
    }
    return { rows, matches: filtered.length };
  }, [deferredQuery, catalog, haystack]);

  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual manages its own memoization
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i].type === 'brand' ? BRAND_ROW : PEDAL_ROW),
    overscan: 8,
  });

  const stale = query !== deferredQuery;

  return (
    <aside
      aria-label="Pedal library"
      className={`fixed inset-y-0 left-0 z-40 flex w-[min(22rem,88vw)] flex-col border-r border-line bg-panel shadow-[var(--shadow-float)] transition-[transform,visibility] duration-200 ease-out lg:static lg:z-auto lg:w-80 lg:translate-x-0 lg:shadow-none ${
        open ? 'translate-x-0' : '-translate-x-full max-lg:invisible'
      }`}
    >
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">Pedal library</h2>
            <p className="font-mono text-[11px] text-fg-subtle">
              {query ? `${matches.toLocaleString()} matches` : `${catalog.length.toLocaleString()} pedals`}
            </p>
          </div>
          <IconButton label="Close" className="lg:hidden" onClick={onClose}>
            <XIcon size={18} />
          </IconButton>
        </div>

        <div className="relative">
          <SearchIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              scrollRef.current?.scrollTo({ top: 0 });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (query) setQuery('');
                else e.currentTarget.blur();
              }
              if (e.key === 'Enter') {
                const first = rows.find((r) => r.type === 'pedal');
                if (first?.type === 'pedal') onAdd(first.pedal);
              }
            }}
            placeholder="Search brand or model…"
            aria-label="Search pedals"
            className="h-10 w-full rounded-xl border border-line bg-panel-2 pr-16 pl-9 text-[13px] text-fg transition-colors outline-none placeholder:text-fg-subtle focus:border-accent focus:bg-panel focus:ring-4 focus:ring-accent-soft [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
            {query ? (
              <IconButton label="Clear search" size="sm" onClick={() => setQuery('')}>
                <XIcon size={14} />
              </IconButton>
            ) : (
              <span className="pointer-events-none mr-1 hidden lg:block">
                <Kbd>/</Kbd>
              </span>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${stale ? 'opacity-60' : ''}`}>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <SearchIcon size={22} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No pedals match “{query}”</p>
            <p className="mt-1 text-xs text-fg-muted">Try a brand (“Boss”) or a model (“DS-1”).</p>
          </div>
        ) : (
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              return (
                <div key={vi.key} className="absolute inset-x-0" style={{ top: vi.start, height: vi.size }}>
                  {row.type === 'brand' ? (
                    <div className="flex h-full items-end justify-between px-4 pb-1.5">
                      <span className="truncate font-mono text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
                        {row.brand}
                      </span>
                      <span className="font-mono text-[10px] text-fg-subtle/70">{row.count}</span>
                    </div>
                  ) : (
                    <LibraryRow
                      pedal={row.pedal}
                      units={units}
                      onBoard={onBoardCounts.get(pedalKey(row.pedal)) ?? 0}
                      onAdd={onAdd}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden border-t border-line px-4 py-2.5 text-[11px] text-fg-subtle lg:block">
        <span className="font-medium text-fg-muted">Drag</span> onto the board, or{' '}
        <span className="font-medium text-fg-muted">click</span> to auto-place.
      </div>
    </aside>
  );
}

const LibraryRow = memo(function LibraryRow({
  pedal,
  units,
  onBoard,
  onAdd,
}: {
  pedal: PedalData;
  units: Units;
  onBoard: number;
  onAdd: (p: PedalData) => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `lib:${pedalKey(pedal)}`,
    data: { kind: 'library', pedal },
  });

  return (
    <div className="h-full px-2 py-0.5">
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        // Only mice drag from the list; touch scrolls the list and taps to add.
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') listeners?.onPointerDown?.(e);
        }}
        onClick={() => onAdd(pedal)}
        aria-label={`Add ${pedal.brand} ${pedal.name}`}
        className={`group flex h-full w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-panel-2 active:bg-panel-3 ${
          isDragging ? 'opacity-40' : ''
        }`}
      >
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-panel-2 p-1">
          <SafeImage
            src={pedalImageUrl(pedal.image)}
            alt=""
            className="size-full object-contain"
            fallback={<span className="font-mono text-[9px] text-fg-subtle">{pedal.brand.slice(0, 3).toUpperCase()}</span>}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-fg">{pedal.name}</span>
          <span className="block truncate font-mono text-[10.5px] text-fg-subtle">
            {formatSize(pedal.width, pedal.height, units)}
            {onBoard > 0 && <span className="ml-1.5 text-accent">· on board{onBoard > 1 ? ` ×${onBoard}` : ''}</span>}
          </span>
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg text-fg-subtle opacity-0 transition group-hover:bg-accent group-hover:text-on-accent group-hover:opacity-100 group-focus-visible:opacity-100 max-lg:opacity-100">
          <PlusIcon size={15} />
        </span>
      </button>
    </div>
  );
});
