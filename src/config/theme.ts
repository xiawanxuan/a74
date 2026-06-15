export const themeColors = {
  bg: {
    primary: '#f5f0e6',
    secondary: '#ebe4d4',
    tertiary: '#e0d6c2',
    card: '#faf7ef'
  },
  text: {
    primary: '#3d3429',
    secondary: '#6b5d4d',
    tertiary: '#9c8d7a',
    inverse: '#f5f0e6'
  },
  accent: {
    primary: '#8b6914',
    secondary: '#a67c00',
    terracotta: '#c2563b',
    celadon: '#7fa06f',
    indigo: '#5c6a91',
    amber: '#d4a84b'
  },
  minerals: [
    '#c2563b',
    '#7fa06f',
    '#5c6a91',
    '#8b6914',
    '#6b5d8a',
    '#4a8b8b',
    '#c4956a',
    '#8b4a6b',
    '#5a7a5a',
    '#a67c52'
  ],
  border: {
    light: '#d9cfbe',
    medium: '#c2b59f',
    dark: '#9c8d7a'
  },
  chart: {
    grid: '#e0d6c2',
    axis: '#9c8d7a',
    tooltipBg: 'rgba(61, 52, 41, 0.92)',
    uploaded: '#c2563b',
    highlight: '#d4a84b'
  }
} as const

export type ThemeColors = typeof themeColors
