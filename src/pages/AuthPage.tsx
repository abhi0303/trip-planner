import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, NetworkError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Field';
import { Tabs } from '@/components/ui/Bits';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/store/auth';
import { FloatingStickers } from '@/components/layout/FloatingStickers';
import registerArt from '@/assets/create-account.png';
import loginArt from '@/assets/login.png';

type Mode = 'login' | 'register';

/**
 * One screen for both modes. The tab switches the route rather than local
 * state, so /login and /register stay linkable and the back button behaves.
 */
export function AuthPage({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [form, setForm] = useState({
    identifier: '', password: '', name: '', username: '', email: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Switching modes should not carry a stale failure across.
  useEffect(() => {
    setError(null);
    setFieldErrors([]);
  }, [mode]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors([]);

    try {
      if (mode === 'login') {
        await login(form.identifier.trim(), form.password);
      } else {
        await register({
          name: form.name.trim(),
          username: form.username.trim().toLowerCase(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });
      }
      navigate(mode === 'login' ? from : '/', { replace: true });
    } catch (caught) {
      if (caught instanceof NetworkError) {
        setError('Cannot reach the server. It may still be waking up — try again in a moment.');
      } else if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.fieldErrors);
      } else {
        setError(mode === 'login' ? 'Could not sign you in.' : 'Could not create your account.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[1120px] py-2 lg:py-8">
      <FloatingStickers />

      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_minmax(0,460px)] lg:gap-14">
        <Intro mode={mode} />

        {/* Only the form is carded — the left side sits on the page itself. */}
        <div className="rounded-xl2 bg-surface p-6 shadow-card ring-1 ring-inset ring-line-soft sm:p-8">
          <Tabs
            variant="pill"
            fill
            className="mb-7 w-full"
            value={mode}
            onChange={(next) => navigate(next === 'login' ? '/login' : '/register', { state: location.state })}
            tabs={[
              { value: 'login' as Mode, label: 'Log in' },
              { value: 'register' as Mode, label: 'Sign up' },
            ]}
          />

          <form onSubmit={submit} className="space-y-4">
            {mode === 'login' ? (
              <>
                <Field label="Email or username" required>
                  {(id) => (
                    <Input
                      id={id}
                      value={form.identifier}
                      onChange={set('identifier')}
                      autoComplete="username"
                      placeholder="you@example.com"
                      required
                    />
                  )}
                </Field>

                <Field label="Password" required>
                  {(id) => (
                    <PasswordInput
                      id={id}
                      value={form.password}
                      onChange={set('password')}
                      autoComplete="current-password"
                      required
                    />
                  )}
                </Field>
              </>
            ) : (
              <>
                <Field label="Name" required>
                  {(id) => (
                    <Input id={id} value={form.name} onChange={set('name')} autoComplete="name" required />
                  )}
                </Field>

                <Field label="Username" hint="letters, numbers, . or _" required>
                  {(id) => (
                    <Input
                      id={id}
                      value={form.username}
                      onChange={set('username')}
                      autoComplete="username"
                      pattern="[a-zA-Z0-9._]{3,30}"
                      required
                    />
                  )}
                </Field>

                <Field label="Email" required>
                  {(id) => (
                    <Input id={id} type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
                  )}
                </Field>

                <Field label="Password" hint="at least 8 characters" required>
                  {(id) => (
                    <PasswordInput
                      id={id}
                      value={form.password}
                      onChange={set('password')}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  )}
                </Field>
              </>
            )}

            {error && (
              <div
                className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger ring-1 ring-inset ring-danger/25"
                role="alert"
              >
                <p>{error}</p>
                {fieldErrors.length > 0 && (
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {fieldErrors.map((message) => <li key={message}>{message}</li>)}
                  </ul>
                )}
              </div>
            )}

            <Button type="submit" loading={busy} full size="lg" shine className="mt-1">
              {mode === 'login' ? 'Log in' : 'Create account'}
              <Icon name="arrowRight" size={18} />
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-ink-soft">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <Link to="/register" className="font-medium text-brand hover:underline">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-brand hover:underline">Log in</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Sits directly on the page — no panel behind it — so the cut-out illustration
 * reads as part of the background rather than a pasted tile.
 */
const INTRO: Record<Mode, { art: string; title: string; lead: string }> = {
  login: {
    art: loginArt,
    title: 'Welcome back',
    lead: 'Pick up where your travel record left off.',
  },
  register: {
    art: registerArt,
    title: 'Start your travel record',
    lead: 'Document the whole trip, not just the photos.',
  },
};

function Intro({ mode }: { mode: Mode }) {
  const { art, title, lead } = INTRO[mode];

  return (
    <aside className="order-first flex flex-col items-center text-center lg:items-start lg:text-left">
      <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
        {lead}
      </p>

      <div className="relative mt-6 w-full max-w-[300px] lg:mt-8 lg:max-w-[440px]">
        <span
          className="absolute inset-x-6 bottom-6 top-10 -z-10 rounded-[50%] bg-brand/20 blur-3xl"
          aria-hidden
        />
        <img
          key={mode}
          src={art}
          alt=""
          draggable={false}
          className="w-full animate-bob select-none"
        />
      </div>
    </aside>
  );
}
