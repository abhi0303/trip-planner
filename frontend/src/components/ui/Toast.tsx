import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

type ToastTone = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const TONES: Record<ToastTone, { icon: IconName; accent: string; tint: string }> = {
  info: { icon: 'info', accent: 'bg-brand', tint: 'bg-brand/12 text-brand' },
  success: { icon: 'check', accent: 'bg-ok', tint: 'bg-ok/12 text-ok' },
  error: { icon: 'warning', accent: 'bg-danger', tint: 'bg-danger/12 text-danger' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }].slice(-4));
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        /* Top right, clear of the header. Full width on a phone, where a
           right-anchored card would be cramped. */
        <div
          className="pointer-events-none fixed inset-x-4 top-[84px] z-[90] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-5 sm:w-[360px]"
          role="region"
          aria-live="polite"
        >
          {toasts.map((toast) => {
            const tone = TONES[toast.tone];
            return (
              <div
                key={toast.id}
                className={cn(
                  'pointer-events-auto relative flex animate-slide-in items-start gap-3 overflow-hidden',
                  'rounded-2xl bg-surface p-3.5 pl-4 shadow-lift ring-1 ring-inset ring-line-soft',
                )}
              >
                <span className={cn('absolute inset-y-0 left-0 w-1', tone.accent)} aria-hidden />

                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg', tone.tint)}>
                  <Icon name={tone.icon} size={15} strokeWidth={2.2} />
                </span>

                <p className="min-w-0 flex-1 pt-0.5 text-[13.5px] font-medium leading-snug text-ink">
                  {toast.message}
                </p>

                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="-mr-1 -mt-0.5 shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-sunk hover:text-ink"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
