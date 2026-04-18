/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a5276',
          dark: '#1a1a2e',
          light: '#2e86c1',
          muted: '#a9cce3',
        },
        gold: '#f39c12',
      },
      fontFamily: {
        arabic: ['Amiri', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
