'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BoardData } from '@/types/pedal';
import { usePedalStore } from '@/store/usePedalStore';
import { boardImageUrl, formatSize } from '@/lib/catalog';
import { IconButton, SafeImage } from '@/components/ui';
import { BoardIcon, CheckIcon, RulerIcon, SearchIcon, XIcon } from '@/components/icons';

const SIZES = [
  { id: 'all', label: 'All sizes', test: () => true },
  { id: 's', label: 'Small', hint: '< 20″', test: (b: BoardData) => b.width < 20 },
  { id: 'm', label: 'Medium', hint: '20–28″', test: (b: BoardData) => b.width >= 20 && b.width <= 28 },
  { id: 'l', label: 'Large', hint: '> 28″', test: (b: BoardData) => b.width > 28 },
] as const;

const sameBoard = (a: BoardData | null, b: BoardData) =>
  !!a && !a.custom && a.brand === b.brand && a.name === b.name && a.width === b.width && a.height === b.height;

export default function BoardPicker({ boards, open, onClose }: { boards: BoardData[]; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const current = usePedalStore((s) => s.board);
  const setBoard = usePedalStore((s) => s.setBoard);
  const units = usePedalStore((s) => s.units);
  const [query, setQuery] = useState('');
  const [size, setSize] = useState<(typeof SIZES)[number]['id']>('all');
  const [customW, setCustomW] = useState(() => String(current?.custom ? current.width : 24));
  const [customH, setCustomH] = useState(() => String(current?.custom ? current.height : 12.5));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const filtered = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const sizeTest = SIZES.find((s) => s.id === size)!.test;
    return boards.filter((b) => {
      const hay = `${b.brand} ${b.name}`.toLowerCase();
      return sizeTest(b) && tokens.every((t) => hay.includes(t));
    });
  }, [boards, query, size]);

  const choose = (b: BoardData) => {
    setBoard(b);
    onClose();
  };

  const toInches = (v: string) => {
    const n = parseFloat(v);
    if (!isFinite(n) || n <= 0) return NaN;
    return units === 'cm' ? n / 2.54 : n;
  };
  const cw = toInches(customW);
  const ch = toInches(customH);
  const customValid = cw >= 4 && cw <= 80 && ch >= 3 && ch <= 40;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="board-picker-title"
      className="m-auto h-[min(760px,92dvh)] w-[min(980px,96vw)] max-w-none overflow-hidden rounded-3xl border border-line bg-panel p-0 text-fg shadow-[var(--shadow-float)] open:flex open:animate-pop-in open:flex-col max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:rounded-none"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-6">
        <div>
          <h2 id="board-picker-title" className="text-lg font-semibold tracking-tight">
            Choose a pedalboard
          </h2>
          <p className="text-[12.5px] text-fg-muted">
            {boards.length} boards with real dimensions — pedals already placed will stay on the board.
          </p>
        </div>
        <IconButton label="Close" onClick={onClose}>
          <XIcon size={18} />
        </IconButton>
      </div>

      <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:px-6">
        <div className="relative flex-1">
          <SearchIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Pedaltrain, Temple, Gator…"
            aria-label="Search boards"
            className="h-10 w-full rounded-xl border border-line bg-panel-2 pr-3 pl-9 text-[13px] outline-none placeholder:text-fg-subtle focus:border-accent focus:bg-panel focus:ring-4 focus:ring-accent-soft"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel-2 p-1" role="radiogroup" aria-label="Board size">
          {SIZES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={size === s.id}
              onClick={() => setSize(s.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                size === s.id ? 'bg-panel text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {s.label}
              {'hint' in s && <span className="ml-1 font-mono text-[10px] text-fg-subtle">{s.hint}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {/* Custom size */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!customValid) return;
              choose({
                brand: 'Custom',
                name: `${+cw.toFixed(2)}×${+ch.toFixed(2)}`,
                width: +cw.toFixed(2),
                height: +ch.toFixed(2),
                image: '',
                custom: true,
              });
            }}
            className={`col-span-2 flex flex-col justify-between gap-3 rounded-2xl border border-dashed p-3.5 sm:col-span-1 ${
              current?.custom ? 'border-accent bg-accent-soft' : 'border-line-strong'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-panel-3 text-fg-muted">
                <RulerIcon size={16} />
              </span>
              <div>
                <p className="text-[13px] font-semibold">Custom size</p>
                <p className="text-[11px] text-fg-muted">DIY or unlisted board</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="sr-only" htmlFor="cw">
                Width
              </label>
              <input
                id="cw"
                inputMode="decimal"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="h-9 w-full min-w-0 rounded-lg border border-line bg-panel px-2 text-center font-mono text-[12px] outline-none focus:border-accent"
              />
              <span className="text-fg-subtle">×</span>
              <label className="sr-only" htmlFor="ch">
                Depth
              </label>
              <input
                id="ch"
                inputMode="decimal"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="h-9 w-full min-w-0 rounded-lg border border-line bg-panel px-2 text-center font-mono text-[12px] outline-none focus:border-accent"
              />
              <span className="font-mono text-[11px] text-fg-subtle">{units}</span>
            </div>
            <button
              type="submit"
              disabled={!customValid}
              className="h-9 rounded-lg bg-accent text-[12.5px] font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-40"
            >
              Use custom board
            </button>
          </form>

          {filtered.map((b, i) => {
            const active = sameBoard(current, b);
            return (
              <button
                key={`${b.brand}-${b.name}-${i}`}
                type="button"
                onClick={() => choose(b)}
                aria-pressed={active}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] ${
                  active ? 'border-accent ring-2 ring-accent/40' : 'border-line hover:border-line-strong'
                }`}
              >
                <span className="flex aspect-[16/10] items-center justify-center bg-[#1f1f22] p-3">
                  <SafeImage
                    src={boardImageUrl(b.image)}
                    alt=""
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                    fallback={<BoardIcon size={28} className="text-white/30" />}
                  />
                </span>
                <span className="flex flex-1 flex-col gap-0.5 border-t border-line bg-panel px-3 py-2.5">
                  <span className="truncate font-mono text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{b.brand}</span>
                  <span className="line-clamp-2 text-[13px] leading-snug font-medium">{b.name}</span>
                  <span className="mt-auto pt-1 font-mono text-[11px] text-fg-muted">{formatSize(b.width, b.height, units)}</span>
                </span>
                {active && (
                  <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-accent text-on-accent shadow">
                    <CheckIcon size={14} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm font-medium">No boards match “{query}”</p>
            <p className="mt-1 text-[12px] text-fg-muted">Try another brand, or use a custom size.</p>
          </div>
        )}
      </div>
    </dialog>
  );
}
