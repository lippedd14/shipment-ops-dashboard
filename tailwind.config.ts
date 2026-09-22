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
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        signal: "var(--signal)",
        stage: {
          pending: "var(--stage-pending)",
          transit: "var(--stage-in-transit)",
          delivered: "var(--stage-delivered)",
        },
        delayed: "var(--delayed)",
      },
      fontSize: {
        // Tool-sized type: nothing here is display copy.
        meta: ["0.75rem", { lineHeight: "1rem" }],
        body: ["0.8125rem", { lineHeight: "1.25rem" }],
        title: ["1.125rem", { lineHeight: "1.5rem" }],
        metric: ["1.875rem", { lineHeight: "2.125rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
