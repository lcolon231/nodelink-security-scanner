import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#844EEE',
          fg: '#ffffff',
          50: '#f5efff', 100: '#ebdfff', 200: '#d4bfff',
          500: '#844EEE', 600: '#6f3ad4', 700: '#5a2db0',
        },
        ink: { DEFAULT: '#0b0b0f', muted: '#6b6b78' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;