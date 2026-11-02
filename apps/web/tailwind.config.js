/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sentrix: {
          bg: "#0a0c10",
          surface: "#121620",
          elevated: "#181d2b",
          border: "#23293b",
          borderHover: "#333c54",
          text: "#f3f4f6",
          textMuted: "#8e97a8",
          teal: "#0d9488",
          cyan: "#06b6d4",
          amber: "#d97706",
          crimson: "#dc2626",
          indigo: "#4f46e5",
          accent: "#2563eb",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

