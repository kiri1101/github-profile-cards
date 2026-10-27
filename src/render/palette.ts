import type { Theme } from "./measure.ts";

export const STATS_PALETTE: Record<
  Theme,
  { background: string; title: string; icon: string; ring: string; grade: string; text: string; muted: string; faint: string; rule: string; ringTrack: number; ringArc: number }
> = {
  light: {
    background: "#ffffff",
    title: "#1B2B4B",
    icon: "#2E5BA8",
    ring: "#1B2B4B",
    grade: "#333333",
    text: "#333333",
    muted: "#6B7280",
    faint: "#9CA3AF",
    rule: "#E5E7EB",
    ringTrack: 0.2,
    ringArc: 0.8,
  },
  dark: {
    background: "#0d1117",
    title: "#e6edf3",
    icon: "#58a6ff",
    ring: "#58a6ff",
    grade: "#e6edf3",
    text: "#c9d1d9",
    muted: "#8b949e",
    faint: "#6e7681",
    rule: "#30363d",
    ringTrack: 0.25,
    ringArc: 0.9,
  },
};

export const CARD_PALETTE: Record<Theme, { background: string; border: string; title: string; muted: string }> = {
  light: { background: "#ffffff", border: "#d1d9e0", title: "#0969da", muted: "#59636e" },
  dark: { background: "#0d1117", border: "#30363d", title: "#4493f8", muted: "#9198a1" },
};
export const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif";
