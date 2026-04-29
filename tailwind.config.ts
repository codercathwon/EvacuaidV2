import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        ui:      ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        serif:   ['Instrument Serif', 'Georgia', 'serif'],
        code:    ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        mono:    ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--primary-foreground)',
        },
        border:  'var(--border)',
        input:   'var(--input)',
        ring:    'var(--ring)',
        sidebar: {
          DEFAULT:            'var(--sidebar)',
          foreground:         'var(--sidebar-foreground)',
          primary:            'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent:             'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border:             'var(--sidebar-border)',
          ring:               'var(--sidebar-ring)',
        },
      },
      borderRadius: {
        sm:   '8px',
        DEFAULT: '12px',
        lg:   '16px',
        xl:   '24px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        full: '9999px',
      },
      keyframes: {
        'sos-pulse-ring': {
          '0%':   { transform: 'scale(1)',    opacity: '0.6' },
          '100%': { transform: 'scale(1.18)', opacity: '0' },
        },
        'marker-pulse': {
          '0%':   { transform: 'scale(1)',   opacity: '0.7' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'slide-down': {
          from: { transform: 'translateY(-12px)', opacity: '0' },
          to:   { transform: 'translateY(0)',     opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'sos-pulse-ring': 'sos-pulse-ring 2.5s ease-in-out infinite',
        'marker-pulse':   'marker-pulse 1.5s ease infinite',
        'slide-down':     'slide-down 0.3s ease',
        'slide-up':       'slide-up 0.3s ease',
        'fade-in':        'fade-in 0.2s ease',
        shimmer:          'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
