
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#003344',
        'background-accent': '#014D57',
        button: '#D97706',
        'button-dark': '#B45309',
        secondary: '#1976D2',
        'secondary-dark': '#1565C0',
        copy: '#FFFFFF',
        'copy-soft': '#E0F7FA',
        heading: '#D7A86E',
        neutral: '#F0F0F0',
        'neutral-dark': '#D9D9D9',
        'box-accent': '#A9C8A4',
      },
    },
  },
  plugins: [],
}
