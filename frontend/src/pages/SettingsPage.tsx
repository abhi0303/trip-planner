import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usersApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { CURRENCY } from '@/api/types';
import { COUNTRIES } from '@/lib/countries';
import { cn } from '@/lib/cn';
import { brandCover } from '@/lib/visual';
import { initials } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Dropdown } from '@/components/ui/Dropdown';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { AvatarPicker, CoverPicker } from '@/components/ui/ImagePicker';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { useToast } from '@/components/ui/Toast';

const SECTIONS: Array<{ id: string; label: string; icon: IconName }> = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'appearance', label: 'Appearance', icon: 'sun' },
  { id: 'account', label: 'Account', icon: 'settings' },
];

export function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', username: '', bio: '', homeCountry: '', homeCity: '', websiteUrl: '', currency: 'INR',
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? '',
      username: user.username ?? '',
      bio: user.bio ?? '',
      homeCountry: user.homeCountry ?? '',
      homeCity: user.homeCity ?? '',
      websiteUrl: user.websiteUrl ?? '',
      currency: user.currency ?? 'INR',
    });
  }, [user]);

  if (!user) return null;

  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  /**
   * Images save the moment they are picked rather than waiting for the form's
   * save button — an upload that silently needed a second confirmation would
   * be lost the first time someone navigated away.
   */
  const saveImage = async (key: 'profileImage' | 'coverImage', url: string | null) => {
    try {
      // null clears it. An empty string fails the API's URL validation.
      setUser(await usersApi.updateMe({ [key]: url }));
      toast(url ? 'Picture updated' : 'Picture removed', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save that', 'error');
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      // Send only what changed — validation runs in whitelist mode, so a full
      // form spread would fail on any field the endpoint does not declare.
      const body: Record<string, string> = {};
      (Object.keys(form) as Array<keyof typeof form>).forEach((key) => {
        const value = form[key].trim();
        const normalised = key === 'username' ? value.toLowerCase() : value;
        if (normalised && normalised !== ((user as unknown as Record<string, unknown>)[key] ?? '')) {
          body[key] = normalised;
        }
      });

      if (!Object.keys(body).length) {
        toast('Nothing to save');
        return;
      }

      setUser(await usersApi.updateMe(body as never));
      toast('Profile updated', 'success');
    } catch (error) {
      setErrors(
        error instanceof ApiError
          ? error.fieldErrors.length ? error.fieldErrors : [error.message]
          : ['Could not save your profile.'],
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-10">
      <header className="mb-7">
        <Link
          to={`/@${user.username}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-brand"
        >
          <Icon name="arrowLeft" size={15} />
          Back to profile
        </Link>
        <h1 className="text-[30px] font-bold tracking-tight">Settings</h1>
      </header>

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        {/* Section rail — fills the space the old narrow column left empty. */}
        <nav className="mb-6 hidden lg:block">
          <ul className="sticky top-[92px] space-y-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium text-ink-soft transition-colors hover:bg-sunk hover:text-ink"
                >
                  <Icon name={section.icon} size={17} />
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          <Card id="profile" className="scroll-mt-24 p-6">
            <h2 className="mb-5 font-display text-lg font-semibold">Profile</h2>

            <div className="space-y-6">
              <CoverPicker
                value={user.coverImage ?? null}
                fallbackGradient={brandCover(user.id)}
                onChange={(url) => saveImage('coverImage', url)}
              />

              <AvatarPicker
                value={user.profileImage ?? null}
                fallback={initials(user.name)}
                onChange={(url) => saveImage('profileImage', url)}
              />
            </div>

            <hr className="my-6 border-line-soft" />

            <form onSubmit={save} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Name">
                  {(id) => <Input id={id} value={form.name} onChange={set('name')} maxLength={80} />}
                </Field>

                <Field label="Username" hint="letters, numbers, . or _">
                  {(id) => (
                    <Input id={id} value={form.username} onChange={set('username')} pattern="[a-zA-Z0-9._]{3,30}" />
                  )}
                </Field>
              </div>

              <Field label="Bio" hint={`${form.bio.length}/300`}>
                {(id) => <Textarea id={id} value={form.bio} onChange={set('bio')} rows={3} maxLength={300} />}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Home country">
                  {(id) => (
                    <Dropdown
                      id={id}
                      searchable
                      placeholder="Choose a country"
                      value={form.homeCountry || undefined}
                      onChange={(code) => setForm((current) => ({ ...current, homeCountry: code }))}
                      options={COUNTRIES.map((country) => ({ value: country.code, label: country.name }))}
                    />
                  )}
                </Field>
                <Field label="Home city">
                  {(id) => <Input id={id} value={form.homeCity} onChange={set('homeCity')} placeholder="Bengaluru" />}
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Website" hint="include https://">
                  {(id) => (
                    <Input id={id} type="url" value={form.websiteUrl} onChange={set('websiteUrl')} placeholder="https://" />
                  )}
                </Field>

                <Field label="Default currency" hint="for new trips">
                  {(id) => (
                    <Dropdown
                      id={id}
                      searchable
                      value={form.currency}
                      onChange={(currency) => setForm((current) => ({ ...current, currency }))}
                      options={CURRENCY.map((code) => ({ value: code, label: code }))}
                    />
                  )}
                </Field>
              </div>

              {errors.length > 0 && (
                <ul
                  className="space-y-0.5 rounded-xl bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger ring-1 ring-inset ring-danger/25"
                  role="alert"
                >
                  {errors.map((message) => <li key={message}>{message}</li>)}
                </ul>
              )}

              <Button type="submit" loading={busy}>Save changes</Button>
            </form>
          </Card>

          <Card id="appearance" className="scroll-mt-24 p-6">
            <h2 className="mb-1 font-display text-lg font-semibold">Appearance</h2>
            <p className="mb-4 text-[13px] text-ink-soft">Follows your system setting unless you pick one.</p>

            <div className="grid max-w-md grid-cols-3 gap-2">
              {([
                { value: 'light', label: 'Light', icon: 'sun' },
                { value: 'dark', label: 'Dark', icon: 'moon' },
                { value: 'system', label: 'System', icon: 'settings' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={theme === option.value}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl py-4 text-[13px] font-medium',
                    'ring-1 ring-inset transition-all duration-200 ease-spring active:scale-95',
                    theme === option.value
                      ? 'bg-brand/10 text-brand ring-brand/30'
                      : 'text-ink-soft ring-line hover:text-ink hover:ring-ink-faint',
                  )}
                >
                  <Icon name={option.icon} size={19} />
                  {option.label}
                </button>
              ))}
            </div>
          </Card>

          <Card id="account" className="scroll-mt-24 p-6">
            <h2 className="mb-1 font-display text-lg font-semibold">Account</h2>
            <p className="mb-4 text-[13px] text-ink-soft">
              Signed in as <span className="font-medium text-ink">{user.email ?? user.username}</span>
            </p>
            <Button variant="outline" onClick={signOut}>
              <Icon name="logout" size={15} /> Log out
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
