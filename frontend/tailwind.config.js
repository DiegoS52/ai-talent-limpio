/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#1E1E1E',
        'primary-blue': '#2D89FF',
        'primary-green': '#3ECC72',
        'secondary-cyan': '#00E1FF',
        'secondary-orange': '#FF9100',
      }
    },
  },
  plugins: [],
} 