export type Project = {
  slug: string;
  title: string;
  icon: "briefcase" | "repo";
  pill: string;
  desc: [string, string];
  stack: string[];
  href: string;
};

const BASE = "https://jordan-tukum.pages.dev/en/projects";

export const PROJECTS: Project[] = [
  {
    slug: "services-publics",
    title: "SERVICES PUBLICS",
    icon: "briefcase",
    pill: "Lead developer",
    desc: ["National portal for administrative procedures and non-tax", "revenue: OTP accounts, declarations, online payments."],
    stack: ["Laravel", "Vue 3", "Inertia", "Docker"],
    href: `${BASE}/services-publics`,
  },
  {
    slug: "kiosks",
    title: "Self-Service Kiosks",
    icon: "briefcase",
    pill: "Lead developer",
    desc: ["CAMRAIL station ticketing (Electron + Quasar) and TTS's", "multi-service kiosk: thermal printer, QR and ID scanners."],
    stack: ["Electron", "Quasar", "Tauri 2", "Nuxt 4", "Laravel"],
    href: `${BASE}/bornes-libre-service`,
  },
  {
    slug: "fonction-publique",
    title: "Procedures Platform",
    icon: "briefcase",
    pill: "Lead developer",
    desc: ["Ministry of Public Service: steps, documents and contacts", "for every public service. Role-based API, 280+ tests."],
    stack: ["Laravel 12", "React", "TypeScript", "Pest"],
    href: `${BASE}/ministere-fonction-publique`,
  },
  {
    slug: "banking",
    title: "Banking Compliance",
    icon: "briefcase",
    pill: "Lead developer",
    desc: ["Collects, checks and tracks the client documentation CEMAC", "banks must hold. Nuxt 4 Backend-for-Frontend, 180+ tests."],
    stack: ["Nuxt 4", "TypeScript", "Zod", "Vitest"],
    href: `${BASE}/conformite-bancaire`,
  },
  {
    slug: "equip4safety",
    title: "EQUIP4SAFETY",
    icon: "briefcase",
    pill: "Technical lead",
    desc: ["B2B aviation-equipment marketplace for ICAO member states,", "commissioned by the Cameroon Civil Aviation Authority."],
    stack: ["Laravel 12", "Next.js 15", "React 19"],
    href: `${BASE}/equip4safety`,
  },
  {
    slug: "schulyf",
    title: "SchuLyf",
    icon: "repo",
    pill: "Public",
    desc: ["University administration: admissions, HMAC-signed receipts,", "exam gating. 580+ tests, full docs and CI."],
    stack: ["Laravel 13", "Inertia", "Vue 3"],
    href: "https://github.com/kiri1101/student-management-system",
  },
];

const same = (c: string) => ({ light: c, dark: c });

export const STACK_COLORS: Record<string, { light: string; dark: string }> = {
  Laravel: same("#FF2D20"),
  "Laravel 12": same("#FF2D20"),
  "Laravel 13": same("#FF2D20"),
  "Vue 3": same("#41B883"),
  Inertia: same("#9553E9"),
  Docker: same("#2496ED"),
  Electron: same("#47848F"),
  Quasar: same("#1976D2"),
  "Tauri 2": same("#24C8D8"),
  "Nuxt 4": same("#00DC82"),
  React: same("#61DAFB"),
  "React 19": same("#61DAFB"),
  TypeScript: same("#3178C6"),
  Pest: same("#F28D1A"),
  Zod: same("#3068B7"),
  Vitest: same("#6E9F18"),
  "Next.js 15": { light: "#1f2328", dark: "#e6edf3" },
};
