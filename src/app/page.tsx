'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MapWrapper from '@/components/MapWrapper';
import ControlsPanel from '@/components/ControlsPanel';
import type { Vehicle, ScooterResponse } from '@/lib/types';
import { PROVIDERS } from '@/lib/types';
import { pointToSegmentM } from '@/lib/geo';

const ZURICH_CENTER: [number, number] = [47.3769, 8.5417];

function parseCoord(s: string | null): [number, number] | null {
  if (!s) return null;
  const parts = s.split(',').map(Number);
  if (parts.length === 2 && parts.every(n => isFinite(n))) return [parts[0], parts[1]];
  return null;
}

const STORAGE_KEY = 'scooters-params';

function saveParamsToStorage(params: Record<string, string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch {}
}

function loadParamsFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

interface UrlParams {
  origin: [number, number] | null;
  dest: [number, number] | null;
  radius: number | undefined;
  minBattery: number | undefined;
  tileLayer: 'dark' | 'light' | 'osm' | undefined;
  corridorWidth: number | undefined;
}

function readUrlParams(): UrlParams {
  if (typeof window === 'undefined') return { origin: null, dest: null, radius: undefined, minBattery: undefined, tileLayer: undefined, corridorWidth: undefined };
  const p = new URLSearchParams(window.location.search);
  const hasUrlParams = p.toString().length > 0;

  // If no URL params, try to restore from localStorage (PWA home screen launch)
  if (!hasUrlParams) {
    const stored = loadParamsFromStorage();
    if (Object.keys(stored).length > 0) {
      const sp = new URLSearchParams(stored);
      window.history.replaceState(null, '', `?${sp.toString()}`);
      return {
        origin: parseCoord(stored.origin ?? null),
        dest: parseCoord(stored.dest ?? null),
        radius: stored.radius ? parseInt(stored.radius) : undefined,
        minBattery: stored.minBattery ? parseInt(stored.minBattery) : undefined,
        tileLayer: (['dark', 'light', 'osm'] as const).includes(stored.tile as 'dark' | 'light' | 'osm')
          ? (stored.tile as 'dark' | 'light' | 'osm')
          : undefined,
        corridorWidth: stored.corridor ? parseInt(stored.corridor) : undefined,
      };
    }
  }

  return {
    origin: parseCoord(p.get('origin')),
    dest: parseCoord(p.get('dest')),
    radius: p.get('radius') ? parseInt(p.get('radius')!) : undefined,
    minBattery: p.get('minBattery') ? parseInt(p.get('minBattery')!) : undefined,
    tileLayer: (['dark', 'light', 'osm'] as const).includes(p.get('tile') as 'dark' | 'light' | 'osm')
      ? (p.get('tile') as 'dark' | 'light' | 'osm')
      : undefined,
    corridorWidth: p.get('corridor') ? parseInt(p.get('corridor')!) : undefined,
  };
}

export default function Home() {
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(500);
  const [minBattery, setMinBattery] = useState(0);
  const [corridorWidth, setCorridorWidth] = useState(80);
  const [tileLayer, setTileLayer] = useState<'dark' | 'light' | 'osm'>('light');
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(
    new Set(Object.keys(PROVIDERS))
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const initializedRef = useRef(false);

  // Read URL params and/or geolocate on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const params = readUrlParams();
    if (params.radius !== undefined) setRadius(params.radius);
    if (params.minBattery !== undefined) setMinBattery(params.minBattery);
    if (params.tileLayer) setTileLayer(params.tileLayer);
    if (params.corridorWidth !== undefined) setCorridorWidth(params.corridorWidth);
    if (params.dest) setDestination(params.dest);

    if (params.origin) {
      setOrigin(params.origin);
    } else {
      // Try browser geolocation
      setLocating(true);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setOrigin([pos.coords.latitude, pos.coords.longitude]);
            setLocating(false);
          },
          () => {
            setOrigin(ZURICH_CENTER);
            setLocating(false);
          },
          { timeout: 8000, enableHighAccuracy: false }
        );
      } else {
        setOrigin(ZURICH_CENTER);
        setLocating(false);
      }
    }
  }, []);

  // Sync state to URL + localStorage
  useEffect(() => {
    if (!origin) return;
    const p = new URLSearchParams();
    p.set('origin', `${origin[0].toFixed(4)},${origin[1].toFixed(4)}`);
    if (destination) p.set('dest', `${destination[0].toFixed(4)},${destination[1].toFixed(4)}`);
    if (radius !== 500) p.set('radius', String(radius));
    if (minBattery !== 0) p.set('minBattery', String(minBattery));
    if (tileLayer !== 'light') p.set('tile', tileLayer);
    if (corridorWidth !== 80) p.set('corridor', String(corridorWidth));
    const qs = p.toString();
    const newUrl = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);

    // Persist to localStorage for PWA home screen launches
    const stored: Record<string, string> = {};
    p.forEach((v, k) => { stored[k] = v; });
    saveParamsToStorage(stored);
  }, [origin, destination, radius, minBattery, tileLayer, corridorWidth]);

  const fetchScooters = useCallback(async () => {
    if (!origin) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: origin[0].toString(),
        lng: origin[1].toString(),
        radius: radius.toString(),
        minBattery: minBattery.toString(),
      });
      const res = await fetch(`/api/scooters?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScooterResponse = await res.json();
      setVehicles(data.vehicles);
      setProviderCounts(data.providers);
    } catch (e) {
      console.error('Failed to fetch scooters:', e);
      setError('Failed to load scooters. Tap refresh to retry.');
    } finally {
      setLoading(false);
    }
  }, [origin, radius, minBattery]);

  useEffect(() => {
    fetchScooters();
  }, [fetchScooters]);

  const handleProviderToggle = (p: string) => {
    setEnabledProviders(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  // Centralized filtering: provider, battery, and corridor
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles.filter(v => enabledProviders.has(v.provider));
    if (minBattery > 0) {
      filtered = filtered.filter(v => v.battery !== null && v.battery >= minBattery);
    }
    if (destination) {
      filtered = filtered.filter(v =>
        pointToSegmentM(v.lat, v.lng, origin![0], origin![1], destination[0], destination[1]) <= corridorWidth
      );
    }
    return filtered;
  }, [vehicles, enabledProviders, minBattery, destination, origin, corridorWidth]);

  // Show locating state
  if (!origin) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100" role="status">
        {locating && (
          <div className="text-center">
            <div className="text-4xl mb-3">📍</div>
            <div className="text-gray-600 font-medium">Locating…</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 w-full" style={{ height: '100dvh' }}>
      <MapWrapper
        vehicles={filteredVehicles}
        origin={origin}
        destination={destination}
        corridorWidth={corridorWidth}
        tileLayer={tileLayer}
      />
      <ControlsPanel
        origin={origin}
        destination={destination}
        radius={radius}
        minBattery={minBattery}
        corridorWidth={corridorWidth}
        enabledProviders={enabledProviders}
        providerCounts={providerCounts}
        totalCount={filteredVehicles.length}
        loading={loading}
        error={error}
        tileLayer={tileLayer}
        onOriginChange={(lat, lng) => setOrigin([lat, lng])}
        onDestinationChange={(lat, lng) => setDestination([lat, lng])}
        onDestinationClear={() => setDestination(null)}
        onRadiusChange={setRadius}
        onMinBatteryChange={setMinBattery}
        onCorridorWidthChange={setCorridorWidth}
        onProviderToggle={handleProviderToggle}
        onRefresh={fetchScooters}
        onTileLayerChange={setTileLayer}
      />
    </div>
  );
}
