import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui/Icon';
import { isAdmin } from '@/lib/roles';
import { useAuth } from '@/store/auth';

const TABS: Array<{ to: string; label: string; icon: IconName; adminOnly?: boolean }> = [
  { to: '/admin', label: 'Overview', icon: 'grid' },
  { to: '/admin/users', label: 'Users', icon: 'users' },
  { to: '/admin/trips', label: 'Trips', icon: 'route' },
  { to: '/admin/places', label: 'Places', icon: 'pin' },
];

/**
 * The admin area's own frame. The tabs scroll sideways rather than wrap, which
 * keeps the header one line deep on a phone.
 */
export function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand ring-1 ring-inset ring-brand/20">
            <Icon name="shield" size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">Admin</h1>
            <p className="text-[13px] text-ink-soft">
              Signed in as {isAdmin(user) ? 'an admin' : 'a moderator'}
            </p>
          </div>
        </div>
      </header>

      <nav className="-mx-1 mb-6 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.filter((tab) => !tab.adminOnly || isAdmin(user)).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/admin'}
            className={({ isActive }) => cn(
              'flex shrink-0 items-center gap-2 rounded-pill border px-3.5 py-2 text-[13.5px] font-medium transition-all duration-200 ease-spring active:scale-95',
              isActive
                ? 'border-transparent gradient-brand text-white shadow-[0_4px_14px_-6px_rgb(var(--c-brand)/0.9)]'
                : 'border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink',
            )}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
