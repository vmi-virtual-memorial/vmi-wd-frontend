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
        'vmi-red': '#AE122A',
        'vmi-gold': '#FFD619',
        'vmi-dark-red': '#8A0E22',
        'vmi-light-gold': '#FFF3B8',
        'vmi-cream': '#d7d4c9',
        'vmi-black': '#1A1A1A',
        'vmi-gray': '#4A4A4A',
        'vmi-light-gray': '#F5F5F5',
      },
      fontFamily: {
        'serif': ['Crimson Text', 'Georgia', 'serif'],
        'display': ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;