import { NextRequest, NextResponse } from 'next/server';
import { haversineM } from '@/lib/geo';
import type { Vehicle } from '@/lib/types';

interface ProviderDef {
  url: string;
  version: number;
}

const PROVIDERS: Record<string, ProviderDef> = {
  bolt: {
    url: 'https://api.mobidata-bw.de/sharing/gbfs/v3/bolt_zurich/vehicle_status',
    version: 3,
  },
  bird: {
    url: 'https://mds.bird.co/gbfs/v2/public/zurich/free_bike_status.json',
    version: 2,
  },
  dott: {
    url: 'https://gbfs.api.ridedott.com/public/v2/zurich/free_bike_status.json',
    version: 2,
  },
  lime: {
    url: 'https://api.mobidata-bw.de/sharing/gbfs/v2/lime_zurich/free_bike_status',
    version: 2,
  },
  voi: {
    url: 'https://api.mobidata-bw.de/sharing/gbfs/v2/voi_ch/free_bike_status',
    version: 2,
  },
};

const ZURICH_BBOX = { latMin: 47.32, latMax: 47.43, lngMin: 8.45, lngMax: 8.60 };

interface RawVehicle {
  lat?: number;
  lon?: number;
  lng?: number;
  current_fuel_percent?: number;
  current_range_meters?: number;
  bike_id?: string;
  vehicle_id?: string;
  id?: string;
  rental_uris?: { ios?: string; android?: string };
}

async function fetchProvider(name: string, info: ProviderDef): Promise<Vehicle[]> {
  try {
    const res = await fetch(info.url, {
      headers: { 'User-Agent': 'scooters-web/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const payload = await res.json();

    const raw: RawVehicle[] =
      info.version === 3
        ? payload?.data?.vehicles ?? []
        : payload?.data?.bikes ?? [];

    const vehicles: Vehicle[] = [];
    for (const v of raw) {
      const lat = v.lat;
      const lon = v.lon ?? v.lng;
      if (lat == null || lon == null) continue;

      if (name === 'voi') {
        if (lat < ZURICH_BBOX.latMin || lat > ZURICH_BBOX.latMax || lon < ZURICH_BBOX.lngMin || lon > ZURICH_BBOX.lngMax) continue;
      }

      const fuelPct = v.current_fuel_percent;
      const battery = fuelPct != null ? Math.round(fuelPct * 100) : null;
      const rangeM = v.current_range_meters != null ? Math.round(Number(v.current_range_meters)) : null;
      const rentalUris = v.rental_uris ?? {};
      const deepLink = rentalUris.ios || rentalUris.android || null;

      vehicles.push({
        provider: name,
        lat,
        lng: lon,
        battery,
        range_m: rangeM,
        vehicle_id: v.bike_id ?? v.vehicle_id ?? v.id ?? null,
        deep_link: deepLink,
        distance_m: 0,
      });
    }
    return vehicles;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '47.376');
  const lng = parseFloat(searchParams.get('lng') ?? '8.528');
  const radius = parseFloat(searchParams.get('radius') ?? '500');
  const minBattery = parseInt(searchParams.get('minBattery') ?? '0', 10);
  const providerFilter = searchParams.get('provider')?.split(',').map(p => p.trim().toLowerCase());

  const targets = providerFilter
    ? Object.entries(PROVIDERS).filter(([k]) => providerFilter.includes(k))
    : Object.entries(PROVIDERS);

  const results = await Promise.all(
    targets.map(([name, info]) => fetchProvider(name, info))
  );

  let vehicles = results.flat();

  // Calculate distance and filter
  vehicles = vehicles
    .map(v => ({ ...v, distance_m: Math.round(haversineM(lat, lng, v.lat, v.lng) * 10) / 10 }))
    .filter(v => v.distance_m <= radius)
    .filter(v => minBattery === 0 || (v.battery !== null && v.battery >= minBattery))
    .sort((a, b) => a.distance_m - b.distance_m);

  const providers: Record<string, number> = {};
  for (const v of vehicles) {
    providers[v.provider] = (providers[v.provider] ?? 0) + 1;
  }

  return NextResponse.json(
    { vehicles, providers },
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } }
  );
}
