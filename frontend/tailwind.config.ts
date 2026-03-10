import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A1628',
          900: '#0D1E35',
          800: '#1A2E4A',
          700: '#243A5C',
        },
        teal: {
          400: '#2DD4BF',
          500: '#00B4A6',
          600: '#0097A7',
        },
        amber: { 500: '#F5A623' },
        danger: { 500: '#E8455A' },
        muted: '#8A9BB0',
        surface: '#1A2E4A',
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        data: ['DM Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ripple: 'ripple 1.5s ease-out infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
