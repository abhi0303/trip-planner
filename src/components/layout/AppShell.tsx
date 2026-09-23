import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { ErrorBoundary } from './ErrorBoundary';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  authOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/explore', label: 'Explore', icon: 'compass' },
  { to: '/create', label: 'Create', icon: 'plus', authOnly: true },
  { to: '/saved', label: 'Saved', icon: 'bookmark', authOnly: true },
];

export function AppShell() {
  const { user, signedIn, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = NAV.filter((item) => !item.authOnly || signedIn);
  const profileTo = user ? `/@${user.username}` : '/login';

  return (
    <div className="min-h-dvh">
      <TopBar />

      <div className="mx-auto flex w-full max-w-[1600px] gap-8 px-5 sm:px-8 xl:gap-10 xl:px-10">
        {/* Desktop rail. On mobile the floating dock takes over. */}
        <aside className="sticky top-[76px] hidden h-[calc(100dvh-76px)] w-[228px] shrink-0 flex-col py-7 lg:flex">
          <nav className="flex flex-col gap-1">
            {items.map((item) => <RailLink key={item.to} {...item} />)}
            <RailLink to={profileTo} label="Profile" icon="user" />
          </nav>

          {signedIn && (
            <div className="mt-6 space-y-1.5">
              <Button to="/create" className="w-full" size="md">
                <Icon name="sparkle" size={17} />
                New trip
              </Button>
              <Button to="/posts/new" variant="ghost" size="sm" className="w-full">
                <Icon name="send" size={15} />
                Share a post
              </Button>
            </div>
          )}

          <div className="mt-auto space-y-1 border-t border-line-soft pt-4">
            <RailLink to="/settings" label="Settings" icon="settings" />
            {signedIn && (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/', { replace: true });
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium',
                  'text-ink-soft transition-all duration-200 ease-spring',
                  'hover:bg-danger/10 hover:text-danger active:scale-[.98]',
                )}
              >
                <Icon name="logout" size={20} />
                Log out
              </button>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-28 pt-5 lg:pb-14 lg:pt-7">
          {/* Keyed on the path so a crash on one page clears when you navigate. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <MobileDock items={items} profileTo={profileTo} />
    </div>
  );
}

function RailLink({ to, label, icon }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium',
          'transition-all duration-200 ease-spring',
          isActive
            ? 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/20'
            : 'text-ink-soft hover:bg-sunk hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full gradient-brand" />
          )}
          <Icon name={icon} size={20} strokeWidth={isActive ? 2.1 : 1.75} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function TopBar() {
  const navigate = useNavigate();
  const { user, signedIn, loading } = useAuth();
  const { resolved, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled ? 'glass border-b border-line-soft' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto grid h-[76px] w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 sm:gap-8 sm:px-8 xl:px-10">
        <NavLink to="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white shadow-[0_4px_14px_-6px_rgb(var(--c-brand)/0.9)] transition-transform duration-500 ease-spring group-hover:rotate-[20deg]">
            <Icon name="compass" size={19} strokeWidth={2.1} />
          </span>
          <span className="hidden font-display text-[19px] font-bold tracking-tight sm:block">
            Trip<span className="text-gradient">Sphere</span>
          </span>
        </NavLink>

        <form
          className="relative mx-auto w-full max-w-[560px]"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <Icon name="search" size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search places, trips, people"
            aria-label="Search"
            className={cn(
              'h-11 w-full rounded-pill border border-line bg-surface/70 pl-11 pr-4 text-sm',
              'placeholder:text-ink-faint transition-all duration-200 ease-spring',
              'hover:border-ink-faint focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20',
            )}
          />
        </form>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            onClick={toggle}
            aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition-all duration-200 ease-spring hover:bg-sunk hover:text-ink active:scale-90"
          >
            <Icon name={resolved === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>

          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-sunk" />
          ) : signedIn && user ? (
            <Avatar user={user} size="sm" ring />
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</Button>
              <Button to="/register" size="sm">Sign up</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Floating dock — reads as part of the app rather than a browser chrome bar. */
function MobileDock({ items, profileTo }: { items: NavItem[]; profileTo: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 10) {
        setHidden(y > lastY && y > 140);
        lastY = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(14px,env(safe-area-inset-bottom))] lg:hidden',
        'transition-all duration-300 ease-spring',
        hidden && 'pointer-events-none translate-y-[140%] opacity-0',
      )}
    >
      <div className="glass flex items-center gap-1 rounded-pill border border-line-soft p-1.5 shadow-lift">
        {items.map((item) => <DockLink key={item.to} {...item} />)}
        <DockLink to={profileTo} label="Profile" icon="user" />
      </div>
    </nav>
  );
}

function DockLink({ to, label, icon }: NavItem) {
  const isCreate = icon === 'plus';

  if (isCreate) {
    return (
      <NavLink
        to={to}
        aria-label={label}
        className="grid h-11 w-11 place-items-center rounded-full gradient-brand text-white shadow-[0_6px_18px_-6px_rgb(var(--c-brand)/0.9)] transition-transform duration-200 ease-spring active:scale-90"
      >
        <Icon name="plus" size={20} strokeWidth={2.4} />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'grid h-11 w-11 place-items-center rounded-full transition-all duration-200 ease-spring active:scale-90',
          isActive ? 'bg-brand/15 text-brand' : 'text-ink-faint hover:text-ink',
        )
      }
    >
      {({ isActive }) => <Icon name={icon} size={21} strokeWidth={isActive ? 2.2 : 1.8} filled={isActive && icon === 'bookmark'} />}
    </NavLink>
  );
}
