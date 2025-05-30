
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: '#001f2f',
        'background-top': '#004050',
        'box-accent': '#67937e',
        'dropdown-bg': '#67937e',
        'button-primary': '#c25e2c',
        'button-hover': '#9b451e',
        'voice-button': '#d6b56c',
        heading: '#d6b56c',
        copy: '#ffffff',
        'copy-soft': '#f5f5f5',
        border: '#d9d9d9'
      },
      fontFamily: {
        heading: ['"Cinzel Decorative"', 'serif'],
        body: ['"Inter"', 'sans-serif']
      },
    },
  },
  plugins: [],
}
