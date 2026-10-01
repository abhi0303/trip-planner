import { Link } from 'react-router-dom';
import { useAdminStats } from '@/api/queries';
import { Skeleton } from '@/components/ui/Bits';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/layout/States';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** A number is only worth showing if it is clear what it counts. */
function Stat({
  label, value, hint, to, tone = 'plain', icon,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  to?: string;
  tone?: 'plain' | 'warn';
  icon?: IconName;
}) {
  const body = (
    <Card className={cn(
      'p-4 transition-all duration-200 ease-spring',
      to && 'hover:-translate-y-0.5 hover:shadow-lift',
      tone === 'warn' && value ? 'ring-1 ring-inset ring-warn/30' : '',
    )}>
      <div className="flex items-center gap-1.5">
        {icon && <Icon name={icon} size={13} className={tone === 'warn' && value ? 'text-warn' : 'text-ink-faint'} />}
        <p className="text-2xs uppercase tracking-[0.08em] text-ink-faint">{label}</p>
      </div>
      <p className={cn('tnum mt-1 text-[26px] font-bold leading-none', tone === 'warn' && value && 'text-warn')}>
        {value ?? '—'}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </Card>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function AdminDashboard() {
  const stats = useAdminStats();

  if (stats.isError) return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />;

  if (stats.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-xl2" />)}
      </div>
    );
  }

  const s = stats.data;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2.5 font-display text-base font-semibold">People</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Users" value={s?.users.total} icon="users" to="/admin/users" />
          <Stat label="Active" value={s?.users.active} to="/admin/users?status=ACTIVE" />
          <Stat label="Suspended" value={s?.users.suspended} tone="warn" to="/admin/users?status=SUSPENDED" />
          <Stat label="New" value={s?.users.newLast7Days} hint="last 7 days" />
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 font-display text-base font-semibold">Content</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Trips" value={s?.trips.total} icon="route" to="/admin/trips" />
          <Stat label="Published" value={s?.trips.published} to="/admin/trips?status=PUBLISHED" />
          <Stat label="Drafts" value={s?.trips.draft} to="/admin/trips?status=DRAFT" />
          <Stat label="Posts" value={s?.posts.total} icon="send" />
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 font-display text-base font-semibold">Catalogue</h2>
        <p className="mb-2.5 text-[13px] text-ink-soft">
          The two amber numbers are the repair queue — places a traveller typed that
          nothing can match against yet.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Places" value={s?.places.total} icon="pin" to="/admin/places" />
          <Stat
            label="No coordinates" value={s?.places.missingCoordinates} tone="warn" icon="warning"
            hint="cannot show a map" to="/admin/places?missingCoordinates=1"
          />
          <Stat
            label="Orphaned" value={s?.places.orphaned} tone="warn" icon="warning"
            hint="nothing points at them" to="/admin/places?orphaned=1"
          />
          <Stat label="Unverified" value={s?.places.unverified} to="/admin/places?unverified=1" />
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 font-display text-base font-semibold">Moderation</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pending reports" value={s?.reports.pending} tone="warn" icon="shield" />
        </div>
      </section>
    </div>
  );
}
