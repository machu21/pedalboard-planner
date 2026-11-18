export default function Loading() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-bg">
      <div className="font-display text-3xl tracking-[0.14em] text-accent">BUDOL</div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-panel-3">
        <div className="skeleton h-full w-full" />
      </div>
      <p className="font-mono text-xs text-fg-subtle">Loading pedal catalog…</p>
    </div>
  );
}
