import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * The big page header. Web-centric by design: it carries the eyebrow, title,
 * a lead paragraph and an actions slot on one line at desktop width, and
 * stacks on small screens without losing anything.
 */
export function PageHero({
  eyebrow, title, lead, actions, stats, icon, className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: Array<{ label: string; value: string }>;
  icon?: IconName;
  className?: string;
}) {
  return (
    <header className={cn('hero-surface mb-7 px-6 py-8 ring-1 ring-inset ring-line-soft sm:px-9 sm:py-10', className)}>
      {/* Soft orb, purely atmospheric. */}
      <span
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/20 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <p className="eyebrow mb-3 flex items-center gap-2">
              {icon && <Icon name={icon} size={13} className="text-brand" />}
              {eyebrow}
            </p>
          )}

          <h1 className="text-[32px] font-bold leading-[1.06] tracking-tight sm:text-[42px]">
            {title}
          </h1>

          {lead && (
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-base">
              {lead}
            </p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <dl className="relative mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-line-soft pt-5">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="eyebrow mb-1">{stat.label}</dt>
              <dd className="tnum text-xl font-bold tracking-tight">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
