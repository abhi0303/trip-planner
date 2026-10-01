import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminUsers } from '@/api/queries';
import { adminApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { track } from '@/lib/busy';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL, isAdmin } from '@/lib/roles';
import { useAuth } from '@/store/auth';
import { Avatar, Badge, EmptyState, Skeleton } from '@/components/ui/Bits';
import { Card } from '@/components/ui/Card';
import { Dropdown } from '@/components/ui/Dropdown';
import { ErrorState } from '@/components/layout/States';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import type { AdminUser, UserStatus } from '@/api/types';

export function AdminUsers() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const { user: me } = useAuth();
  const admin = isAdmin(me);

  const filters = {
    q: params.get('q') || undefined,
    role: (params.get('role') as AdminUser['role']) || undefined,
    status: (params.get('status') as UserStatus) || undefined,
    limit: 25,
  };
  const users = useAdminUsers(filters);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const [suspending, setSuspending] = useState<AdminUser | null>(null);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => { event.preventDefault(); set('q', q.trim()); }}
        className="relative"
      >
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Username, name or email"
          className="pl-10"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        <Dropdown
          size="sm"
          className="w-[150px]"
          placeholder="Any role"
          value={params.get('role') ?? ''}
          onChange={(value) => set('role', value)}
          options={[{ value: '', label: 'Any role' },
            ...(['USER', 'MODERATOR', 'ADMIN'] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))]}
        />
        <Dropdown
          size="sm"
          className="w-[160px]"
          placeholder="Any status"
          value={params.get('status') ?? ''}
          onChange={(value) => set('status', value)}
          options={[{ value: '', label: 'Any status' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'SUSPENDED', label: 'Suspended' },
            { value: 'DEACTIVATED', label: 'Deactivated' }]}
        />
      </div>

      {users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : users.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[76px] rounded-xl2" />)}
        </div>
      ) : !users.data?.items.length ? (
        <EmptyState icon="users" title="Nobody matches" body="No account fits that search." />
      ) : (
        <ul className="space-y-2">
          {users.data.items.map((row) => (
            <UserRow
              key={row.id}
              row={row}
              canManage={admin}
              /* The only way to lock every admin out is to let one do this to
                 themselves, so the controls are simply absent on your own row. */
              isSelf={row.id === me?.id}
              onSuspend={() => setSuspending(row)}
            />
          ))}
        </ul>
      )}

      {suspending && <SuspendDialog row={suspending} onClose={() => setSuspending(null)} />}
    </div>
  );
}

function UserRow({
  row, canManage, isSelf, onSuspend,
}: {
  row: AdminUser;
  canManage: boolean;
  isSelf: boolean;
  onSuspend: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const changeRole = async (role: AdminUser['role']) => {
    setBusy(true);
    try {
      await track(adminApi.setRole(row.id, { role }));
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast(`${row.name} is now ${ROLE_LABEL[role].toLowerCase()}`, 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not change the role', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li>
      <Card className="flex items-center gap-3 p-3">
        <Avatar user={row} size="sm" link={false} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium">{row.name}</p>
            {row.status === 'SUSPENDED' && <Badge tone="warn">Suspended</Badge>}
            {row.role !== 'USER' && <Badge tone="ok">{ROLE_LABEL[row.role]}</Badge>}
            {isSelf && <Badge>You</Badge>}
          </div>
          <p className="truncate text-xs text-ink-faint">
            @{row.username}{row.email ? ` · ${row.email}` : ''}
          </p>
          <p className="mt-0.5 text-2xs text-ink-faint">
            {row.tripCount ?? 0} trips · {row.postCount ?? 0} posts
            {row.createdAt ? ` · joined ${formatDate(row.createdAt)}` : ''}
          </p>
        </div>

        {canManage && !isSelf && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Dropdown
              size="sm"
              className="w-[128px]"
              value={row.role}
              disabled={busy}
              onChange={(role) => changeRole(role as AdminUser['role'])}
              options={(['USER', 'MODERATOR', 'ADMIN'] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
            <button
              type="button"
              onClick={onSuspend}
              disabled={busy}
              aria-label={row.status === 'SUSPENDED' ? `Reinstate ${row.name}` : `Suspend ${row.name}`}
              title={row.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Icon name={row.status === 'SUSPENDED' ? 'retry' : 'lock'} size={16} />
            </button>
          </div>
        )}
      </Card>
    </li>
  );
}

function SuspendDialog({ row, onClose }: { row: AdminUser; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const reinstating = row.status === 'SUSPENDED';

  return (
    <ConfirmDialog
      open
      pending={pending}
      onClose={onClose}
      icon={reinstating ? 'retry' : 'lock'}
      tone={reinstating ? 'brand' : 'danger'}
      title={reinstating ? `Reinstate ${row.name}?` : `Suspend ${row.name}?`}
      body={reinstating
        ? 'They can sign in and post again straight away.'
        : 'They stay signed out and cannot post until reinstated. Their trips and posts stay where they are.'}
      confirmLabel={reinstating ? 'Reinstate' : 'Suspend'}
      onConfirm={async () => {
        setPending(true);
        try {
          await track(adminApi.setStatus(row.id, { status: reinstating ? 'ACTIVE' : 'SUSPENDED' }));
          await queryClient.invalidateQueries({ queryKey: ['admin'] });
          toast(reinstating ? 'Reinstated' : 'Suspended', 'success');
          onClose();
        } catch (error) {
          toast(error instanceof ApiError ? error.message : 'Could not update', 'error');
        } finally {
          setPending(false);
        }
      }}
    />
  );
}
