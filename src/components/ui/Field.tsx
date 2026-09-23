import { forwardRef, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

const CONTROL =
  'w-full bg-surface border border-line rounded-xl px-3.5 text-[15px] text-ink ' +
  'placeholder:text-ink-faint transition-all duration-200 ease-spring ' +
  'hover:border-ink-faint ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 ' +
  'disabled:opacity-60 disabled:bg-sunk';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => React.ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="flex items-baseline gap-1.5 text-[13px] font-medium text-ink">
          {label}
          {required && <span className="text-brand">*</span>}
          {hint && <span className="ml-auto text-2xs font-normal text-ink-faint">{hint}</span>}
        </label>
      )}
      {children(id)}
      {error && (
        <p className="text-[12.5px] text-danger" role="alert">{error}</p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'h-11', className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(CONTROL, 'py-3 leading-relaxed resize-y min-h-[104px]', className)}
        {...props}
      />
    );
  },
);

/** Money reads as money: currency mark inline, figures tabular. */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { symbol?: string }
>(function MoneyInput({ className, symbol = '₹', ...props }, ref) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-faint">
        {symbol}
      </span>
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        min={0}
        className={cn(CONTROL, 'h-11 pl-8 tnum', className)}
        {...props}
      />
    </div>
  );
});

/** Plain number control that keeps figures tabular (durations, counts). */
export const NumberInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function NumberInput({ className, ...props }, ref) {
    return <input ref={ref} type="number" className={cn(CONTROL, 'h-11 tnum', className)} {...props} />;
  },
);

/** Password field with a reveal toggle — the control is a real button, so it
 *  is reachable by keyboard and announces its state. */
export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(CONTROL, 'h-11 pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={0}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-faint transition-all duration-200 ease-spring hover:bg-sunk hover:text-ink active:scale-90"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={17} />
        </button>
      </div>
    );
  },
);
