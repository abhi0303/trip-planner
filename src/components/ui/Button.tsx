import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'glass';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'iconSm';

const VARIANTS: Record<Variant, string> = {
  // The gradient is the product's signature — only the primary action gets it.
  primary:
    'text-white gradient-brand shadow-[0_6px_20px_-8px_rgb(var(--c-brand)/0.7)] ' +
    'hover:brightness-110 hover:shadow-[0_10px_28px_-8px_rgb(var(--c-brand)/0.8)]',
  secondary: 'bg-sunk text-ink hover:bg-line-soft border border-line-soft',
  ghost: 'text-ink-soft hover:bg-sunk hover:text-ink',
  outline: 'border border-line text-ink bg-surface/60 hover:border-brand/50 hover:bg-surface',
  danger: 'bg-danger text-white hover:brightness-110',
  glass: 'glass border border-white/15 text-white hover:bg-white/15',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-14 px-8 text-base gap-2.5 rounded-2xl font-semibold',
  icon: 'h-11 w-11 rounded-xl',
  iconSm: 'h-9 w-9 rounded-lg',
};

const BASE =
  'relative inline-flex items-center justify-center font-medium whitespace-nowrap select-none ' +
  'transition-all duration-200 ease-spring active:scale-[.97] ' +
  'disabled:opacity-50 disabled:pointer-events-none';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Renders a react-router Link that looks identical. */
  to?: string;
  full?: boolean;
  /** Adds a light sweep on hover — for the one hero action on a screen. */
  shine?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, to, full, shine, className, children, disabled, ...props },
  ref,
) {
  const classes = cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    full && 'w-full',
    shine && 'group/btn overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-10px_rgb(var(--c-brand)/0.85)]',
    className,
  );

  const body = (
    <>
      {shine && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 group-hover/btn:animate-sheen group-hover/btn:opacity-100"
        />
      )}
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </>
  );

  if (to) {
    return <Link to={to} className={classes}>{body}</Link>;
  }

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
      {body}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Small circular control that floats over imagery. */
export function FloatButton({
  className, active, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md',
        'transition-all duration-200 ease-spring active:scale-90',
        active ? 'bg-white text-ink' : 'bg-black/35 text-white hover:bg-black/55',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
