import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface Sticker {
  icon: IconName;
  /** Percentages, so the scatter holds at any viewport size. */
  top: string;
  left: string;
  size: number;
  tilt: number;
  duration: number;
  delay: number;
  tone: 'brand' | 'brand2' | 'ember';
}

/**
 * Hand-placed rather than randomised at runtime: a fresh random layout on
 * every render would shuffle on each re-render, and these are deliberately
 * kept out of the middle band where the form sits.
 */
const STICKERS: Sticker[] = [
  { icon: 'airport',     top: '7%',  left: '3%',  size: 30, tilt: -14, duration: 15, delay: 0,   tone: 'brand' },
  { icon: 'beach',       top: '4%',  left: '30%', size: 22, tilt: -10, duration: 14, delay: 1.1, tone: 'ember' },
  { icon: 'camera',      top: '30%', left: '2%',  size: 24, tilt: -8,  duration: 17, delay: 0.7, tone: 'brand2' },
  { icon: 'compass',     top: '57%', left: '5%',  size: 26, tilt: 6,   duration: 16, delay: 3.0, tone: 'brand2' },
  { icon: 'pin',         top: '79%', left: '9%',  size: 22, tilt: 9,   duration: 12, delay: 1.4, tone: 'ember' },
  { icon: 'calendar',    top: '90%', left: '26%', size: 22, tilt: 12,  duration: 13, delay: 2.1, tone: 'brand' },
  { icon: 'mountain',    top: '94%', left: '48%', size: 26, tilt: 7,   duration: 18, delay: 2.6, tone: 'brand' },
  { icon: 'activity',    top: '10%', left: '62%', size: 20, tilt: 8,   duration: 14, delay: 2.3, tone: 'brand' },
  { icon: 'backpacking', top: '6%',  left: '93%', size: 28, tilt: 11,  duration: 15, delay: 0.4, tone: 'brand2' },
  { icon: 'route',       top: '44%', left: '96%', size: 24, tilt: -6,  duration: 13, delay: 1.8, tone: 'brand' },
  { icon: 'star',        top: '74%', left: '94%', size: 20, tilt: 14,  duration: 12, delay: 3.4, tone: 'ember' },
  { icon: 'globe',       top: '92%', left: '80%', size: 26, tilt: -9,  duration: 16, delay: 0.9, tone: 'brand2' },
];

const TONES = {
  brand: 'text-brand/25',
  brand2: 'text-brand-2/25',
  ember: 'text-ember/25',
};

/** Ambient background layer. Decorative only — never interactive. */
export function FloatingStickers({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)} aria-hidden>
      {STICKERS.map((sticker, index) => (
        <span
          key={index}
          className={cn(
            'absolute animate-drift',
            TONES[sticker.tone],
            // Percentage positions compress on a phone, so anything in the
            // middle band would land on the copy. Edges only down there.
            parseFloat(sticker.left) > 18 && parseFloat(sticker.left) < 82 && 'hidden sm:block',
          )}
          style={{
            top: sticker.top,
            left: sticker.left,
            animationDelay: `${sticker.delay}s`,
            ['--dur' as string]: `${sticker.duration}s`,
            ['--tilt' as string]: `${sticker.tilt}deg`,
          }}
        >
          <Icon name={sticker.icon} size={sticker.size} strokeWidth={1.5} />
        </span>
      ))}
    </div>
  );
}
