/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        serif: ['"Playfair Display"', 'serif'],
      },
      colors: {
        jiron: {
          bg: '#EBF1FF',
          card: '#FFFFFF',
          sidebar: '#FFFFFF',
          textDark: '#1E2433',
          textMuted: '#8F9CAE',
          border: '#E8EDF5',
          purple: '#7B61FF',
          purpleLight: '#ECE9FE',
          blue: '#4880FF',
          blueLight: '#E8F0FE',
          amber: '#FFB800',
          amberLight: '#FFF6DF',
          pink: '#FF5E9D',
          pinkLight: '#FFEBF3',
          green: '#22C55E',
          greenLight: '#EAF8EE',
        },
      },
      borderRadius: {
        '4xl': '32px',
        '5xl': '40px',
      },
      boxShadow: {
        app: '0 30px 80px -15px rgba(66, 92, 160, 0.16)',
        card: '0 4px 20px -2px rgba(112, 144, 176, 0.08), 0 2px 6px -1px rgba(112, 144, 176, 0.04)',
        cardHover: '0 12px 32px -4px rgba(112, 144, 176, 0.18)',
        needle: '0 0 14px 2px rgba(72, 128, 255, 0.6)',
      },
    },
  },
  plugins: [],
};
