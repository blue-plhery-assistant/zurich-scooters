# 🛴 Scooters Nearby — Zurich

A mobile-friendly PWA showing nearby e-scooters from 6 providers on an interactive map.

**Live:** Deployed on Netlify

## Providers

| Provider | Color | Feed |
|----------|-------|------|
| Bolt | 🟢 Green | GBFS v3 via mobidata-bw |
| Bird | ⚫ Black | GBFS v2 via bird.co |
| Dott | 🟠 Orange | GBFS v2 via ridedott.com |
| Lime | 🟢 Lime | GBFS v2 via mobidata-bw |
| Voi | 🩷 Pink | GBFS v2 via mobidata-bw |
| Hopp | 🩵 Cyan | GBFS v2 via hopp.bike |

## Features

- **Interactive map** with Leaflet + OpenStreetMap / CARTO tiles (light, dark, OSM)
- **Geocoding** via Nominatim (address search for origin & destination)
- **Server-side GBFS fetching** — no CORS issues, API responses cached
- **Provider toggles**, battery filter, search radius slider
- **Corridor mode** — set a destination to find scooters along your route
- **Auto-fit** map bounds to visible results
- **PWA** — installable with offline-capable home screen launch, persists last search
- **Mobile-friendly** — bottom-sheet controls, safe-area support, `100dvh` layout

## Tech Stack

- Next.js 16 (App Router)
- TypeScript (strict)
- Tailwind CSS v4
- react-leaflet + Leaflet
- All GBFS feeds are free — no API keys needed

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

### `GET /api/scooters`

Returns scooters near a point, sorted by distance.

Query params:
- `lat`, `lng` — origin coordinates (default: Zurich center)
- `radius` — search radius in meters (default: 500)
- `minBattery` — minimum battery % (default: 0)
- `provider` — comma-separated filter (e.g., `bolt,lime`)

Response: `{ vehicles: Vehicle[], providers: Record<string, number> }`

### `GET /api/geocode`

Geocodes an address via Nominatim, restricted to Switzerland.

Query params:
- `q` — address to search

Response: `Array<{ lat, lng, display_name }>`

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── geocode/route.ts   # Nominatim proxy
│   │   └── scooters/route.ts  # GBFS aggregator
│   ├── globals.css            # Tailwind + custom controls CSS
│   ├── layout.tsx             # Root layout, PWA meta
│   └── page.tsx               # Main page, state management
├── components/
│   ├── ControlsPanel.tsx      # Search controls UI
│   ├── MapComponent.tsx       # Leaflet map (client-only)
│   └── MapWrapper.tsx         # Dynamic import wrapper (no SSR)
└── lib/
    ├── geo.ts                 # Haversine distance, point-to-segment
    └── types.ts               # Vehicle types, provider config
```
