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
          950: '#F8FAFC',
          900: '#F1F5F9',
          850: '#FFFFFF',
          800: '#E2E8F0',
          700: '#CBD5E1',
          600: '#64748B',
        },
        paper: {
          50: '#0F172A',
          100: '#1E293B',
          200: '#334155',
          300: '#64748B',
        },
        aurora: {
          300: '#2563EB',
          400: '#2563EB',
          500: '#1D4ED8',
          600: '#1E40AF',
        },
        ember: {
          300: '#2563EB',
          400: '#2563EB',
          500: '#1D4ED8',
          600: '#1E40AF',
        },
        violet: {
          300: '#7C3AED',
          400: '#7C3AED',
          500: '#6D28D9',
          700: '#4C1D95',
        },
        success: '#059669',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        studio: '1rem',
        console: '1.25rem',
      },
      boxShadow: {
        glow: '0 8px 24px rgba(15, 23, 42, .08)',
        ember: '0 8px 24px rgba(37, 99, 235, .14)',
        panel: '0 1px 3px rgba(15, 23, 42, .08), 0 10px 30px rgba(15, 23, 42, .06)',
      },
      animation: {
        'slow-pulse': 'slow-pulse 5s ease-in-out infinite',
        'rise-in': 'rise-in .28s ease-out both',
      },
      keyframes: {
        'slow-pulse': {
          '0%, 100%': { opacity: '.55' },
          '50%': { opacity: '.9' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
