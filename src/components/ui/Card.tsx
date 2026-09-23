import { cn } from '@/lib/cn';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card bg-surface ring-1 ring-inset ring-line-soft', className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow, title, action, className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-[22px] font-bold leading-tight tracking-tight">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line-soft', className)} />;
}
