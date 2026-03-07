import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Cool dark scale — backgrounds, cards, borders, text
        surface: {
          950: '#020617', // OLED dark body bg
          900: '#0F172A', // card / panel bg
          850: '#162032', // card hover
          800: '#1E293B', // input bg / elevated surface
          700: '#283548', // border
          600: '#334155', // border hover
          500: '#475569', // placeholder / disabled
          400: '#64748B', // muted text
          300: '#94A3B8', // secondary text
          200: '#CBD5E1', // lighter text
          100: '#F1F5F9', // primary text
        },
        // Amber accent scale
        brand: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#F59E0B', // main amber accent
          500: '#D97706',
          600: '#B45309',
          700: '#92400E', // deep amber
          800: '#78350F',
          900: '#451A03',
        },
        // Blue accent scale — primary interactive color
        accent: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#3B82F6', // primary blue
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
        },
      },
      fontFamily: {
        sans:  ['var(--font-fira-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono:  ['var(--font-fira-code)', 'monospace'],
      },
      animation: {
        "fade-in":        "fadeIn 0.15s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "slide-in-up":    "slideInUp 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInUp: {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
