import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const docs = ["species.json", "species-features.json"].map((file) => ({
  file,
  doc: JSON.parse(fs.readFileSync(path.join(here, `../data/srd-5.2/${file}`), "utf8"))
}));

function collect(value, pathParts = [], out = {}) {
  if (typeof value === "string") {
    const pathKey = pathParts.join(".");
    if (isPresentationPath(pathKey) && !pathKey.includes(".speciesTemplate.") && !pathKey.endsWith(".invocation.entity.name")) {
      out[pathKey] = value;
    }
    return out;
  }
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collect(entry, [...pathParts, String(index)], out));
    return out;
  }
  for (const [key, entry] of Object.entries(value)) collect(entry, [...pathParts, key], out);
  return out;
}

test("inventory SRD species presentation strings", () => {
  for (const { file, doc } of docs) {
    for (const entity of doc.items ?? []) {
      console.log(`SPECIES_LOCALIZATION_INVENTORY=${JSON.stringify({ file, canonicalId: entity.canonicalId, strings: collect(entity) })}`);
    }
  }
});
