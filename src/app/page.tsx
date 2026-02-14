'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import MapWrapper from '@/components/MapWrapper';
import ControlsPanel from '@/components/ControlsPanel';
import type { Vehicle, ScooterResponse } from '@/lib/types';
import { PROVIDERS } from '@/lib/types';

const DEFAULT_ORIGIN: [number, number] = [47.376, 8.528];

export default function Home() {
  const [origin, setOrigin] = useState<[number, number]>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(500);
  const [minBattery, setMinBattery] = useState(0);
  const [corridorWidth, setCorridorWidth] = useState(80);
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(
    new Set(Object.keys(PROVIDERS))
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchScooters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: origin[0].toString(),
        lng: origin[1].toString(),
        radius: radius.toString(),
        minBattery: minBattery.toString(),
      });
      const res = await fetch(`/api/scooters?${params}`);
      const data: ScooterResponse = await res.json();
      setVehicles(data.vehicles);
      setProviderCounts(data.providers);
    } catch (e) {
      console.error('Failed to fetch scooters:', e);
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

  const filteredCount = useMemo(() => {
    return vehicles.filter(v => enabledProviders.has(v.provider)).length;
  }, [vehicles, enabledProviders]);

  return (
    <div className="w-screen h-screen relative">
      <MapWrapper
        vehicles={vehicles}
        origin={origin}
        destination={destination}
        corridorWidth={corridorWidth}
        enabledProviders={enabledProviders}
        minBattery={minBattery}
      />
      <ControlsPanel
        origin={origin}
        destination={destination}
        radius={radius}
        minBattery={minBattery}
        corridorWidth={corridorWidth}
        enabledProviders={enabledProviders}
        providerCounts={providerCounts}
        totalCount={filteredCount}
        loading={loading}
        onOriginChange={(lat, lng) => setOrigin([lat, lng])}
        onDestinationChange={(lat, lng) => setDestination([lat, lng])}
        onDestinationClear={() => setDestination(null)}
        onRadiusChange={setRadius}
        onMinBatteryChange={setMinBattery}
        onCorridorWidthChange={setCorridorWidth}
        onProviderToggle={handleProviderToggle}
        onRefresh={fetchScooters}
      />
    </div>
  );
}
