import PedalPlannerClient from './PedalPlanner';
import { PedalData, BoardData } from '@/types/pedal';

async function getDatabases(): Promise<{ pedals: PedalData[], boards: BoardData[] }> {
  const [pedalRes, boardRes] = await Promise.all([
    fetch('https://raw.githubusercontent.com/PedalPlayground/PedalPlayground.github.io/master/public/data/pedals.json', { next: { revalidate: 86400 } }),
    fetch('https://raw.githubusercontent.com/PedalPlayground/PedalPlayground.github.io/master/public/data/pedalboards.json', { next: { revalidate: 86400 } })
  ]);
  
  if (!pedalRes.ok || !boardRes.ok) throw new Error('Failed to fetch data');
  
  const rawPedals: any[] = await pedalRes.json();
  const rawBoards: any[] = await boardRes.json();
  
  // FIX: Check for both Uppercase and lowercase keys to catch all pedals
  const formattedPedals: PedalData[] = rawPedals.map((p) => ({
    brand: p.Brand || p.brand || 'Unknown Brand',
    name: p.Name || p.name || 'Unknown Pedal',
    width: Number(p.Width ?? p.width) || 3,
    height: Number(p.Height ?? p.height) || 5,
    image: p.Image || p.image || '',
    pricePHP: Number(p.PricePHP ?? p.pricePHP) || 0,
    isRealPrice: Boolean(p.IsRealPrice ?? p.isRealPrice) || false,
  }));

  const formattedBoards: BoardData[] = rawBoards.map((b) => ({
    brand: b.Brand || b.brand || 'Unknown Brand',
    name: b.Name || b.name || 'Unknown Board',
    width: Number(b.Width ?? b.width) || 18,
    height: Number(b.Height ?? b.height) || 12,
    image: b.Image || b.image || '',
    pricePHP: Number(b.PricePHP ?? b.pricePHP) || 0,
    isRealPrice: Boolean(b.IsRealPrice ?? b.isRealPrice) || false,
  }));

  return { pedals: formattedPedals, boards: formattedBoards };
}

export default async function Page() {
  const { pedals, boards } = await getDatabases();

  return (
    <main>
      <PedalPlannerClient initialPedalDatabase={pedals} initialBoardDatabase={boards} />
    </main>
  );
}