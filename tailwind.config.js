/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        // teal-700. Previously #0ea5a4 (teal-500-ish), which gave only 3.03:1
        // against white — below WCAG AA 4.5:1 for normal text, so both
        // .btn-primary (white on accent) and the accent eyebrow text failed.
        // teal-700 measures 5.47:1 in both directions against white.
        accent: "#0f766e",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "SF Pro Text",
          "Inter",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
