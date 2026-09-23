import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export interface Option<T extends string = string> {
  value: T;
  label: string;
  /** Rendered before the label. */
  icon?: IconName;
  hint?: string;
  disabled?: boolean;
}

/**
 * A real listbox rather than a native <select>: it can be styled, animated and
 * given glyphs and hints, and it keeps full keyboard support (type-ahead,
 * arrows, Home/End, Enter, Escape). The panel is portalled and positioned from
 * the trigger rect so it never clips inside a scroll container or a modal.
 */
export function Dropdown<T extends string = string>({
  value, onChange, options, placeholder = 'Select…', id, className,
  searchable, disabled, size = 'md', align = 'start',
}: {
  value: T | undefined;
  onChange: (value: T) => void;
  options: ReadonlyArray<Option<T>>;
  placeholder?: string;
  id?: string;
  className?: string;
  searchable?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  const visible = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query, searchable]);

  const place = () => {
    if (trigger.current) setRect(trigger.current.getBoundingClientRect());
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onScrollOrResize = () => place();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    };

    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(Math.max(0, options.findIndex((option) => option.value === value)));
      if (searchable) requestAnimationFrame(() => searchInput.current?.focus());
    }
  }, [open, options, value, searchable]);

  const commit = (option: Option<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActive((index) => Math.min(visible.length - 1, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((index) => Math.max(0, index - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(visible.length - 1);
        break;
      case 'Enter':
        event.preventDefault();
        if (visible[active]) commit(visible[active]);
        break;
      default:
        break;
    }
  };

  const heights = { sm: 'h-9 text-[13px] px-3', md: 'h-11 text-[15px] px-3.5' };

  // Flip above the trigger when there is not enough room below.
  const below = rect ? window.innerHeight - rect.bottom : 0;
  const flip = rect ? below < 260 && rect.top > below : false;

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        className={cn(
          'group relative flex w-full items-center gap-2 rounded-xl border bg-surface text-left',
          'transition-all duration-200 ease-spring',
          'hover:border-ink-faint focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25',
          open ? 'border-brand ring-2 ring-brand/25' : 'border-line',
          'disabled:opacity-50 disabled:pointer-events-none',
          heights[size],
          className,
        )}
      >
        {selected?.icon && <Icon name={selected.icon} size={16} className="text-ink-soft" />}
        <span className={cn('flex-1 truncate', !selected && 'text-ink-faint')}>
          {selected?.label ?? placeholder}
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className={cn('text-ink-faint transition-transform duration-200', open && 'rotate-180 text-brand')}
        />
      </button>

      {open && rect && createPortal(
        <div
          ref={panel}
          role="listbox"
          onKeyDown={onKeyDown}
          className="fixed z-[70] animate-pop-in overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
          style={{
            left: align === 'end' ? undefined : rect.left,
            right: align === 'end' ? window.innerWidth - rect.right : undefined,
            top: flip ? undefined : rect.bottom + 6,
            bottom: flip ? window.innerHeight - rect.top + 6 : undefined,
            minWidth: rect.width,
            maxWidth: Math.max(rect.width, 280),
          }}
        >
          {searchable && (
            <div className="border-b border-line-soft p-1.5">
              <div className="relative">
                <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  ref={searchInput}
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setActive(0); }}
                  placeholder="Filter…"
                  className="h-8 w-full rounded-lg bg-sunk pl-8 pr-2 text-[13px] outline-none placeholder:text-ink-faint"
                />
              </div>
            </div>
          )}

          <ul className="max-h-[248px] overflow-y-auto p-1.5">
            {visible.length === 0 && (
              <li className="px-2.5 py-2 text-[13px] text-ink-faint">No matches</li>
            )}
            {visible.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => commit(option)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors',
                      index === active ? 'bg-sunk text-ink' : 'text-ink-soft',
                      isSelected && 'font-medium text-ink',
                      option.disabled && 'opacity-40',
                    )}
                  >
                    {option.icon && (
                      <Icon name={option.icon} size={16} className={isSelected ? 'text-brand' : 'text-ink-faint'} />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                      {option.hint && (
                        <span className="ml-1.5 text-2xs text-ink-faint">{option.hint}</span>
                      )}
                    </span>
                    {isSelected && <Icon name="check" size={15} className="text-brand" strokeWidth={2.4} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}
