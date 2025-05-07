/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6EB5FF',      // Sky Blue
        'primary-dark': '#5AA0E6',
        accent: '#FFD166',       // Sunshine
        'accent-dark': '#E6BA53',
        secondary: '#F78DA7',    // Coral
        'secondary-dark': '#DD6C90',
        success: '#76EEC6',      // Mint
        neutral: '#FFFFFF',      // Off-White
        'neutral-dark': '#F0F0F0'// Soft Gray
      },
      fontSize: {
        h1: ['2rem', { lineHeight: '2.5rem' }],
        h2: ['1.5rem', { lineHeight: '2rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }]
      },
      spacing: {
        4: '1rem',
        8: '2rem',
        16: '4rem',
        24: '6rem',
        32: '8rem'
      }
    }
  },
  plugins: []
};
