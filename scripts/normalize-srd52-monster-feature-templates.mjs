import fs from "node:fs/promises";

const FILE = "packages/content/data/srd-5.2/monster-features.json";
const compendium = JSON.parse(await fs.readFile(FILE, "utf8"));

const breath = compendium.items.find((item) => item.name === "Draconic Breath Weapon");
if (!breath) throw new Error("Draconic Breath Weapon template not found");

// The definition is neutral. An embedded copy receives either cone.size or line.length/width.
breath.data.activities[0].target.area = { shape: "special" };

await fs.writeFile(FILE, `${JSON.stringify(compendium, null, 2)}\n`);
console.log("Normalized SRD 5.2 monster feature templates.");
