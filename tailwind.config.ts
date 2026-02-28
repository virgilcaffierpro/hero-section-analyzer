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
        bg: {
          primary: "#0A0A0F",
          secondary: "#12121A",
          card: "#18181F",
          hover: "#1E1E28",
        },
        accent: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          soft: "rgba(245, 158, 11, 0.12)",
        },
        purple: {
          DEFAULT: "#7C6AF5",
          hover: "#6A56E8",
          soft: "rgba(124, 106, 245, 0.12)",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.07)",
          hover: "rgba(255, 255, 255, 0.14)",
        },
        score: {
          red: "#EF4444",
          yellow: "#F59E0B",
          green: "#22C55E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "slide-in": "slideIn 0.4s ease-out forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "progress": "progress 1.5s ease-in-out forwards",
        "count-up": "countUp 1s ease-out forwards",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        progress: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width)" },
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
        accent: "0 0 0 1px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.15)",
        glow: "0 0 40px rgba(245, 158, 11, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
