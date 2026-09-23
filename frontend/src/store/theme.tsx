import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

/**
 * Persists the choice and writes `data-theme` on <html>. An inline script in
 * index.html applies the stored value before first paint.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('ts.theme') as Theme) ?? 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      delete root.dataset.theme;
      try { localStorage.removeItem('ts.theme'); } catch { /* ignore */ }
    } else {
      root.dataset.theme = theme;
      try { localStorage.setItem('ts.theme', theme); } catch { /* ignore */ }
    }
  }, [theme]);

  const resolved: 'light' | 'dark' =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme;

  const toggle = useCallback(() => {
    setThemeState(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved]);

  return { theme, resolved, setTheme: setThemeState, toggle };
}
