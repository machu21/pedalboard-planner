'use client';

import { useEffect } from 'react';
import type { ActivePedal } from '@/types/pedal';
import { usePedalStore } from '@/store/usePedalStore';
import { fetchRealPedalPrice } from '@/app/actions/getPrice';
import { pedalKey } from '@/lib/catalog';

/** Looks up a market price once per unique pedal model, in the background. */
export function usePriceLookup(pedals: ActivePedal[]) {
  useEffect(() => {
    const { prices, setPrice } = usePedalStore.getState();
    const seen = new Set<string>();
    for (const p of pedals) {
      const key = pedalKey(p);
      if (seen.has(key) || prices[key]) continue;
      seen.add(key);
      setPrice(key, { status: 'loading' });
      fetchRealPedalPrice(p.brand, p.name)
        .then((php) => setPrice(key, php ? { status: 'ready', php, source: 'reverb' } : { status: 'unavailable' }))
        .catch(() => setPrice(key, { status: 'unavailable' }));
    }
  }, [pedals]);
}
