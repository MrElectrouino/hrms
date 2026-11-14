/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // "blue" follows the Branding page: --brand-* are set at runtime (lib/branding.tsx);
      // the fallbacks below are Tailwind's default blue, so an unbranded app looks unchanged.
      colors: {
        blue: {
          50: 'rgb(var(--brand-50, 239 246 255) / <alpha-value>)',
          100: 'rgb(var(--brand-100, 219 234 254) / <alpha-value>)',
          200: 'rgb(var(--brand-200, 191 219 254) / <alpha-value>)',
          300: 'rgb(var(--brand-300, 147 197 253) / <alpha-value>)',
          400: 'rgb(var(--brand-400, 96 165 250) / <alpha-value>)',
          500: 'rgb(var(--brand-500, 59 130 246) / <alpha-value>)',
          600: 'rgb(var(--brand-600, 37 99 235) / <alpha-value>)',
          700: 'rgb(var(--brand-700, 29 78 216) / <alpha-value>)',
          800: 'rgb(var(--brand-800, 30 64 175) / <alpha-value>)',
          900: 'rgb(var(--brand-900, 30 58 138) / <alpha-value>)',
        },
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
