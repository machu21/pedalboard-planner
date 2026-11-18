import type { ActivePedal, PedalData } from '@/types/pedal';

export const ASSET_BASE =
  'https://raw.githubusercontent.com/PedalPlayground/PedalPlayground.github.io/master/public/';

/** Base on-screen pixels per inch at 100% zoom. */
export const BASE_PPI = 30;

export function pedalImageUrl(image: string): string {
  if (!image) return '';
  const lower = image.toLowerCase();
  const path = lower.startsWith('images/')
    ? image
    : lower.startsWith('pedals/')
      ? `images/${image}`
      : `images/pedals/${image}`;
  return ASSET_BASE + path;
}

export function boardImageUrl(image: string): string {
  if (!image) return '';
  return ASSET_BASE + (image.toLowerCase().startsWith('images/') ? image : `images/pedalboards/${image}`);
}

export const pedalKey = (p: Pick<PedalData, 'brand' | 'name'>) => `${p.brand}::${p.name}`;

const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});
export const formatPHP = (n: number) => phpFormatter.format(n);

export type Units = 'in' | 'cm';
export function formatLength(inches: number, units: Units, digits = 1): string {
  return units === 'in' ? `${+inches.toFixed(digits)}″` : `${+(inches * 2.54).toFixed(digits)} cm`;
}
export function formatSize(w: number, h: number, units: Units): string {
  if (units === 'in') return `${+w.toFixed(1)} × ${+h.toFixed(1)} in`;
  return `${+(w * 2.54).toFixed(1)} × ${+(h * 2.54).toFixed(1)} cm`;
}

/** Axis-aligned footprint of a placed pedal in inches, accounting for 90° rotations. */
export function footprint(p: Pick<ActivePedal, 'x' | 'y' | 'width' | 'height' | 'rotation'>) {
  const sideways = p.rotation === 90 || p.rotation === 270;
  const w = sideways ? p.height : p.width;
  const h = sideways ? p.width : p.height;
  // Rotation happens around the element centre, so the footprint shifts.
  const cx = p.x + p.width / 2;
  const cy = p.y + p.height / 2;
  return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2, w, h };
}

const EPS = 0.05;

/** Returns the set of instanceIds that overlap another pedal or hang off the board. */
export function findProblems(pedals: ActivePedal[], boardW: number, boardH: number) {
  const overlapping = new Set<string>();
  const outside = new Set<string>();
  const fps = pedals.map((p) => ({ id: p.instanceId, ...footprint(p) }));
  for (let i = 0; i < fps.length; i++) {
    const a = fps[i];
    if (a.left < -EPS || a.top < -EPS || a.right > boardW + EPS || a.bottom > boardH + EPS) outside.add(a.id);
    for (let j = i + 1; j < fps.length; j++) {
      const b = fps[j];
      if (a.left < b.right - EPS && a.right > b.left + EPS && a.top < b.bottom - EPS && a.bottom > b.top + EPS) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return { overlapping, outside };
}

/** Clamp a pedal's stored x/y so its rotated footprint stays on the board. */
export function clampToBoard(
  p: Pick<ActivePedal, 'width' | 'height' | 'rotation'>,
  x: number,
  y: number,
  boardW: number,
  boardH: number,
) {
  const fp = footprint({ ...p, x, y });
  let dx = 0;
  let dy = 0;
  if (fp.w <= boardW) {
    if (fp.left < 0) dx = -fp.left;
    else if (fp.right > boardW) dx = boardW - fp.right;
  }
  if (fp.h <= boardH) {
    if (fp.top < 0) dy = -fp.top;
    else if (fp.bottom > boardH) dy = boardH - fp.bottom;
  }
  return { x: x + dx, y: y + dy };
}

/**
 * Find an empty spot for a new pedal, scanning right-to-left (signal chain
 * convention: input on the right) and top-to-bottom.
 */
export function findFreeSpot(pedal: PedalData, placed: ActivePedal[], boardW: number, boardH: number) {
  const gap = 0.25;
  const step = 0.25;
  const fps = placed.map((p) => footprint(p));
  const fits = (x: number, y: number) =>
    fps.every(
      (b) => x + pedal.width + gap <= b.left || x - gap >= b.right || y + pedal.height + gap <= b.top || y - gap >= b.bottom,
    );
  for (let y = gap; y + pedal.height <= boardH - gap + 1e-6; y += step) {
    for (let x = boardW - pedal.width - gap; x >= gap - 1e-6; x -= step) {
      if (fits(x, y)) return { x, y };
    }
  }
  // Board is full — drop it in the middle with a small cascade so it is visible.
  const n = placed.length % 6;
  return clampToBoard(
    { ...pedal, rotation: 0 },
    boardW / 2 - pedal.width / 2 + n * 0.4,
    boardH / 2 - pedal.height / 2 + n * 0.4,
    boardW,
    boardH,
  );
}
