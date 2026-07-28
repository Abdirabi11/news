import type { Config } from "tailwindcss";
 
/**
 * Claude / Linear / Vercel-class token system.
 *
 * Restraint-first: clean neutral surfaces, one calm indigo accent
 * for interaction, a warm sand tint reserved for occasional soft
 * surfaces (never as a loud background). Deliberately NOT the
 * terracotta #D97757 — that reads as an AI-generated default.
 *
 * Tokens are CSS variables (globals.css) exposed with
 * rgb(var(--token) / <alpha-value>) so opacity modifiers work:
 * bg-canvas/70 for the frosted header, ring-hair/60, etc.
 */
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;
 
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: withAlpha("--c-canvas"), // #fafafa app background
        surface: withAlpha("--c-surface"), // #ffffff cards
        sand: withAlpha("--c-sand"), // #f5f1ea warm tint
 
        // Text
        ink: {
          DEFAULT: withAlpha("--c-ink"), // #27272a headings
          soft: withAlpha("--c-ink-soft"), // #52525b body
          muted: withAlpha("--c-ink-muted"), // #71717a captions
        },
 
        // Lines
        hair: withAlpha("--c-hair"), // #f4f4f5 subtle borders
        ring: withAlpha("--c-ring"), // #e4e4e7 defined rings
 
        // Accent — calm indigo
        accent: {
          DEFAULT: withAlpha("--c-accent"), // #5b5bd6
          hover: withAlpha("--c-accent-hover"), // #4b4bc4
          soft: withAlpha("--c-accent-soft"), // #eeeefb tint
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Serif is reserved for article body only.
        serif: ["var(--font-serif)", "Georgia", "serif"],
        arabic: ["var(--font-arabic)", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // Soft, diffuse — never harsh.
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.03), 0 4px 16px -4px rgb(0 0 0 / 0.06)",
        lift: "0 8px 32px -8px rgb(0 0 0 / 0.12)",
      },
      typography: () => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": "rgb(var(--c-ink-soft))",
            "--tw-prose-headings": "rgb(var(--c-ink))",
            "--tw-prose-links": "rgb(var(--c-accent))",
            "--tw-prose-quotes": "rgb(var(--c-ink-soft))",
            "--tw-prose-quote-borders": "rgb(var(--c-accent-soft))",
            "--tw-prose-bullets": "rgb(var(--c-ring))",
            "--tw-prose-hr": "rgb(var(--c-hair))",
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
 