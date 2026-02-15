import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json([]);

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&countrycodes=ch`,
    {
      headers: { 'User-Agent': 'scooters-web/1.0 (personal)' },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) return NextResponse.json([]);
  const data = await res.json();
  return NextResponse.json(
    data.map((r: { lat: string; lon: string; display_name: string }) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      display_name: r.display_name,
    })),
    { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } }
  );
}
