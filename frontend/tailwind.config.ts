import type { Config } from 'tailwindcss';

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
    './store/**/*.{js,ts,jsx,tsx,mdx}',
    // Required: the avatar palette (lib/utils.ts) and column dot/tint classes
    // (lib/constants.ts) only ever appear as string literals here. Omit this
    // and Tailwind purges them, rendering avatars as white text on nothing.
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: {
          DEFAULT: token('surface'),
          muted: token('surface-muted'),
          sunken: token('surface-sunken'),
        },
        foreground: {
          DEFAULT: token('foreground'),
          muted: token('muted-foreground'),
          subtle: token('subtle-foreground'),
        },
        line: {
          DEFAULT: token('border'),
          strong: token('border-strong'),
        },
        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          soft: token('primary-soft'),
          foreground: token('primary-foreground'),
        },
        danger: {
          DEFAULT: token('danger'),
          soft: token('danger-soft'),
          foreground: token('danger-foreground'),
        },
        success: {
          DEFAULT: token('success'),
          soft: token('success-soft'),
          foreground: token('success-foreground'),
        },
        warning: {
          DEFAULT: token('warning'),
          soft: token('warning-soft'),
          foreground: token('warning-foreground'),
        },
        sidebar: {
          DEFAULT: token('sidebar'),
          hover: token('sidebar-hover'),
          foreground: token('sidebar-foreground'),
          'foreground-strong': token('sidebar-foreground-strong'),
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      ringColor: {
        DEFAULT: token('ring'),
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-2px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
