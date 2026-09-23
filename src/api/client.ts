import type { ApiErrorCode, Page } from './types';

const BASE = (import.meta.env.VITE_API_URL ?? 'https://tripsphere-api.onrender.com/api/v1').replace(/\/$/, '');

const ACCESS_KEY = 'ts.access';
const REFRESH_KEY = 'ts.refresh';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** class-validator messages, ready to show under the fields. */
  get fieldErrors(): string[] {
    return Array.isArray(this.details) ? (this.details as string[]) : [];
  }

  /** User-ready checklist returned by a failed publish. */
  get problems(): string[] {
    const details = this.details as { problems?: string[] } | undefined;
    return details?.problems ?? [];
  }

  get isAuth(): boolean {
    return this.status === 401;
  }
}

/** Raised when the API cannot be reached at all — distinct from a 4xx/5xx. */
export class NetworkError extends Error {
  constructor(message = 'Cannot reach the server.') {
    super(message);
    this.name = 'NetworkError';
  }
}

// ------------------------------------------------------------------- tokens

type Listener = () => void;
const listeners = new Set<Listener>();

export const tokens = {
  get access(): string | null {
    try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
  },
  get refresh(): string | null {
    try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
  },
  save(access: string, refresh: string) {
    try {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch { /* private mode — the session simply won't survive a reload */ }
    listeners.forEach((l) => l());
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch { /* ignore */ }
    listeners.forEach((l) => l());
  },
  onChange(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// ------------------------------------------------------------------ refresh

/**
 * Refresh tokens are single-use, so two concurrent 401s must not each call
 * /auth/refresh — the second would replay a token the first already burned.
 * Everyone awaits the same in-flight promise instead.
 */
let refreshing: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const token = tokens.refresh;
      if (!token) return false;

      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: token }),
        });
        if (!res.ok) {
          tokens.clear();
          return false;
        }
        const payload = await res.json();
        const next = payload?.data?.tokens ?? payload?.data;
        if (!next?.accessToken) {
          tokens.clear();
          return false;
        }
        tokens.save(next.accessToken, next.refreshToken);
        return true;
      } catch {
        // A network blip should not sign the user out.
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// -------------------------------------------------------------------- fetch

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Internal: prevents an infinite refresh loop. */
  retry?: boolean;
};

async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const { body, retry = true, headers, ...rest } = options;
  const isForm = body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        // Always send the token when we have one: public endpoints read it to
        // fill in isLiked / isSaved / isFollowing and follower-only content.
        ...(tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
        ...(!isForm && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401 && retry && tokens.refresh) {
    if (await refreshOnce()) {
      return request(path, { ...options, retry: false });
    }
  }
  return res;
}

async function parse(res: Response): Promise<any> {
  if (res.status === 204) return null;
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error = payload?.error;
    throw new ApiError(
      res.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? `Request failed (${res.status})`,
      error?.details,
    );
  }
  return payload;
}

/** Unwraps `{ success, data }` so callers never see the envelope. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await parse(await request(path, options));
  return (payload?.data ?? null) as T;
}

/** For cursor- and offset-paginated endpoints, which also need `meta`. */
export async function apiPage<T>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
  const payload = await parse(await request(path, options));
  return {
    // Defensive: a non-list payload must degrade to an empty page rather than
    // throwing inside a render and blanking the screen.
    items: (Array.isArray(payload?.data) ? payload.data : []) as T[],
    nextCursor: payload?.meta?.nextCursor ?? null,
    hasMore: payload?.meta?.hasMore ?? false,
    total: payload?.meta?.total,
  };
}

/** Builds a query string, dropping empty values and expanding arrays to CSV. */
export function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
      return;
    }
    search.set(key, String(value));
  });
  const out = search.toString();
  return out ? `?${out}` : '';
}

export { BASE as API_BASE };
