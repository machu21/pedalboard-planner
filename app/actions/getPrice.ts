'use server';

const FALLBACK_USD_PHP = 56.5;

async function getUsdToPhpRate(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.rates?.PHP || FALLBACK_USD_PHP;
  } catch {
    return FALLBACK_USD_PHP;
  }
}

/**
 * Median used-market price for a pedal on Reverb, converted to PHP and rounded
 * to the nearest ₱50. Returns null when no price could be determined.
 */
export async function fetchRealPedalPrice(brand: string, name: string): Promise<number | null> {
  const token = process.env.REVERB_API;
  if (!token) return null;

  try {
    const cleanName = name.replace(/\s*\(.*?\)\s*/g, '').trim();
    const query = encodeURIComponent(`${brand} ${cleanName}`);
    const res = await fetch(`https://api.reverb.com/api/listings?query=${query}&condition=used&per_page=10`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/hal+json',
        'Accept-Version': '3.0',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error('Reverb API error:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    const listings = data.listings as Array<{ price: { amount: string } }> | undefined;
    const usd = (listings ?? [])
      .map((l) => parseFloat(l.price?.amount))
      .filter((p) => !isNaN(p) && p > 10 && p < 10000)
      .sort((a, b) => a - b);
    if (usd.length === 0) return null;

    const mid = Math.floor(usd.length / 2);
    const median = usd.length % 2 === 0 ? (usd[mid - 1] + usd[mid]) / 2 : usd[mid];
    const rate = await getUsdToPhpRate();
    return Math.round((median * rate) / 50) * 50;
  } catch (error) {
    console.error('Pricing fetch failed:', error);
    return null;
  }
}
