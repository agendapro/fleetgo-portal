import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#e8ecf5",
        muted: "#8b94ad",
        bg: "#0b1220",
        panel: "#131c30",
        border: "#1f2a44",
        accent: "#6ea8ff",
        accent2: "#6dffb0",
        warn: "#ffb84a",
        bad: "#ff6e6e",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
