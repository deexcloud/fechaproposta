/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { canvas: '#f6f7f5', panel: '#ffffff', line: '#e8ebe7', ink: '#202720', muted: '#778078', accent: '#c9e56c' },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] },
      boxShadow: { soft: '0 16px 44px rgba(27, 39, 30, .08)' },
    },
  },
  plugins: [],
}
