/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { brand: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#172554' } },
      fontFamily: { display: ['"Bricolage Grotesque"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      keyframes: { arrive: { from: { opacity: '0', transform: 'translateX(-10px)' }, to: { opacity: '1', transform: 'none' } } },
      animation: { arrive: 'arrive .35s ease-out' },
      boxShadow: { card: '0 8px 30px rgba(15, 23, 42, .045)' },
    },
  },
  plugins: [],
};
