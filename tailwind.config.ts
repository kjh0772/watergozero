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
        irrigation: {
          primary: "#0d9488",
          secondary: "#0f766e",
          accent: "#14b8a6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
