'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Vehicle } from '@/lib/types';
import { PROVIDERS } from '@/lib/types';

function createScooterIcon(provider: string): L.DivIcon {
  const cfg = PROVIDERS[provider] ?? { color: '#999', initial: '?' };
  return L.divIcon({
    className: '',
    html: `<div style="background:${cfg.color};color:#fff;font:bold 11px sans-serif;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center">${cfg.initial}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createPinIcon(label: string, bg: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:#fff;font:bold 12px sans-serif;padding:5px 10px;border-radius:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.6);white-space:nowrap">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 16],
  });
}

function FitBounds({ vehicles, origin, destination }: {
  vehicles: Vehicle[];
  origin: [number, number];
  destination: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [origin];
    if (destination) points.push(destination);
    vehicles.forEach(v => points.push([v.lat, v.lng]));
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [vehicles, origin, destination, map]);
  return null;
}

function getCorridorPolygon(
  origin: [number, number],
  dest: [number, number],
  widthM: number
): [number, number][] {
  const [alat, alng] = origin;
  const [blat, blng] = dest;
  const dx = blng - alng;
  const dy = blat - alat;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return [];

  // Approximate degrees per meter
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(((alat + blat) / 2) * Math.PI / 180);
  const offsetLat = (widthM / mPerDegLat) * (dx / len);
  const offsetLng = (widthM / mPerDegLng) * (-dy / len);

  return [
    [alat + offsetLat, alng + offsetLng],
    [blat + offsetLat, blng + offsetLng],
    [blat - offsetLat, blng - offsetLng],
    [alat - offsetLat, alng - offsetLng],
  ];
}

const TILE_URLS: Record<string, string> = {
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

interface MapComponentProps {
  vehicles: Vehicle[];
  origin: [number, number];
  destination: [number, number] | null;
  corridorWidth: number;
  tileLayer: 'dark' | 'light' | 'osm';
}

export default function MapComponent({
  vehicles,
  origin,
  destination,
  corridorWidth,
  tileLayer,
}: MapComponentProps) {
  // Pre-create all provider icons (only 5 providers, stable across renders)
  const iconMap = useMemo(() => {
    const icons: Record<string, L.DivIcon> = {};
    for (const provider of Object.keys(PROVIDERS)) {
      icons[provider] = createScooterIcon(provider);
    }
    return icons;
  }, []);

  const corridorPoly = useMemo(() => {
    if (!destination) return null;
    return getCorridorPolygon(origin, destination, corridorWidth);
  }, [origin, destination, corridorWidth]);

  const originIcon = useMemo(() => createPinIcon('Origin', '#e63946'), []);
  const destIcon = useMemo(() => createPinIcon('Destination', '#1d3557'), []);

  return (
    <MapContainer
      center={origin}
      zoom={15}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        key={tileLayer}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url={TILE_URLS[tileLayer]}
        subdomains="abc"
      />

      <Marker position={origin} icon={originIcon} zIndexOffset={1000} />

      {destination && (
        <Marker position={destination} icon={destIcon} zIndexOffset={1000} />
      )}

      {corridorPoly && (
        <Polygon
          positions={corridorPoly}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2 }}
        />
      )}

      {vehicles.map((v, i) => (
        <Marker key={`${v.provider}-${v.vehicle_id}-${i}`} position={[v.lat, v.lng]} icon={iconMap[v.provider]}>
          <Popup>
            <div className="text-sm">
              <div className="font-bold" style={{ color: PROVIDERS[v.provider]?.color }}>
                {PROVIDERS[v.provider]?.name ?? v.provider}
              </div>
              <div>{Math.round(v.distance_m)}m away</div>
              {v.battery !== null && <div>Battery: {v.battery}%</div>}
              {v.range_m !== null && <div>Range: {(v.range_m / 1000).toFixed(1)}km</div>}
              {v.deep_link && (
                <a
                  href={v.deep_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 px-3 py-1 bg-blue-600 text-white rounded text-xs"
                >
                  Open in App
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      <FitBounds vehicles={vehicles} origin={origin} destination={destination} />
    </MapContainer>
  );
}
