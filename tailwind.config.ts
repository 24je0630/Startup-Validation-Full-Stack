import type { Config } from 'tailwindcss';

// Design tokens for the "Signal" visual identity:
// a data-forward, traction/seismograph metaphor for a startup validation platform.
const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0E1116', // primary dark background
        paper: '#F7F6F2', // light background
        line: '#23272E', // hairline borders on dark
        'line-light': '#E4E2DB', // hairline borders on light
        graphite: '#8A8F98', // muted text
        signal: {
          DEFAULT: '#35D07F', // traction / positive signal (green)
          dim: '#1F8F58',
        },
        alert: {
          DEFAULT: '#FF6B4A', // risk / attention (coral)
          dim: '#C74B30',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'pulse-line':
          'repeating-linear-gradient(90deg, currentColor 0px, currentColor 4px, transparent 4px, transparent 10px)',
      },
    },
  },
  plugins: [],
};

export default config;
