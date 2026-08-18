import fs from "node:fs/promises";

const ITEMS_PATH = "packages/content/data/srd-5.2/items.json";

const document = JSON.parse(await fs.readFile(ITEMS_PATH, "utf8"));

function weightValue(value, unit = "lb") {
  if (value == null) return undefined;
  if (typeof value === "object" && typeof value.value === "number" && typeof value.unit === "string") return value;
  const n = Number(value);
  return Number.isFinite(n) ? { value: n, unit } : undefined;
}

for (const record of document.items ?? []) {
  const data = record.data ?? {};
  if (data.weight != null) data.weight = weightValue(data.weight);
  if (data.capacity?.weight != null) data.capacity.weight = weightValue(data.capacity.weight);
  for (const compartment of data.compartments ?? []) {
    if (compartment.maxWeight != null) compartment.maxWeight = weightValue(compartment.maxWeight);
  }
}

await fs.writeFile(ITEMS_PATH, JSON.stringify(document, null, 2) + "\n");
console.log(`Normalized weight units for ${document.items?.length ?? 0} SRD 5.2 item records.`);
