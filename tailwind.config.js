/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Every colour is a CSS variable, so light and dark are one definition.
        ground: 'rgb(var(--c-ground) / <alpha-value>)',
        'ground-deep': 'rgb(var(--c-ground-deep) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        sunk: 'rgb(var(--c-sunk) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-soft': 'rgb(var(--c-line-soft) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        'ink-faint': 'rgb(var(--c-ink-faint) / <alpha-value>)',

        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          2: 'rgb(var(--c-brand-2) / <alpha-value>)',
          ink: 'rgb(var(--c-brand-ink) / <alpha-value>)',
          soft: 'rgb(var(--c-brand-soft) / <alpha-value>)',
        },
        // Reserved for money and data.
        ember: {
          DEFAULT: 'rgb(var(--c-ember) / <alpha-value>)',
          soft: 'rgb(var(--c-ember-soft) / <alpha-value>)',
        },
        ok: { DEFAULT: 'rgb(var(--c-ok) / <alpha-value>)', soft: 'rgb(var(--c-ok-soft) / <alpha-value>)' },
        warn: { DEFAULT: 'rgb(var(--c-warn) / <alpha-value>)', soft: 'rgb(var(--c-warn-soft) / <alpha-value>)' },
        danger: { DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)', soft: 'rgb(var(--c-danger-soft) / <alpha-value>)' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '18px',
        xl2: '22px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--c-shadow) / 0.08), 0 10px 30px -14px rgb(var(--c-shadow) / 0.32)',
        lift: '0 2px 6px rgb(var(--c-shadow) / 0.10), 0 28px 56px -24px rgb(var(--c-shadow) / 0.45)',
        glow: '0 0 0 1px rgb(var(--c-brand) / 0.28), 0 10px 40px -12px rgb(var(--c-brand) / 0.40)',
        pop: '0 10px 34px -10px rgb(var(--c-shadow) / 0.35)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(.96) translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        sheen: { '0%': { transform: 'translateX(-120%) skewX(-18deg)' }, '100%': { transform: 'translateX(220%) skewX(-18deg)' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(18px) scale(.97)' }, to: { opacity: '1', transform: 'none' } },
        'bar-slide': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(400%)' } },
        'bob': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0) rotate(var(--tilt,0deg))' },
          '33%': { transform: 'translate3d(6px,-14px,0) rotate(calc(var(--tilt,0deg) + 5deg))' },
          '66%': { transform: 'translate3d(-8px,-6px,0) rotate(calc(var(--tilt,0deg) - 4deg))' },
        },
      },
      animation: {
        'fade-up': 'fade-up .38s cubic-bezier(.16,1,.3,1) both',
        'fade-in': 'fade-in .22s ease both',
        'pop-in': 'pop-in .18s cubic-bezier(.16,1,.3,1) both',
        float: 'float 5s ease-in-out infinite',
        sheen: 'sheen 1.1s cubic-bezier(.2,.7,.3,1)',
        'slide-in': 'slide-in .28s cubic-bezier(.16,1,.3,1) both',
        'bar-slide': 'bar-slide 1.1s cubic-bezier(.65,0,.35,1) infinite',
        bob: 'bob 6s ease-in-out infinite',
        drift: 'drift var(--dur,14s) ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.16,1,.3,1)',
      },
    },
  },
  plugins: [],
};
