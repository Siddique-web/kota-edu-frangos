/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        coal: { DEFAULT: '#111111', 950: '#0a0a0a', 900: '#141414', 800: '#1a1a1a', 700: '#222222', 600: '#2b2b2b', 500: '#3a3a3a' },
        ember: { DEFAULT: '#DC2626', 400: '#F05252', 600: '#B91C1C', 700: '#991B1B' },
        gold: { DEFAULT: '#F59E0B', 400: '#FBBF24', 600: '#D97706' },
      },
    },
  },
  plugins: [],
};
