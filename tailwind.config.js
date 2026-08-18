/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FFFFFF',
        surface: '#F7F7F5',
        ink: '#16161A',
        rule: '#E4E2DC',
        muted: '#726D64',
        spot: '#0E7490',
        magenta: '#C2255C',
        gold: '#C98500',
        pos: '#15803D',
        neg: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { DEFAULT: '3px', md: '4px', lg: '6px' },
      boxShadow: {
        card: '0 1px 2px rgba(20,18,14,0.04), 0 8px 24px -14px rgba(20,18,14,0.16)',
      },
    },
  },
  plugins: [],
};
