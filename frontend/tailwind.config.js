/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#0b0d14',
        surface: '#12141d',
        brand: {
          50: '#fdf2f8',
          200: '#fbcfe8',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(236,72,153,0.18) 100%)',
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(139,92,246,0.35)',
        bubble: '0 2px 10px -2px rgba(0,0,0,0.35)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.25s ease-out',
        'pop-in': 'pop-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
