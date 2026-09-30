import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

/**
 * A map of one point, drawn from raster tiles laid out by hand.
 *
 * No mapping library: this is a grid of <img> tiles and a pin, which is all a
 * banner needs. Leaflet would add forty kilobytes and a pan/zoom surface that
 * would fight the page for a scroll on a phone. Plain images also mean the
 * service worker caches them like any other picture, so a place you have opened
 * before still draws its map with no connection.
 *
 * Tiles come from OpenStreetMap — the same project behind the geocoder that
 * fills these coordinates in, under the same attribution. Their tile policy
 * asks that heavy use go elsewhere; swapping TILES below is the whole change if
 * this ever outgrows a personal project.
 */
const TILE = 256;

const TILES = {
  url: (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  attribution: '© OpenStreetMap',
};

/** Longitude/latitude to world pixels at a zoom, the standard Web Mercator. */
function project(lat: number, lon: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale,
    span: 2 ** zoom,
  };
}

export function StaticMap({
  lat, lon, zoom = 13, label, className,
}: {
  lat: number;
  lon: number;
  zoom?: number;
  /** Used for the link out and the image alt text. */
  label: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // The banner is fluid, so the number of tiles is only knowable once it has
  // been laid out.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.ceil(width), h: Math.ceil(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const centre = project(lat, lon, zoom);
  const originX = centre.x - size.w / 2;
  const originY = centre.y - size.h / 2;

  const firstCol = Math.floor(originX / TILE);
  const firstRow = Math.floor(originY / TILE);
  const offsetX = firstCol * TILE - originX;
  const offsetY = firstRow * TILE - originY;
  const cols = size.w ? Math.ceil((size.w - offsetX) / TILE) : 0;
  const rows = size.h ? Math.ceil((size.h - offsetY) / TILE) : 0;

  const tiles: Array<{ key: string; src: string; left: number; top: number }> = [];
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const y = firstRow + row;
      // Above the pole or below it there is no tile; across the date line there
      // is, so x wraps rather than clamps.
      if (y < 0 || y >= centre.span) continue;
      const x = ((firstCol + col) % centre.span + centre.span) % centre.span;
      tiles.push({
        key: `${x}:${y}`,
        src: TILES.url(zoom, x, y),
        left: offsetX + col * TILE,
        top: offsetY + row * TILE,
      });
    }
  }

  return (
    <div ref={box} className={cn('relative overflow-hidden bg-sunk', className)}>
      {tiles.map((tile) => (
        <img
          key={tile.key}
          src={tile.src}
          alt=""
          aria-hidden
          loading="eager"
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            left: tile.left, top: tile.top, width: TILE, height: TILE,
            // Only the sheet is recoloured in dark mode; the pin and the
            // attribution keep their own colours on top of it.
            filter: 'var(--map-filter)',
          }}
        />
      ))}

      {/* Marks the point itself, which is the centre of the box by construction. */}
      {size.w > 0 && (
        <span
          className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-full place-items-center"
          aria-hidden
        >
          <span className="grid h-9 w-9 place-items-center rounded-full rounded-bl-sm gradient-brand text-white shadow-[0_4px_12px_-2px_rgb(0_0_0/0.45)] ring-2 ring-white/80 [transform:rotate(-45deg)]">
            <span className="[transform:rotate(45deg)]">
              <Icon name="pin" size={17} strokeWidth={2.2} />
            </span>
          </span>
        </span>
      )}

      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`}
        target="_blank"
        rel="noreferrer noopener"
        title={`${label} on OpenStreetMap`}
        className="absolute bottom-1 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70"
      >
        {TILES.attribution}
      </a>
    </div>
  );
}
