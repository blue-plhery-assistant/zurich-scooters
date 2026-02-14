# 🛴 Scooters Nearby — Zurich

A web app showing nearby scooters from 5 providers on an interactive map.

## Providers

| Provider | Color | Feed |
|----------|-------|------|
| Bolt | 🟢 Green | GBFS v3 via mobidata-bw |
| Bird | ⚫ Black | GBFS v2 via bird.co |
| Dott | 🟠 Orange | GBFS v2 via ridedott.com |
| Lime | 🟢 Lime | GBFS v2 via mobidata-bw |
| Voi | 🩷 Pink | GBFS v2 via mobidata-bw |

## Features

- **Interactive map** with Leaflet + OpenStreetMap tiles
- **Geocoding** via Nominatim (address search)
- **Server-side GBFS fetching** (no CORS issues)
- **Provider toggles**, battery filter, radius control
- **Corridor mode**: set a destination to find scooters along your route
- **Auto-fit** map bounds to show all results
- **Mobile-friendly** with collapsible controls

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- react-leaflet + Leaflet
- All GBFS feeds are free, no API keys needed

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

### `GET /api/scooters`

Query params:
- `lat`, `lng` — origin coordinates (default: Zurich center)
- `radius` — search radius in meters (default: 500)
- `minBattery` — minimum battery % (default: 0)
- `provider` — comma-separated filter (e.g., `bolt,lime`)

### `GET /api/geocode`

Query params:
- `q` — address to geocode (uses Nominatim, restricted to Switzerland)
