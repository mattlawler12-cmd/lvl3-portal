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
        // Warm dark scale — body, cards, panels, borders
        surface: {
          950: '#0f0c05', // deepest dark bg
          900: '#252010', // card / panel bg
          850: '#2e2815', // card hover
          800: '#382f1c', // alternate/input bg
          700: '#e0c878', // border (gold)
          600: '#cbb567', // border hover
          500: '#B07E09', // deep gold — eyebrow labels, section accents
          400: '#c4ae84', // muted text on dark
          300: '#d4c098', // medium muted on dark
          200: '#e8d8b4', // lighter muted on dark
          100: '#fdf6e3', // primary text (cream, on dark backgrounds)
        },
        // Marigold gold scale
        brand: {
          50:  '#FFF9EC',
          100: '#FFF3CC',
          200: '#FFE49A',
          300: '#FFD26B',
          400: '#FEC77C', // main marigold accent
          500: '#F5AD3A',
          600: '#D4950A',
          700: '#B07E09', // deep gold
          800: '#7A5807',
          900: '#1a1408', // ink
        },
        // Warm gold scale — used for positive indicators and chart accents
        accent: {
          50:  '#FFF9EC',
          100: '#FFF3CC',
          200: '#FFE49A',
          300: '#FFD26B',
          400: '#B07E09', // deep gold (positive/up indicator)
          500: '#8A6007',
          600: '#6A4807',
          700: '#4A3005',
          800: '#2C1C04',
          900: '#1a1008',
        },
      },
      fontFamily: {
        sans:  ['var(--font-dm-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
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
