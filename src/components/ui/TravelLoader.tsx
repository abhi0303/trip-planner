import { useId } from 'react';
import { cn } from '@/lib/cn';

/** Shared loop: the globe turns once per two laps of the plane, so frames repeat every 6.4s. */
const LAP = '3.2s';
const TURN = '6.4s';

/**
 * Loose continent outlines, drawn once per 26-unit tile (the globe's diameter)
 * so two tiles side by side scroll seamlessly. Rounded by a same-colour stroke.
 */
const LAND = [
  '20,23 23,21.5 27,21.8 29,23.5 27.5,25 28.5,26.5 26.5,28 25,27.2 24,29 22.2,28 21,26',
  '25,30 27.5,30.5 28.5,32.5 27.5,35.5 26,38.5 25,38 25.3,35 24.2,32.5',
  '32,22.5 35,21 39.5,21.5 43,23 44,25 41.5,26 39,25.5 37.5,27 35.5,26.5 33.5,27',
  '34,28.5 37,28.5 38.5,31 37.5,34.5 36,37 34.8,36.5 34.5,33.5 33,31',
  '40,35 43,34.5 44.2,36.5 42.5,38.2 40.2,37.8',
  '21,40 23,39.5 23.5,41 21.8,41.5',
];

/** Nose on +x, so animateMotion's rotate="auto" points it along the orbit. */
const PLANE =
  'M6 0C6-.8 5.2-1.1 4.4-1.1H1.4L-2-6h-1.4l2.2 4.9H-4l-1.2-1.7h-1l.8 2.8-.8 2.8h1L-4 1.1h2.8L-3.4 6H-2l3.4-4.9h3c.8 0 1.6-.3 1.6-1.1z';

/** Orbit around the globe, wide enough (ry 17 > r 13) that the plane never needs to pass behind it. */
const ORBIT = 'M4 32a28 17 0 1 0 56 0a28 17 0 1 0-56 0';

/**
 * The slow-network mark: a turning globe with a plane circling it. Drawn in
 * SVG with SMIL rather than shipped as a GIF so it takes the brand colours of
 * the current theme, stays sharp at any size, and weighs nothing.
 */
export function TravelLoader({ size = 56, className }: { size?: number; className?: string }) {
  // SVG ids are document-global; two loaders on one page must not share them.
  const id = useId().replace(/:/g, '');
  const ref = (name: string) => `url(#${name}-${id})`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0 overflow-visible', className)}
      data-travel-loader
      aria-hidden
    >
      <defs>
        <linearGradient id={`sea-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'rgb(var(--c-brand))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--c-brand-2))' }} />
        </linearGradient>
        <radialGradient id={`shade-${id}`} cx="0.32" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
        <clipPath id={`globe-${id}`}>
          <circle cx="32" cy="32" r="13" />
        </clipPath>
      </defs>

      {/* Twinkling stars around the scene. */}
      {[
        [9, 13, '0s'],
        [55, 9, '0.8s'],
        [57, 53, '1.6s'],
        [7, 49, '2.4s'],
      ].map(([cx, cy, begin]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.1" style={{ fill: 'rgb(var(--c-brand-2))' }} opacity="0.2">
          <animate attributeName="opacity" values="0.15;0.9;0.15" dur={LAP} begin={begin} repeatCount="indefinite" />
        </circle>
      ))}

      <g transform="rotate(-20 32 32)">
        {/* The flight path, dotted, and the fading trail that follows the plane. */}
        <path d={ORBIT} fill="none" strokeWidth="1" strokeLinecap="round" strokeDasharray="0.1 3.2" style={{ stroke: 'rgb(var(--c-ink-faint))' }} opacity="0.7" />
        <path d={ORBIT} pathLength={100} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="22 78" stroke={ref('sea')} opacity="0.75">
          <animate attributeName="stroke-dashoffset" from="22" to="-78" dur={LAP} repeatCount="indefinite" />
        </path>
      </g>

      {/* The globe: gradient sea, drifting land clipped to the disc, then light and shadow on top. */}
      <circle cx="32" cy="32" r="13" fill={ref('sea')} />
      <g clipPath={ref('globe')}>
        <g fill="#fff" stroke="#fff" strokeWidth="0.9" strokeLinejoin="round" opacity="0.34">
          <animateTransform attributeName="transform" type="translate" from="0 0" to="-26 0" dur={TURN} repeatCount="indefinite" />
          {LAND.map((points) => <polygon key={points} points={points} />)}
          <g transform="translate(26 0)">{LAND.map((points) => <polygon key={points} points={points} />)}</g>
        </g>
        <g fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.22">
          <ellipse cx="32" cy="32" rx="13" ry="4" />
          <ellipse cx="32" cy="32" rx="5" ry="13" />
        </g>
      </g>
      <circle cx="32" cy="32" r="13" fill={ref('shade')} />

      {/* The plane rides the same orbit, in the same rotated frame as the trail. */}
      <g transform="rotate(-20 32 32)">
        <path d={PLANE} style={{ fill: 'rgb(var(--c-brand-ink))' }}>
          <animateMotion dur={LAP} repeatCount="indefinite" rotate="auto" path={ORBIT} />
        </path>
      </g>
    </svg>
  );
}
