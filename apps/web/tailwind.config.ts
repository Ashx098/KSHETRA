import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "../../packages/types/src/**/*.ts",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#070b11",
        panel: "#101826",
        line: "#243346",
        accent: "#d4a84f",
        text: "#edf2f7",
        muted: "#8ea1b5",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
};

export default config;

