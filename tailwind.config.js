/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './views/**/*.html',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        slate: { 850: '#1e293b', 950: '#020617' },
        emerald: { 450: '#10b981' }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: [require('@tailwindcss/line-clamp')]
};
