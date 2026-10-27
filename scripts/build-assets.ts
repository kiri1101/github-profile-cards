import { mkdirSync, writeFileSync } from "node:fs";
import { cardAssets } from "../src/render/project-card.ts";

const PUBLIC = new URL("../public/", import.meta.url);
mkdirSync(new URL("cards/", PUBLIC), { recursive: true });

const assets = cardAssets();
for (const a of assets) writeFileSync(new URL(a.path, PUBLIC), a.svg);
console.log(`wrote ${assets.length} project cards to public/cards`);
