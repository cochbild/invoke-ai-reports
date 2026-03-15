// frontend/src/theme.ts
import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: '#1a1a2e',
        color: '#e2e8f0',
      },
    },
  },
  colors: {
    brand: {
      50: '#e6f0ff',
      100: '#b3d4ff',
      200: '#80b8ff',
      300: '#4d9cff',
      400: '#1a80ff',
      500: '#0066e6',
      600: '#0050b3',
      700: '#003a80',
      800: '#00254d',
      900: '#000f1a',
    },
    surface: {
      bg: '#16213e',
      card: '#1a1a2e',
      cardHover: '#1f2544',
      border: '#2a2d4a',
    },
    accent: {
      blue: '#4d9cff',
      purple: '#9f7aea',
      teal: '#38b2ac',
      orange: '#ed8936',
      pink: '#ed64a6',
      green: '#48bb78',
      red: '#fc8181',
      yellow: '#f6e05e',
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          bg: '#16213e',
          borderColor: '#2a2d4a',
          borderWidth: '1px',
          borderRadius: 'lg',
        },
      },
    },
    Table: {
      variants: {
        simple: {
          th: { color: 'gray.400', borderColor: '#2a2d4a' },
          td: { borderColor: '#2a2d4a' },
        },
      },
    },
    Tabs: {
      variants: {
        line: {
          tab: {
            color: 'gray.400',
            _selected: { color: 'accent.blue', borderColor: 'accent.blue' },
          },
        },
      },
    },
  },
})

// Consistent chart color palette
export const CHART_COLORS = [
  '#4d9cff', '#9f7aea', '#38b2ac', '#ed8936',
  '#ed64a6', '#48bb78', '#fc8181', '#f6e05e',
  '#4fd1c5', '#b794f4',
]
