/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#181815',
        ink: '#F0EFEA',
        rule: '#332F27',
        muted: '#93897d',
        spot: '#3FB6D4',
        pos: '#4CAE7D',
        neg: '#E2684A',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { DEFAULT: '3px', md: '4px', lg: '6px' },
    },
  },
  plugins: [],
};
