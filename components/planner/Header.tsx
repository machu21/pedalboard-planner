'use client';

import { useState } from 'react';
import { usePedalStore } from '@/store/usePedalStore';
import { boardImageUrl, formatSize } from '@/lib/catalog';
import { IconButton, SafeImage } from '@/components/ui';
import {
  BoardIcon,
  ChevronDownIcon,
  KeyboardIcon,
  LibraryIcon,
  ListIcon,
  MoonIcon,
  RedoIcon,
  SunIcon,
  UndoIcon,
} from '@/components/icons';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

export default function Header({
  onOpenPicker,
  onOpenShortcuts,
  onToggleLibrary,
  onToggleRig,
}: {
  onOpenPicker: () => void;
  onOpenShortcuts: () => void;
  onToggleLibrary: () => void;
  onToggleRig: () => void;
}) {
  const board = usePedalStore((s) => s.board);
  const count = usePedalStore((s) => s.pedals.length);
  const canUndo = usePedalStore((s) => s.past.length > 0);
  const canRedo = usePedalStore((s) => s.future.length > 0);
  const undo = usePedalStore((s) => s.undo);
  const redo = usePedalStore((s) => s.redo);
  const units = usePedalStore((s) => s.units);
  const setUnits = usePedalStore((s) => s.setUnits);

  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('budol-theme', next);
    } catch {}
    setTheme(next);
  };

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel px-2 sm:gap-3 sm:px-4">
      <IconButton label="Pedal library" className="lg:hidden" onClick={onToggleLibrary}>
        <LibraryIcon size={18} />
      </IconButton>

      <div className="flex shrink-0 items-baseline gap-2 pr-1 select-none">
        <span className="font-display text-[22px] leading-none sm:text-[26px] tracking-[0.12em] text-accent">BUDOL</span>
        <span className="hidden font-mono text-[10px] tracking-[0.2em] text-fg-subtle uppercase md:inline">
          Pedalboard Planner
        </span>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

      {/* Board picker trigger */}
      <button
        type="button"
        onClick={onOpenPicker}
        className={`group flex min-w-0 items-center gap-2.5 rounded-xl border py-1 pr-2.5 pl-2.5 text-left sm:pl-1 transition-colors ${
          board
            ? 'border-line bg-panel-2 hover:border-line-strong'
            : 'border-accent/40 bg-accent-soft text-accent hover:border-accent'
        }`}
      >
        <span className="hidden h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#2a2a2d] sm:flex">
          {board && !board.custom ? (
            <SafeImage
              src={boardImageUrl(board.image)}
              alt=""
              className="size-full object-contain p-0.5"
              fallback={<BoardIcon size={16} className="text-white/60" />}
            />
          ) : (
            <BoardIcon size={16} className="text-white/70" />
          )}
        </span>
        <span className="min-w-0">
          {board ? (
            <>
              <span className="block truncate text-[13px] leading-tight font-semibold text-fg">
                {board.custom ? 'Custom board' : `${board.brand} ${board.name}`}
              </span>
              <span className="block truncate font-mono text-[10.5px] leading-tight whitespace-nowrap text-fg-subtle">
                {formatSize(board.width, board.height, units)}
              </span>
            </>
          ) : (
            <span className="block text-[13px] font-semibold">Choose a board</span>
          )}
        </span>
        <ChevronDownIcon size={14} className="shrink-0 text-fg-subtle transition-transform group-hover:translate-y-px" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5 max-sm:hidden">
        <IconButton label="Undo" shortcut={`${MOD}+Z`} onClick={undo} disabled={!canUndo}>
          <UndoIcon size={17} />
        </IconButton>
        <IconButton label="Redo" shortcut={`${MOD}+Shift+Z`} onClick={redo} disabled={!canRedo}>
          <RedoIcon size={17} />
        </IconButton>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

      <div
        role="radiogroup"
        aria-label="Units"
        className="hidden items-center rounded-lg border border-line bg-panel-2 p-0.5 font-mono text-[11px] sm:flex"
      >
        {(['in', 'cm'] as const).map((u) => (
          <button
            key={u}
            role="radio"
            aria-checked={units === u}
            onClick={() => setUnits(u)}
            className={`rounded-md px-2 py-1 transition-colors ${
              units === u ? 'bg-panel text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            {u}
          </button>
        ))}
      </div>

      <IconButton label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggleTheme}>
        {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
      </IconButton>
      <IconButton label="Keyboard shortcuts" shortcut="?" className="max-md:hidden" onClick={onOpenShortcuts}>
        <KeyboardIcon size={18} />
      </IconButton>

      <button
        type="button"
        onClick={onToggleRig}
        aria-label="Your rig"
        className="relative inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-fg-muted transition-colors hover:bg-panel-3 hover:text-fg xl:hidden"
      >
        <ListIcon size={18} />
        <span className="hidden text-[13px] font-medium sm:inline">Rig</span>
        {count > 0 && (
          <span className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center font-mono text-[10px] leading-none font-medium text-on-accent">
            {count}
          </span>
        )}
      </button>
    </header>
  );
}
