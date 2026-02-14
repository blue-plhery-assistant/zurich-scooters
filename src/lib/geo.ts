export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000.0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function pointToSegmentM(
  plat: number,
  plng: number,
  alat: number,
  alng: number,
  blat: number,
  blng: number
): number {
  const ax = alng, ay = alat;
  const bx = blng, by = blat;
  const px = plng, py = plat;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) {
    return haversineM(plat, plng, alat, alng);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const projLng = ax + t * dx;
  const projLat = ay + t * dy;
  return haversineM(plat, plng, projLat, projLng);
}
