/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070B12',
          900: '#0B1020',
          850: '#10182A',
          800: '#172033',
          700: '#26344E',
          600: '#516079',
          500: '#7D8AA3',
        },
        paper: {
          50: '#FFF8EA',
          100: '#F7EBD3',
          200: '#E8D4AF',
          300: '#B9935F',
          700: '#4B3420',
          900: '#20150D',
        },
        aurora: {
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0369A1',
        },
        ember: {
          300: '#F9C56D',
          400: '#F59E0B',
          500: '#D97706',
          600: '#92400E',
        },
        violet: {
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          700: '#5B21B6',
        },
        success: '#34D399',
        danger: '#FB7185',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        studio: '1rem',
        console: '1.35rem',
        deck: '1.75rem',
      },
      boxShadow: {
        glow: '0 0 40px rgba(56, 189, 248, .2)',
        ember: '0 16px 40px rgba(245, 158, 11, .2)',
        panel: '0 24px 80px rgba(0, 0, 0, .26), inset 0 1px 0 rgba(255, 255, 255, .06)',
        paper: '0 30px 70px rgba(0, 0, 0, .24), inset 0 1px 0 rgba(255, 255, 255, .65)',
      },
      animation: {
        'slow-pulse': 'slow-pulse 5s ease-in-out infinite',
        'rise-in': 'rise-in .32s cubic-bezier(.2,.8,.2,1) both',
        'float-in': 'float-in .55s cubic-bezier(.2,.8,.2,1) both',
      },
      keyframes: {
        'slow-pulse': {
          '0%, 100%': { opacity: '.55' },
          '50%': { opacity: '.9' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float-in': {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
