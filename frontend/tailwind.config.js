import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/react-tailwindcss-datepicker/dist/index.esm.js"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fa',
          100: '#e4e8f0',
          200: '#c5d0e2',
          300: '#9cb1cf',
          400: '#6c8bb7',
          500: '#4a6da4',
          600: '#395689',
          700: '#2f4671',
          800: '#2a3b5c',
          900: '#26334f',
          950: '#1a2236',
        },
        'theme-cream': 'var(--color-cream, #F2EAE0)',
        'theme-mint': 'var(--color-mint, #B4D3D9)',
        'theme-lavender': 'var(--color-lavender, #BDA6CE)',
        'theme-purple': 'var(--color-purple, #9B8EC7)',
        cream: 'var(--color-cream, #F2EAE0)',
        mint: 'var(--color-mint, #B4D3D9)',
        lavender: 'var(--color-lavender, #BDA6CE)',
        purple: 'var(--color-purple, #9B8EC7)',
      }
    },
  },
  plugins: [typography],
}
