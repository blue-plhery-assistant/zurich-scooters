'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  tileLayer: 'dark' | 'light' | 'osm';
  onOriginChange: (lat: number, lng: number) => void;
  onDestinationChange: (lat: number, lng: number) => void;
  onDestinationClear: () => void;
  onRadiusChange: (r: number) => void;
  onMinBatteryChange: (b: number) => void;
  onCorridorWidthChange: (w: number) => void;
  onProviderToggle: (p: string) => void;
  onRefresh: () => void;
  onTileLayerChange: (t: 'dark' | 'light' | 'osm') => void;
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
  tileLayer,
  onOriginChange,
  onDestinationChange,
  onDestinationClear,
  onRadiusChange,
  onMinBatteryChange,
  onCorridorWidthChange,
  onProviderToggle,
  onRefresh,
  onTileLayerChange,
}: ControlsPanelProps) {
  const [collapsed, setCollapsed] = useState(true); // default collapsed, expanded on desktop via CSS
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originResults, setOriginResults] = useState<GeoResult[]>([]);
  const [destResults, setDestResults] = useState<GeoResult[]>([]);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Expand by default on desktop
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setCollapsed(false);
    }
  }, []);

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

  const toggleButton = (
    <button
      onClick={() => setCollapsed(!collapsed)}
      className="controls-toggle"
      aria-label={collapsed ? 'Open controls' : 'Close controls'}
    >
      {collapsed ? (
        <span className="flex items-center gap-2">
          <span className="text-base">🛴</span>
          <span>{totalCount} scooter{totalCount !== 1 ? 's' : ''}</span>
          {loading && <span>⏳</span>}
        </span>
      ) : (
        <span>✕</span>
      )}
    </button>
  );

  return (
    <div className="controls-container">
      {toggleButton}

      <div className={`controls-panel ${collapsed ? 'controls-panel-hidden' : 'controls-panel-visible'}`}>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          🛴 Scooters Nearby
        </h2>

        {/* Origin */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Origin</label>
          <input
            type="text"
            value={originQuery}
            onChange={e => handleOriginInput(e.target.value)}
            placeholder="Search address..."
            className="ctrl-input"
          />
          {originResults.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 max-h-32 overflow-y-auto shadow-sm">
              {originResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onOriginChange(r.lat, r.lng);
                    setOriginQuery(r.display_name.split(',')[0]);
                    setOriginResults([]);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs truncate text-gray-700"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-400">
            {origin[0].toFixed(4)}, {origin[1].toFixed(4)}
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Destination <span className="text-gray-400">(corridor)</span>
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              value={destQuery}
              onChange={e => handleDestInput(e.target.value)}
              placeholder="Optional destination..."
              className="ctrl-input flex-1"
            />
            {destination && (
              <button
                onClick={() => { onDestinationClear(); setDestQuery(''); }}
                className="px-2 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200"
              >
                ✕
              </button>
            )}
          </div>
          {destResults.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 max-h-32 overflow-y-auto shadow-sm">
              {destResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onDestinationChange(r.lat, r.lng);
                    setDestQuery(r.display_name.split(',')[0]);
                    setDestResults([]);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs truncate text-gray-700"
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
            <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
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
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
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
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
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
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Providers</label>
          <div className="mt-1 space-y-1">
            {Object.entries(PROVIDERS).map(([key, cfg]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  checked={enabledProviders.has(key)}
                  onChange={() => onProviderToggle(key)}
                  className="accent-blue-500"
                />
                <span
                  className="w-4 h-4 rounded-full inline-block border-2 border-gray-300"
                  style={{ background: cfg.color }}
                />
                <span className="flex-1">{cfg.name}</span>
                <span className="text-gray-400 text-xs">{providerCounts[key] ?? 0}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tile Layer */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Map Style</label>
          <div className="mt-1 flex gap-1">
            {(['dark', 'light', 'osm'] as const).map(t => (
              <button
                key={t}
                onClick={() => onTileLayerChange(t)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tileLayer === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '🗺️ OSM'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats & Refresh */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-gray-500">
            {totalCount} scooter{totalCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs font-medium text-white"
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
