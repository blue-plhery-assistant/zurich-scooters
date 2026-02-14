'use client';

import dynamic from 'next/dynamic';
import type { Vehicle } from '@/lib/types';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

interface MapWrapperProps {
  vehicles: Vehicle[];
  origin: [number, number];
  destination: [number, number] | null;
  corridorWidth: number;
  enabledProviders: Set<string>;
  minBattery: number;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <MapComponent {...props} />;
}
