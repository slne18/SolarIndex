import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#060a10",
          950: "#060a10",
          900: "#0a1018",
          800: "#0f1623",
          700: "#141f2e",
          600: "#1a2838",
        },
        solar: {
          DEFAULT: "#e8a820",
          300: "#f5c84a",
          400: "#ffd166",
          600: "#c98a12",
        },
        mint: {
          DEFAULT: "#34d399",
          400: "#6ee7b7",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 48px -12px rgba(232, 168, 32, 0.35)",
        card: "0 8px 32px -8px rgba(0, 0, 0, 0.45)",
        "card-hover": "0 16px 48px -12px rgba(0, 0, 0, 0.55)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
