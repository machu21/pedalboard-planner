'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <div className="font-display text-3xl tracking-[0.14em] text-accent">BUDOL</div>
      <h1 className="text-lg font-semibold text-fg">We couldn’t load the pedal catalog</h1>
      <p className="max-w-sm text-sm text-fg-muted">
        The pedal database is hosted on GitHub and didn’t respond. Check your connection and try again.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}
