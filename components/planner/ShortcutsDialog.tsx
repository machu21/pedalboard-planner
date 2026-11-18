'use client';

import { useEffect, useRef } from 'react';
import { IconButton, Kbd } from '@/components/ui';
import { XIcon } from '@/components/icons';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: 'Selected pedal',
    items: [
      [['R'], 'Rotate 90° clockwise'],
      [['Shift', 'R'], 'Rotate counter-clockwise'],
      [['←', '↑', '→', '↓'], 'Nudge ⅛″ (hold Shift for 1″)'],
      [[MOD, 'D'], 'Duplicate'],
      [[']'], 'Bring to front'],
      [['Del'], 'Remove'],
      [['Esc'], 'Deselect'],
    ],
  },
  {
    title: 'Board & view',
    items: [
      [['+'], 'Zoom in'],
      [['−'], 'Zoom out'],
      [['0'], 'Fit board to screen'],
      [[MOD, 'Scroll'], 'Zoom with mouse / trackpad'],
      [['Double-click'], 'Rotate a pedal'],
    ],
  },
  {
    title: 'General',
    items: [
      [['/'], 'Search pedals'],
      [['Enter'], 'Add first search result'],
      [[MOD, 'Z'], 'Undo'],
      [[MOD, 'Shift', 'Z'], 'Redo'],
      [['?'], 'Show this help'],
    ],
  },
];

export default function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="shortcuts-title"
      className="m-auto w-[min(640px,94vw)] rounded-3xl border border-line bg-panel p-0 text-fg shadow-[var(--shadow-float)] open:animate-pop-in"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 id="shortcuts-title" className="text-base font-semibold">
          Keyboard shortcuts
        </h2>
        <IconButton label="Close" onClick={onClose}>
          <XIcon size={18} />
        </IconButton>
      </div>
      <div tabIndex={-1} autoFocus className="grid gap-6 p-6 outline-none sm:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.title} className={g.title === 'Selected pedal' ? 'sm:row-span-2' : ''}>
            <h3 className="mb-2 font-mono text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{g.title}</h3>
            <ul className="space-y-1.5">
              {g.items.map(([keys, label]) => (
                <li key={label} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-fg-muted">{label}</span>
                  <span className="flex shrink-0 gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  );
}
