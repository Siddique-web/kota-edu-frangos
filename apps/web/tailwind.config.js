/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coal: { DEFAULT: '#111111', 950: '#0a0a0a', 900: '#141414', 800: '#1a1a1a', 700: '#222222', 600: '#2b2b2b', 500: '#3a3a3a' },
        ember: { DEFAULT: '#DC2626', 400: '#F05252', 500: '#DC2626', 600: '#B91C1C', 700: '#991B1B' },
        gold: { DEFAULT: '#F59E0B', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },
      },
      fontFamily: {
        display: ['Oswald', 'Impact', 'Haettenschweiler', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        ember: '0 8px 30px -8px rgba(220,38,38,0.55)',
        gold: '0 8px 30px -10px rgba(245,158,11,0.45)',
      },
      keyframes: {
        sheetUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        pop: { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        fadeUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-8px)' }, '75%': { transform: 'translateX(8px)' } },
        flame: { '0%,100%': { transform: 'scale(1) rotate(-2deg)' }, '50%': { transform: 'scale(1.12) rotate(2deg)' } },
      },
      animation: {
        sheetUp: 'sheetUp .28s cubic-bezier(.2,.8,.2,1)',
        pop: 'pop .18s ease-out',
        fadeUp: 'fadeUp .3s ease-out both',
        shake: 'shake .35s ease-in-out',
        flame: 'flame 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
