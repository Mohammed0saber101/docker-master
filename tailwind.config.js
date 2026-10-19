/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070C18',
          900: '#0B1120',
          850: '#0E162A',
          800: '#121B31',
          700: '#18233D',
          600: '#22304F',
        },
        docker: {
          DEFAULT: '#2496ED',
          light: '#4FB3FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.04), 0 24px 60px -24px rgba(36,150,237,0.35)',
      },
      keyframes: {
        dash: { to: { strokeDashoffset: '-24' } },
        flow: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '40px 0' } },
      },
      animation: {
        dash: 'dash 1s linear infinite',
        flow: 'flow 0.8s linear infinite',
      },
    },
  },
  plugins: [],
};
