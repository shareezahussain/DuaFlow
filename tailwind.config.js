/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: '#2f7b7e',
          dark:    '#1d4c4e',
          light:   '#36b3b7',
          muted:   '#b1f7f9',
        },
        gold: {
          DEFAULT: '#f39c12',
          dark:    '#e67e22',
        },
        surface: '#f0f4f8',
      },
      fontFamily: {
        arabic: ['Amiri', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
