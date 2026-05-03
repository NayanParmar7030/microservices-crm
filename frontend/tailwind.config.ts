import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crm: {
          primary: "#0F172A",
          accent: "#6366F1",
          bg: "#F8FAFC",
          border: "#E2E8F0",
          muted: "#475569",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
