/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07111F",
          900: "#0B1628",
          800: "#101D32",
          700: "#172A45",
          600: "#233C5C",
          border: "#233350",
        },
        gold: {
          400: "#E5C06B",
          500: "#D6A84F",
          600: "#B98A34",
        },
        cream: "#F6F1E4",
        mist: "#8FA1BD",
        success: "#5FA383",
        warn: "#D6A15A",
        danger: "#C1584F",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        ledger: "0 1px 0 0 rgba(214,168,79,0.15)",
        card: "0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      keyframes: {
        draw: {
          to: { strokeDashoffset: "0" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        countUp: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        draw: "draw 1.8s ease-out forwards",
        fadeUp: "fadeUp 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};
