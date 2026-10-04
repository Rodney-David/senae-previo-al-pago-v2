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
        senae: {
          navy: "#0f172a",
          dark: "#1e293b",
          primary: "#1e40af",
          accent: "#2563eb",
          light: "#f8fafc",
        },
      },
    },
  },
  plugins: [],
};
export default config;
