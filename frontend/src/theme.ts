// frontend/src/theme.ts
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  globalCss: {
    body: {
      bg: '#1a1a2e',
      color: '#e2e8f0',
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#e6f0ff' },
          100: { value: '#b3d4ff' },
          200: { value: '#80b8ff' },
          300: { value: '#4d9cff' },
          400: { value: '#1a80ff' },
          500: { value: '#0066e6' },
          600: { value: '#0050b3' },
          700: { value: '#003a80' },
          800: { value: '#00254d' },
          900: { value: '#000f1a' },
        },
        surface: {
          bg: { value: '#16213e' },
          card: { value: '#1a1a2e' },
          cardHover: { value: '#1f2544' },
          border: { value: '#2a2d4a' },
        },
        accent: {
          blue: { value: '#4d9cff' },
          purple: { value: '#9f7aea' },
          teal: { value: '#38b2ac' },
          orange: { value: '#ed8936' },
          pink: { value: '#ed64a6' },
          green: { value: '#48bb78' },
          red: { value: '#fc8181' },
          yellow: { value: '#f6e05e' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'surface.bg': { value: '{colors.surface.bg}' },
        'surface.card': { value: '{colors.surface.card}' },
        'surface.border': { value: '{colors.surface.border}' },
        'accent.blue': { value: '{colors.accent.blue}' },
        'accent.purple': { value: '{colors.accent.purple}' },
        'accent.teal': { value: '{colors.accent.teal}' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)

// Consistent chart color palette
export const CHART_COLORS = [
  '#4d9cff', '#9f7aea', '#38b2ac', '#ed8936',
  '#ed64a6', '#48bb78', '#fc8181', '#f6e05e',
  '#4fd1c5', '#b794f4',
]
