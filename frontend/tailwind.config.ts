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
        background: '#0f172a',
        surface: '#1e293b',
        surfaceLight: '#334155',
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
