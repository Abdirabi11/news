import type { Config } from "tailwindcss";
 
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;
 
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: withAlpha("--c-canvas"),   // #FAF7F2 page bg
        surface: withAlpha("--c-surface"), // #FFFDF9 lifted cards
        wood: withAlpha("--c-wood"),       // #F0E9DE warm band surface
 
        ink: {
          DEFAULT: withAlpha("--c-ink"),      // #2E2A24
          soft: withAlpha("--c-ink-soft"),    // #6B6357
          muted: withAlpha("--c-ink-muted"),  // #8A8171
        },
 
        hair: withAlpha("--c-hair"), // #EFE7D9 (rarely used now)
        ring: withAlpha("--c-ring"), // #E7DECE
 
        sage: {
          DEFAULT: withAlpha("--c-sage"),
          hover: withAlpha("--c-sage-hover"),
          soft: withAlpha("--c-sage-soft"),
        },
        terracotta: {
          DEFAULT: withAlpha("--c-terra"),
          soft: withAlpha("--c-terra-soft"),
        },
        amber: {
          DEFAULT: withAlpha("--c-amber"),
          soft: withAlpha("--c-amber-soft"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"], // article body only
        arabic: ["var(--font-arabic)", "sans-serif"],
      },
      borderRadius: { "3xl": "1.5rem", "4xl": "2rem" },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(59 53 46 / 0.04), 0 6px 20px -6px rgb(59 53 46 / 0.08)",
        lift: "0 10px 36px -10px rgb(59 53 46 / 0.16)",
      },
      typography: () => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": "rgb(var(--c-ink-soft))",
            "--tw-prose-headings": "rgb(var(--c-ink))",
            "--tw-prose-links": "rgb(var(--c-sage))",
            "--tw-prose-quotes": "rgb(var(--c-ink-soft))",
            "--tw-prose-quote-borders": "rgb(var(--c-sage-soft))",
            "--tw-prose-captions": "rgb(var(--c-ink-muted))",
            maxWidth: "none",
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
 
export default config;