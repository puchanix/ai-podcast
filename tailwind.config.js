/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#003344',              // Deep navy-teal
        'background-accent': '#014D57',     // Muted greenish teal
        button: '#FFA726',                  // Warm orange
        'button-dark': '#FB8C00',           // Darker orange
        secondary: '#1976D2',               // Soft blue
        'secondary-dark': '#1565C0',        // Darker blue
        copy: '#FFFFFF',
        'copy-soft': '#E0F7FA',
        heading: '#FFF8E1',
        neutral: '#F0F0F0',
        'neutral-dark': '#D9D9D9',
        'pantone-628': '#B8DDE1',
        'pantone-300': '#0072CE'
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
