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
        // Warm light scale — body, cards, panels, borders
        surface: {
          950: '#f0e4c2', // deepest cream alternate bg
          900: '#fffdf8', // card / panel bg
          850: '#fefbf2', // card hover
          800: '#f5ead0', // alternate section bg
          700: '#e0c878', // border
          600: '#cbb567', // border hover
          500: '#B07E09', // deep gold — eyebrow labels, section accents
          400: '#7A6540', // muted body text
          300: '#9a8760', // medium muted
          200: '#c4ae84', // light muted (readable on dark bg too)
          100: '#1a1408', // primary text (ink, on light backgrounds)
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
