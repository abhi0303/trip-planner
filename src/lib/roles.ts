import type { UserProfile } from '@/api/types';

export type Role = UserProfile['role'];

/** Anyone who can open the admin area at all. */
export const isStaff = (user: Pick<UserProfile, 'role'> | null | undefined): boolean =>
  user?.role === 'MODERATOR' || user?.role === 'ADMIN';

/** Only an admin changes who someone is, or destroys a catalogue row. */
export const isAdmin = (user: Pick<UserProfile, 'role'> | null | undefined): boolean =>
  user?.role === 'ADMIN';

export const ROLE_LABEL: Record<Role, string> = {
  USER: 'User',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};
