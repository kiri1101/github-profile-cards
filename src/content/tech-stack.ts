export type CustomName = "Nitro" | "Inertia" | "Quasar" | "Pest" | "Playwright";
export type TechIcon = { kind: "skill"; id: string } | { kind: "custom"; name: CustomName };
export type TechBlock = {
  slug: "backend" | "frontend" | "mobile-desktop" | "testing" | "devops-cloud" | "databases";
  perLine: 2 | 3;
  icons: TechIcon[];
};

const skill = (...ids: string[]): TechIcon[] => ids.map((id) => ({ kind: "skill", id }));
const custom = (name: CustomName): TechIcon => ({ kind: "custom", name });

/** Spec 5.4: block order, icon order and grids. Every count is a multiple of perLine, so rows are always full. */
export const TECH_BLOCKS: TechBlock[] = [
  { slug: "backend", perLine: 3, icons: [...skill("php", "laravel", "python", "flask", "nodejs"), custom("Nitro")] },
  {
    slug: "frontend",
    perLine: 3,
    icons: [...skill("vue", "nuxtjs", "react", "nextjs", "ts", "js", "tailwind", "vite"), custom("Inertia")],
  },
  { slug: "mobile-desktop", perLine: 2, icons: [...skill("androidstudio", "tauri", "electron"), custom("Quasar")] },
  { slug: "testing", perLine: 3, icons: [...skill("vitest"), custom("Pest"), custom("Playwright")] },
  { slug: "devops-cloud", perLine: 2, icons: skill("docker", "githubactions", "git", "cloudflare") },
  { slug: "databases", perLine: 3, icons: skill("mysql", "postgres", "redis") },
];
