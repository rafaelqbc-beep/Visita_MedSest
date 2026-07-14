import type { Config } from 'tailwindcss'

/**
 * Design System MedSest Visita.
 * Paleta corporativa (azul marinho) — elegante, profissional, sem cores vibrantes.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F8F9FA',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#1A3A5C', // azul marinho profundo
          hover: '#152E4A',
        },
        secondary: '#2E6DA4', // azul médio
        accent: '#E8EEF4', // azul muito claro (hover)
        sidebar: {
          bg: '#1A3A5C',
          text: '#FFFFFF',
          muted: '#B8CCE0',
        },
        content: {
          DEFAULT: '#1C1C1E', // texto principal
          secondary: '#6B7280', // texto secundário
          label: '#374151',
        },
        border: '#E5E7EB',
        // Estados
        success: { DEFAULT: '#15803D', bg: '#F0FDF4' },
        warning: { DEFAULT: '#B45309', bg: '#FFFBEB' },
        info: { DEFAULT: '#1D4ED8', bg: '#EFF6FF' },
        error: { DEFAULT: '#B91C1C', bg: '#FEF2F2' },
        purple: { DEFAULT: '#6B21A8', bg: '#F5F3FF' }, // aguardando liberação
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        modal: '0 20px 40px rgba(0,0,0,0.15)',
      },
      letterSpacing: {
        tightish: '-0.01em',
      },
      spacing: {
        sidebar: '240px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
} satisfies Config
