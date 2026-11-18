import Planner from '@/components/planner/Planner';
import type { BoardData, PedalData } from '@/types/pedal';
import { ASSET_BASE } from '@/lib/catalog';

type RawItem = Record<string, unknown>;

function normalize(raw: RawItem[], fallbackW: number, fallbackH: number): PedalData[] {
  return raw
    .map((r) => ({
      brand: String(r.Brand ?? r.brand ?? 'Unknown').trim(),
      name: String(r.Name ?? r.name ?? 'Unknown').trim(),
      width: Number(r.Width ?? r.width) || fallbackW,
      height: Number(r.Height ?? r.height) || fallbackH,
      image: String(r.Image ?? r.image ?? ''),
    }))
    .sort((a, b) => a.brand.localeCompare(b.brand, 'en', { sensitivity: 'base' }) || a.name.localeCompare(b.name, 'en', { numeric: true }));
}

async function getCatalog(): Promise<{ pedals: PedalData[]; boards: BoardData[] }> {
  const [pedalRes, boardRes] = await Promise.all([
    fetch(`${ASSET_BASE}data/pedals.json`, { next: { revalidate: 86400 } }),
    fetch(`${ASSET_BASE}data/pedalboards.json`, { next: { revalidate: 86400 } }),
  ]);
  if (!pedalRes.ok || !boardRes.ok) throw new Error('Could not load the pedal catalog.');
  const [pedals, boards] = await Promise.all([pedalRes.json(), boardRes.json()]);
  return { pedals: normalize(pedals, 3, 5), boards: normalize(boards, 18, 12) };
}

export default async function Page() {
  const { pedals, boards } = await getCatalog();
  return <Planner pedals={pedals} boards={boards} />;
}
