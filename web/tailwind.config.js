/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./**/*.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5F0",
        panel: "#F3F1EC",
        surface: "#FFFFFF",
        ink: "#151412",
        muted: "#68645E",
        line: "#D8D4CC",
        action: "#C83A08",
        "action-hover": "#A92E06",
        verified: "#087443",
        technical: "#1457D9",
        warning: "#9A5A00",
        danger: "#B42318",
      },
      fontFamily: {
        display: ['"Roboto Condensed"', "Arial Narrow", "sans-serif"],
        sans: ['"IBM Plex Sans"', "Arial", "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      boxShadow: {
        menu: "0 18px 50px rgba(21, 20, 18, 0.12)",
      },
    },
  },
  plugins: [],
};
