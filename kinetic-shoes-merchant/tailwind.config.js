// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: false, // light mode default as per user preference
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#13B734",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F0FBF3",
          foreground: "#111111",
        },
        accent: "#13B734",
        muted: {
          DEFAULT: "#F5F7FA",
          foreground: "#9BA5B4",
        },
        border: "#EEEEEE",
        input: "#F0F3F9",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};
