import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import type { UserSummary } from '@/api/types';
import { Icon, type IconName } from './Icon';

// -------------------------------------------------------------------- badges

type Tone = 'neutral' | 'brand' | 'ember' | 'ok' | 'warn' | 'danger' | 'glass';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunk text-ink-soft ring-1 ring-inset ring-line-soft',
  brand: 'bg-brand/12 text-brand ring-1 ring-inset ring-brand/25',
  ember: 'bg-ember/12 text-ember ring-1 ring-inset ring-ember/25',
  ok: 'bg-ok/12 text-ok ring-1 ring-inset ring-ok/25',
  warn: 'bg-warn/12 text-warn ring-1 ring-inset ring-warn/25',
  danger: 'bg-danger/12 text-danger ring-1 ring-inset ring-danger/25',
  // Always dark: this tone only ever sits on top of imagery.
  glass: 'bg-black/45 text-white ring-1 ring-inset ring-white/25 backdrop-blur-md [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]',
};

export function Badge({
  tone = 'neutral', className, children, ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-[3px] text-2xs font-medium',
        TONES[tone], className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Selectable chip — travel styles, filters, rating targets. */
export function Chip({
  active, className, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-pill px-3.5 text-[13px] font-medium',
        'transition-all duration-200 ease-spring active:scale-95',
        active
          ? 'gradient-brand text-white shadow-[0_4px_14px_-6px_rgb(var(--c-brand)/0.8)]'
          : 'bg-surface text-ink-soft ring-1 ring-inset ring-line hover:ring-brand/40 hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------- avatars

const AVATAR_SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-[84px] w-[84px] text-2xl',
};

export function Avatar({
  user, size = 'md', className, link = true, ring,
}: {
  user: Pick<UserSummary, 'name' | 'username' | 'profileImage'>;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
  link?: boolean;
  /** Gradient halo — used where the person is the subject of the screen. */
  ring?: boolean;
}) {
  const inner = user.profileImage ? (
    <img
      src={user.profileImage}
      alt=""
      loading="lazy"
      className={cn('rounded-full object-cover bg-sunk', AVATAR_SIZES[size], className)}
    />
  ) : (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white',
        'gradient-brand',
        AVATAR_SIZES[size], className,
      )}
      aria-hidden
    >
      {initials(user.name)}
    </span>
  );

  const wrapped = ring ? (
    <span className="inline-block rounded-full bg-gradient-to-br from-brand to-brand-2 p-[2px]">
      <span className="block rounded-full bg-ground p-[2px]">{inner}</span>
    </span>
  ) : inner;

  if (!link) return wrapped;
  return (
    <Link to={`/@${user.username}`} className="shrink-0" aria-label={user.name}>
      {wrapped}
    </Link>
  );
}

// ------------------------------------------------------------------ feedback

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function EmptyState({
  icon = 'compass', title, body, action, illustration, className,
}: {
  icon?: IconName;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  /** When set, the illustration replaces the icon tile entirely. */
  illustration?: string;
  className?: string;
}) {
  if (illustration) {
    return (
      <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
        <div className="relative w-full max-w-[520px]">
          {/* Ambient bloom so the cut-out art sits in the page, not on it. */}
          <span
            className="absolute inset-x-4 bottom-8 top-10 -z-10 rounded-[50%] bg-brand/25 blur-3xl"
            aria-hidden
          />
          <img
            src={illustration}
            alt=""
            draggable={false}
            className={cn(
              'w-full animate-bob select-none',
              '[mask-image:linear-gradient(to_bottom,#000_60%,transparent_93%)]',
              '[-webkit-mask-image:linear-gradient(to_bottom,#000_60%,transparent_93%)]',
            )}
          />
        </div>

        {/* Pulled up so the copy and action sit inside the art's faded base. */}
        <div className="relative z-10 -mt-9 flex flex-col items-center gap-4">
          {/* The art carries the message — this line only labels it. */}
          <p className="text-[15px] font-medium text-ink-soft">{title}</p>
          {body && <p className="max-w-[420px] text-[13px] leading-relaxed text-ink-faint">{body}</p>}
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="relative mb-5">
        <span className="absolute inset-0 -z-10 block scale-150 rounded-full bg-brand/20 blur-3xl" aria-hidden />
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-surface text-brand ring-1 ring-inset ring-line-soft lit">
          <Icon name={icon} size={26} />
        </span>
      </div>
      <h3 className="mb-2 font-display text-xl font-semibold">{title}</h3>
      {body && <p className="mb-6 max-w-sm text-[15px] leading-relaxed text-ink-soft">{body}</p>}
      {action}
    </div>
  );
}

/** Star row. Accepts halves so a 4.5 average reads correctly. */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-[1px] text-ember', className)} aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        const key = `${i}-${Math.round(fill * 100)}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden>
            <defs>
              <linearGradient id={`star-${key}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity="0.22" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.6l2.47 5.2 5.53.78-4 4.05.95 5.77L10 14.7l-4.95 2.7.95-5.77-4-4.05 5.53-.78z"
              fill={`url(#star-${key})`}
            />
          </svg>
        );
      })}
    </span>
  );
}

/** Interactive 1-5 picker used throughout the ratings step. */
export function StarPicker({
  value, onChange, size = 24, label,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  size?: number;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={`${score} star${score > 1 ? 's' : ''}`}
          onClick={() => onChange(score)}
          className="p-0.5 transition-transform duration-150 ease-spring hover:scale-125 active:scale-95"
        >
          <svg
            width={size} height={size} viewBox="0 0 20 20" aria-hidden
            className={cn('transition-colors', value && score <= value ? 'text-ember' : 'text-line')}
          >
            <path
              d="M10 1.6l2.47 5.2 5.53.78-4 4.05.95 5.77L10 14.7l-4.95 2.7.95-5.77-4-4.05 5.53-.78z"
              fill="currentColor"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------- tabs

/**
 * The indicator is measured from the active trigger rather than assumed to be
 * an equal fraction, so tabs can be any width and still animate cleanly.
 */
export function Tabs<T extends string>({
  tabs, value, onChange, className, variant = 'underline', fill,
}: {
  tabs: ReadonlyArray<{ value: T; label: string; badge?: number | string; icon?: IconName }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  variant?: 'underline' | 'pill';
  /** Triggers share the full width — for a two-way switcher. */
  fill?: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const container = list.current;
    if (!container) return;

    const measure = () => {
      const active = container.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) return;
      setMarker({ left: active.offsetLeft, width: active.offsetWidth });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value, tabs]);

  const pill = variant === 'pill';

  return (
    <div
      ref={list}
      role="tablist"
      className={cn(
        'relative flex gap-1 overflow-x-auto hide-scrollbar',
        pill ? 'rounded-pill bg-sunk p-1 ring-1 ring-inset ring-line-soft' : 'border-b border-line-soft',
        className,
      )}
    >
      {marker && (
        <span
          aria-hidden
          className={cn(
            'absolute transition-all duration-300 ease-spring',
            pill
              ? 'inset-y-1 rounded-pill bg-surface shadow-pop'
              : 'bottom-0 h-[2px] rounded-full gradient-brand',
          )}
          style={{ left: marker.left, width: marker.width }}
        />
      )}

      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            data-active={active}
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative z-10 flex items-center gap-2 whitespace-nowrap text-sm font-medium',
              'transition-colors duration-200',
              fill ? 'flex-1 justify-center' : 'shrink-0',
              pill ? 'h-10 rounded-pill px-4' : 'px-4 py-3',
              active ? 'text-ink' : 'text-ink-faint hover:text-ink-soft',
            )}
          >
            {tab.icon && <Icon name={tab.icon} size={15} />}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'tnum rounded-pill px-1.5 py-px text-2xs transition-colors',
                  active ? 'bg-brand/12 text-brand' : 'text-ink-faint',
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Compact switcher for two or three mutually exclusive modes. */
export function Segmented<T extends string>({
  options, value, onChange, className,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <Tabs
      variant="pill"
      tabs={options}
      value={value}
      onChange={onChange}
      className={cn('w-fit', className)}
    />
  );
}

// ------------------------------------------------------------------ progress

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-pill bg-sunk', className)}>
      <div
        className="h-full rounded-pill gradient-brand transition-[width] duration-500 ease-spring"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
