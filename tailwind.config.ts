import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TVC Brand Colors - Caribbean Luxury
        tvc: {
          void: "#0a1628",
          deep: "#0f2847",
          ocean: "#1a4a7a",
          turquoise: "#40b8c4",
          sand: "#f5e6d3",
          gold: "#d4a574",
          coral: "#e8a87c",
          palm: "#2d5016",
          white: "#ffffff",
        },
        // Admin Dashboard
        admin: {
          bg: "#0f0f1a",
          surface: "#1a1a2e",
          border: "#2a2a4a",
          gold: "#d4af37",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
