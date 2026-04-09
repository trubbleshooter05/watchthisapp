import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/content/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        charcoal: "#0F0F0F",
        muted: "#6B7280",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#F3F4F6",
            a: {
              color: "#F59E0B",
              "&:hover": {
                color: "#FBBF24",
              },
            },
            h1: {
              color: "#FAFAFA",
              fontFamily: "var(--font-display)",
            },
            h2: {
              color: "#FAFAFA",
              fontFamily: "var(--font-display)",
            },
            h3: {
              color: "#E5E7EB",
            },
            code: {
              backgroundColor: "#1F2937",
              color: "#F3F4F6",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.375rem",
            },
            pre: {
              backgroundColor: "#111827",
              color: "#F3F4F6",
            },
            blockquote: {
              borderLeftColor: "#F59E0B",
              color: "#D1D5DB",
            },
            strong: {
              color: "#FAFAFA",
            },
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
