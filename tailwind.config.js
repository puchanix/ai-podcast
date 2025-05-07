/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#008F95',       // Pantone 323
        'background-dark': '#007A84', // Darker shade for hover or accents
        button: '#003057',           // Pantone 295
        'button-dark': '#002646',    // Darker shade for active states
        copy: '#FFFFFF',             // White text
        neutral: '#F0F0F0',          // Light gray for panels/backgrounds
        'neutral-dark': '#D9D9D9',    // Slightly darker gray for borders
        'pantone-318': '#B2E5F2'
      },
      fontSize: {
        h1: ['2rem', { lineHeight: '2.5rem' }],   // 32px/40px
        h2: ['1.5rem', { lineHeight: '2rem' }],   // 24px/32px
        base: ['1rem', { lineHeight: '1.5rem' }], // 16px/24px
        sm: ['0.875rem', { lineHeight: '1.25rem' }] // 14px/20px
      },
      spacing: {
        4: '1rem',   // 16px
        8: '2rem',   // 32px
        16: '4rem',  // 64px
        24: '6rem',  // 96px
        32: '8rem'   // 128px
      }
    }
  },
  plugins: []
};
