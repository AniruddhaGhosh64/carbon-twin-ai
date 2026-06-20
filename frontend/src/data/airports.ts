export interface Airport {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export const AIRPORTS: Airport[] = [
  { code: "CCU", name: "Netaji Subhash Chandra Bose", city: "Kolkata", lat: 22.6546, lng: 88.4467 },
  { code: "DEL", name: "Indira Gandhi International", city: "New Delhi", lat: 28.5562, lng: 77.1000 },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj", city: "Mumbai", lat: 19.0896, lng: 72.8656 },
  { code: "BLR", name: "Kempegowda International", city: "Bengaluru", lat: 13.1986, lng: 77.7066 }
];

// Haversine formula
export function calculateFlightDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export function calculateFlightEmissions(distanceKm: number, tripType: "one_way" | "round_trip"): number {
  // 0.15 kg CO2e per passenger-km
  const factor = 0.15;
  const multiplier = tripType === "round_trip" ? 2 : 1;
  return distanceKm * factor * multiplier;
}
