import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg, #0f172a)',
        surface: 'var(--color-surface, #1e293b)',
        surfaceLight: 'var(--color-surface-light, #334155)',
        'surface-light': 'var(--color-surface-light, #334155)',
        border: 'var(--color-border, #334155)',
        'text-primary': 'var(--color-text-primary, #ffffff)',
        'text-secondary': 'var(--color-text-secondary, #94a3b8)',
        'text-muted': 'var(--color-text-muted, #64748b)',
        primary: '#38bdf8',
        accent: '#22c55e',
        danger: '#ef4444',
      },
      screens: {
        'xs': '375px',
      }
    },
  },
  plugins: [],
} satisfies Config
