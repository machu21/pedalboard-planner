'use client';

import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tipPos?: 'top' | 'bottom' | 'left';
  shortcut?: string;
  tone?: 'default' | 'danger' | 'accent';
  size?: 'sm' | 'md';
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tipPos = 'bottom', shortcut, tone = 'default', size = 'md', className = '', children, ...rest },
  ref,
) {
  const tones = {
    default: 'text-fg-muted hover:text-fg hover:bg-panel-3',
    danger: 'text-fg-muted hover:text-danger hover:bg-danger-soft',
    accent: 'text-accent hover:bg-accent-soft',
  };
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-tip={shortcut ? `${label}  ·  ${shortcut}` : label}
      data-tip-pos={tipPos}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-35 ${
        size === 'sm' ? 'size-7' : 'size-9'
      } ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-line-strong bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] leading-none text-fg-muted">
      {children}
    </kbd>
  );
}

/** <img> that swaps to a labelled placeholder when the remote image fails. */
export function SafeImage({
  src,
  alt,
  className = '',
  fallback,
  eager,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
