/**
 * Deterministic artwork for entities that have no photo yet. Seeding from the
 * id means a given trip or place always draws the same thing, so a grid never
 * reshuffles its colours between renders.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Curated palettes rather than a hue off the full wheel — an unconstrained
 * hash lands on olive and mustard often enough to look like a bug. Each entry
 * is three stops that read as a place: ocean, sunset, jungle, dusk, reef, dune.
 */
const PALETTES: Array<[string, string, string]> = [
  ['#0ea5b7', '#1e6fd9', '#0b2a5b'], // ocean
  ['#f97362', '#e0457b', '#5b1149'], // sunset
  ['#1fae7a', '#0d8a86', '#08322f'], // jungle
  ['#7b6cf6', '#4338ca', '#190f45'], // dusk
  ['#2dd4bf', '#3b82f6', '#0f2a4a'], // reef
  ['#f0a860', '#d9644b', '#4a1f2b'], // dune
  ['#5eb1ef', '#6366f1', '#141c47'], // monsoon
  ['#e26fa8', '#8b5cf6', '#2a1046'], // bloom
];

/** A soft three-stop mesh, used behind cover-less trip and place cards. */
export function meshGradient(seed: string): string {
  const [a, b, c] = PALETTES[hash(seed) % PALETTES.length];
  // A second hash decides the layout so two entities on the same palette
  // still look distinct.
  const flip = hash(`${seed}-layout`) % 2 === 0;

  return [
    `radial-gradient(at ${flip ? 18 : 78}% 20%, ${a} 0px, transparent 55%)`,
    `radial-gradient(at ${flip ? 84 : 22}% 8%, ${b} 0px, transparent 50%)`,
    `radial-gradient(at 50% 92%, ${c} 0px, transparent 60%)`,
    `linear-gradient(150deg, ${b}, ${c})`,
  ].join(', ');
}

/** A flat two-stop version for small tiles. */
export function meshTint(seed: string): string {
  const [a, b] = PALETTES[hash(seed) % PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

/**
 * Profile covers stay inside the brand family rather than drawing from the
 * full palette set — a stranger's banner turning up hot pink reads as a bug,
 * not as personality.
 */
const BRAND_COVERS: Array<[string, string, string]> = [
  ['#22d3ee', '#4f7df0', '#1b2b6b'],
  ['#38bdf8', '#6366f1', '#141c47'],
  ['#2dd4bf', '#3b82f6', '#102a4a'],
  ['#5eb1ef', '#818cf8', '#1c1f52'],
];

export function brandCover(seed: string): string {
  const [a, b, c] = BRAND_COVERS[hash(seed) % BRAND_COVERS.length];
  const flip = hash(`${seed}-cover`) % 2 === 0;

  return [
    `radial-gradient(at ${flip ? 12 : 82}% 12%, ${a} 0px, transparent 55%)`,
    `radial-gradient(at ${flip ? 74 : 26}% 84%, ${b} 0px, transparent 58%)`,
    `linear-gradient(115deg, ${b}, ${c})`,
  ].join(', ');
}
