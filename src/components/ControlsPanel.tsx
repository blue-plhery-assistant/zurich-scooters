'use client';

import { useState, useCallback, useRef } from 'react';
import { PROVIDERS } from '@/lib/types';

interface GeoResult {
  lat: number;
  lng: number;
  display_name: string;
}

interface ControlsPanelProps {
  origin: [number, number];
  destination: [number, number] | null;
  radius: number;
  minBattery: number;
  corridorWidth: number;
  enabledProviders: Set<string>;
  providerCounts: Record<string, number>;
  totalCount: number;
  loading: boolean;
  onOriginChange: (lat: number, lng: number) => void;
  onDestinationChange: (lat: number, lng: number) => void;
  onDestinationClear: () => void;
  onRadiusChange: (r: number) => void;
  onMinBatteryChange: (b: number) => void;
  onCorridorWidthChange: (w: number) => void;
  onProviderToggle: (p: string) => void;
  onRefresh: () => void;
}

export default function ControlsPanel({
  origin,
  destination,
  radius,
  minBattery,
  corridorWidth,
  enabledProviders,
  providerCounts,
  totalCount,
  loading,
  onOriginChange,
  onDestinationChange,
  onDestinationClear,
  onRadiusChange,
  onMinBatteryChange,
  onCorridorWidthChange,
  onProviderToggle,
  onRefresh,
}: ControlsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originResults, setOriginResults] = useState<GeoResult[]>([]);
  const [destResults, setDestResults] = useState<GeoResult[]>([]);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const geocode = useCallback(async (q: string, setter: (r: GeoResult[]) => void) => {
    if (q.length < 3) { setter([]); return; }
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setter(data);
    } catch {
      setter([]);
    }
  }, []);

  const handleOriginInput = (val: string) => {
    setOriginQuery(val);
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocode(val, setOriginResults), 500);
  };

  const handleDestInput = (val: string) => {
    setDestQuery(val);
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocode(val, setDestResults), 500);
  };

  return (
    <div className="absolute top-3 left-3 z-[1000] max-w-xs w-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="md:hidden mb-1 px-3 py-1.5 bg-gray-900/90 text-white rounded-lg text-sm font-medium backdrop-blur-sm"
      >
        {collapsed ? '☰ Controls' : '✕ Close'}
      </button>

      <div className={`${collapsed ? 'hidden md:block' : 'block'} bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 text-white text-sm shadow-xl space-y-3 max-h-[calc(100vh-80px)] overflow-y-auto`}>
        <h2 className="text-lg font-bold flex items-center gap-2">
          🛴 Scooters Nearby
        </h2>

        {/* Origin */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">Origin</label>
          <input
            type="text"
            value={originQuery}
            onChange={e => handleOriginInput(e.target.value)}
            placeholder="Search address..."
            className="w-full mt-1 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
          />
          {originResults.length > 0 && (
            <div className="mt-1 bg-gray-800 rounded-lg border border-gray-700 max-h-32 overflow-y-auto">
              {originResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onOriginChange(r.lat, r.lng);
                    setOriginQuery(r.display_name.split(',')[0]);
                    setOriginResults([]);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-xs truncate"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-0.5">
            {origin[0].toFixed(4)}, {origin[1].toFixed(4)}
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">
            Destination <span className="text-gray-600">(corridor mode)</span>
          </label>
          <div className="flex gap-1 mt-1">
            <input
              type="text"
              value={destQuery}
              onChange={e => handleDestInput(e.target.value)}
              placeholder="Optional destination..."
              className="flex-1 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
            />
            {destination && (
              <button
                onClick={() => { onDestinationClear(); setDestQuery(''); }}
                className="px-2 bg-red-900/50 rounded-lg text-xs hover:bg-red-800"
              >
                ✕
              </button>
            )}
          </div>
          {destResults.length > 0 && (
            <div className="mt-1 bg-gray-800 rounded-lg border border-gray-700 max-h-32 overflow-y-auto">
              {destResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onDestinationChange(r.lat, r.lng);
                    setDestQuery(r.display_name.split(',')[0]);
                    setDestResults([]);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-xs truncate"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Corridor Width */}
        {destination && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">
              Corridor: {corridorWidth}m
            </label>
            <input
              type="range"
              min={50}
              max={200}
              value={corridorWidth}
              onChange={e => onCorridorWidthChange(parseInt(e.target.value))}
              className="w-full mt-1 accent-blue-500"
            />
          </div>
        )}

        {/* Radius */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">
            Radius: {radius}m
          </label>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={radius}
            onChange={e => onRadiusChange(parseInt(e.target.value))}
            className="w-full mt-1 accent-blue-500"
          />
        </div>

        {/* Min Battery */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">
            Min Battery: {minBattery}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minBattery}
            onChange={e => onMinBatteryChange(parseInt(e.target.value))}
            className="w-full mt-1 accent-blue-500"
          />
        </div>

        {/* Provider Toggles */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">Providers</label>
          <div className="mt-1 space-y-1">
            {Object.entries(PROVIDERS).map(([key, cfg]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabledProviders.has(key)}
                  onChange={() => onProviderToggle(key)}
                  className="accent-blue-500"
                />
                <span
                  className="w-4 h-4 rounded-full inline-block border-2 border-white"
                  style={{ background: cfg.color }}
                />
                <span className="flex-1">{cfg.name}</span>
                <span className="text-gray-400 text-xs">{providerCounts[key] ?? 0}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Stats & Refresh */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-700">
          <span className="text-gray-400">
            {totalCount} scooter{totalCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs font-medium"
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
