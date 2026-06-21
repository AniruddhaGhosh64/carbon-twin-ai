// Centralized calculation constants matching backend configuration

export const VEHICLE_FACTORS = {
  gasoline: 0.192,
  diesel: 0.232,
  hybrid: 0.109,
  electric: 0.053,
  none: 0.0
} as const;

export const TRANSIT_FACTOR = 0.04; // kg CO2e per km

export const FLIGHT_EMISSIONS_FACTOR = 0.15; // kg CO2e per passenger-km

export const MILES_TO_KM = 1.60934;
