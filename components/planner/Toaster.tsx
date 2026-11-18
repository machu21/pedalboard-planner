'use client';

import { useUiStore } from '@/lib/ui-store';
import { AlertIcon, XIcon } from '@/components/icons';

export default function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-16 left-1/2 z-[80] flex w-[min(420px,calc(100vw-24px))] -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex max-w-full animate-slide-up items-center gap-3 rounded-xl bg-fg py-2 pr-1.5 pl-3.5 text-[13px] text-bg shadow-[var(--shadow-float)]"
        >
          {t.tone === 'warning' && <AlertIcon size={15} className="shrink-0 text-accent" />}
          <span className="min-w-0 truncate">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
              className="shrink-0 rounded-lg px-2.5 py-1 font-semibold text-bg underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:bg-bg/10"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg opacity-60 transition hover:bg-bg/10 hover:opacity-100"
          >
            <XIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
