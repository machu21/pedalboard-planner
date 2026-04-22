// app/actions/getPrice.ts
'use server';

async function getUsdToPhpRate(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return data.rates?.PHP || 56.50;
  } catch {
    return 56.50;
  }
}

export async function fetchRealPedalPrice(brand: string, name: string): Promise<number> {
  try {
    const cleanName = name.replace(/\s*\(.*?\)\s*/g, '').trim();
    const query = encodeURIComponent(`${brand} ${cleanName}`);

    // Use the listings endpoint — far more data than priceguide
    const reverbRes = await fetch(
      `https://api.reverb.com/api/listings?query=${query}&condition=used&per_page=10`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.REVERB_API}`,
          'Accept': 'application/hal+json',
          'Accept-Version': '3.0',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!reverbRes.ok) {
      console.error('Reverb API error:', reverbRes.status, reverbRes.statusText);
      return 0;
    }

    const reverbData = await reverbRes.json();
    const listings = reverbData.listings as Array<{ price: { amount: string; currency: string } }> | undefined;

    if (!listings || listings.length === 0) {
      console.log(`No Reverb listings for: ${brand} ${cleanName}`);
      return 0;
    }

    // Extract all USD prices, filter out garbage values
    const usdPrices = listings
      .map((l) => parseFloat(l.price.amount))
      .filter((p) => !isNaN(p) && p > 10 && p < 10000);

    if (usdPrices.length === 0) return 0;

    // Use median to avoid skew from outliers
    const sorted = [...usdPrices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianUsd =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    console.log(
      `Reverb: ${brand} ${cleanName} — ${usdPrices.length} listings, median $${medianUsd.toFixed(2)} USD`
    );

    const exchangeRate = await getUsdToPhpRate();
    return Math.round((medianUsd * exchangeRate) / 50) * 50;

  } catch (error) {
    console.error('Pricing fetch failed:', error);
    return 0;
  }
}