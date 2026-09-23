import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

export interface StepNavItem {
  label: string;
  /** False when a prerequisite is missing, with `reason` explaining why. */
  reachable: boolean;
  reason?: string;
  done: boolean;
}

/**
 * Vertical step list. Going back is always allowed; going forward needs the
 * steps that create the draft to be complete, because everything after them
 * saves against a trip id.
 */
export function StepNav({
  steps, current, onJump, className,
}: {
  steps: StepNavItem[];
  current: number;
  onJump: (index: number) => void;
  className?: string;
}) {
  return (
    <nav className={cn('lg:sticky lg:top-[92px]', className)} aria-label="Trip steps">
      <ol className="space-y-0.5">
        {steps.map((step, index) => {
          const active = index === current;
          const disabled = !step.reachable && !active;

          return (
            <li key={step.label}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onJump(index)}
                aria-current={active ? 'step' : undefined}
                title={disabled ? step.reason : undefined}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left',
                  'transition-all duration-200 ease-spring',
                  active && 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/20',
                  !active && !disabled && 'text-ink-soft hover:bg-sunk hover:text-ink',
                  disabled && 'cursor-not-allowed text-ink-faint/60',
                )}
              >
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-2xs font-semibold tnum',
                    'transition-colors duration-200',
                    active
                      ? 'gradient-brand text-white'
                      : step.done
                        ? 'bg-ok/15 text-ok'
                        : 'bg-sunk text-ink-faint ring-1 ring-inset ring-line-soft',
                  )}
                >
                  {step.done && !active ? <Icon name="check" size={12} strokeWidth={3} /> : index + 1}
                </span>

                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{step.label}</span>

                {disabled && <Icon name="lock" size={12} className="shrink-0 opacity-70" />}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
