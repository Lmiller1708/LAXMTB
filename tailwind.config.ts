import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app.vue',
    './pages/**/*.vue',
    './modules/**/*.vue',
    './components/**/*.vue'
  ],
  theme: {
    extend: {
      colors: {
        lax: {
          red: '#dc2626',
          darkRed: '#b91c1c',
          yellow: '#f59e0b',
          green: '#10b981',
          bgDark: '#0d0d0d',
          surfaceDark: '#171717',
          borderDark: '#262626'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        teko: ['Teko', 'sans-serif']
      }
    }
  }
} satisfies Config
