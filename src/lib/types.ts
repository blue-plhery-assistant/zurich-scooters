export interface Vehicle {
  provider: string;
  lat: number;
  lng: number;
  battery: number | null;
  range_m: number | null;
  vehicle_id: string | null;
  deep_link: string | null;
  distance_m: number;
}

export interface ScooterResponse {
  vehicles: Vehicle[];
  providers: Record<string, number>;
}

export interface ProviderConfig {
  name: string;
  color: string;
  initial: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  bolt: { name: 'Bolt', color: '#00cc44', initial: 'B' },
  bird: { name: 'Bird', color: '#222222', initial: 'Bi' },
  dott: { name: 'Dott', color: '#ff6600', initial: 'D' },
  lime: { name: 'Lime', color: '#32cd32', initial: 'L' },
  voi: { name: 'Voi', color: '#ff1493', initial: 'V' },
  hopp: { name: 'Hopp', color: '#00BCD4', initial: 'H' },
};
