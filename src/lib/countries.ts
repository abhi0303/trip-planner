/**
 * ISO 3166-1 alpha-2 codes — the API stores `homeCountry` and `countryCode` in
 * this form. `bbox` is [minLon, minLat, maxLon, maxLat], used to confine
 * geocoder lookups to the country the trip is in; a loose box is fine, since
 * it only has to keep "Ago" from returning villages in France.
 */
export const COUNTRIES: Array<{ code: string; name: string; bbox: Bbox }> = [
  { code: 'IN', name: 'India', bbox: [68.1, 6.5, 97.4, 35.7] },
  { code: 'TH', name: 'Thailand', bbox: [97.3, 5.6, 105.7, 20.5] },
  { code: 'ID', name: 'Indonesia', bbox: [95.0, -11.1, 141.1, 6.1] },
  { code: 'LK', name: 'Sri Lanka', bbox: [79.6, 5.9, 81.9, 9.9] },
  { code: 'NP', name: 'Nepal', bbox: [80.0, 26.3, 88.2, 30.5] },
  { code: 'BT', name: 'Bhutan', bbox: [88.7, 26.7, 92.2, 28.4] },
  { code: 'AE', name: 'United Arab Emirates', bbox: [51.5, 22.6, 56.4, 26.1] },
  { code: 'SG', name: 'Singapore', bbox: [103.6, 1.2, 104.1, 1.5] },
  { code: 'MY', name: 'Malaysia', bbox: [99.6, 0.8, 119.3, 7.4] },
  { code: 'VN', name: 'Vietnam', bbox: [102.1, 8.2, 109.5, 23.4] },
  { code: 'PH', name: 'Philippines', bbox: [116.9, 4.6, 126.6, 21.1] },
  { code: 'JP', name: 'Japan', bbox: [122.9, 24.0, 146.0, 45.6] },
  { code: 'KR', name: 'South Korea', bbox: [125.9, 33.1, 129.6, 38.6] },
  { code: 'CN', name: 'China', bbox: [73.5, 18.2, 134.8, 53.6] },
  { code: 'AU', name: 'Australia', bbox: [112.9, -43.7, 153.7, -10.0] },
  { code: 'NZ', name: 'New Zealand', bbox: [166.4, -47.3, 178.6, -34.4] },
  { code: 'GB', name: 'United Kingdom', bbox: [-8.7, 49.9, 1.8, 60.9] },
  { code: 'IE', name: 'Ireland', bbox: [-10.5, 51.4, -5.9, 55.4] },
  { code: 'FR', name: 'France', bbox: [-5.2, 41.3, 9.6, 51.1] },
  { code: 'DE', name: 'Germany', bbox: [5.9, 47.3, 15.0, 55.1] },
  { code: 'IT', name: 'Italy', bbox: [6.6, 35.3, 18.6, 47.1] },
  { code: 'ES', name: 'Spain', bbox: [-18.2, 27.6, 4.4, 43.8] },
  { code: 'PT', name: 'Portugal', bbox: [-9.6, 36.9, -6.2, 42.2] },
  { code: 'NL', name: 'Netherlands', bbox: [3.3, 50.7, 7.2, 53.6] },
  { code: 'CH', name: 'Switzerland', bbox: [5.9, 45.8, 10.5, 47.8] },
  { code: 'AT', name: 'Austria', bbox: [9.5, 46.4, 17.2, 49.0] },
  { code: 'GR', name: 'Greece', bbox: [19.3, 34.8, 28.3, 41.8] },
  { code: 'TR', name: 'Turkey', bbox: [25.6, 35.8, 44.8, 42.1] },
  { code: 'US', name: 'United States', bbox: [-168.0, 18.9, -66.9, 71.5] },
  { code: 'CA', name: 'Canada', bbox: [-141.0, 41.7, -52.6, 83.1] },
  { code: 'MX', name: 'Mexico', bbox: [-118.4, 14.5, -86.7, 32.7] },
  { code: 'BR', name: 'Brazil', bbox: [-74.0, -33.8, -34.8, 5.3] },
  { code: 'AR', name: 'Argentina', bbox: [-73.6, -55.1, -53.6, -21.8] },
  { code: 'ZA', name: 'South Africa', bbox: [16.5, -34.8, 32.9, -22.1] },
  { code: 'EG', name: 'Egypt', bbox: [24.7, 22.0, 36.9, 31.7] },
  { code: 'KE', name: 'Kenya', bbox: [33.9, -4.7, 41.9, 5.5] },
  { code: 'MA', name: 'Morocco', bbox: [-13.2, 27.7, -1.0, 35.9] },
];

/** [minLon, minLat, maxLon, maxLat] */
export type Bbox = [number, number, number, number];

export const countryBbox = (code: string | null | undefined): Bbox | undefined =>
  COUNTRIES.find((c) => c.code === (code ?? '').toUpperCase())?.bbox;

export const countryName = (code: string | null | undefined): string =>
  COUNTRIES.find((c) => c.code === (code ?? '').toUpperCase())?.name ?? (code ?? '');
