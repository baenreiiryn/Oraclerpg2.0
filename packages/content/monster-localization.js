import { isPresentationPath } from "./localization.js";

const MATERIALIZED_FEATURE_NAMES = new Map([
  ["Acid Breath", "Sopro Ácido"],
  ["Cold Breath", "Sopro de Frio"],
  ["Fire Breath", "Sopro de Fogo"],
  ["Lightning Breath", "Sopro Elétrico"],
  ["Poison Breath", "Sopro Venenoso"]
]);

const DAMAGE_LABELS = new Map([
  ["Acid", "de Ácido"],
  ["Bludgeoning", "de Concussão"],
  ["Cold", "de Frio"],
  ["Fire", "de Fogo"],
  ["Force", "de Força"],
  ["Lightning", "Elétrico"],
  ["Necrotic", "Necrótico"],
  ["Piercing", "Perfurante"],
  ["Poison", "de Veneno"],
  ["Psychic", "Psíquico"],
  ["Radiant", "Radiante"],
  ["Slashing", "Cortante"],
  ["Thunder", "Trovejante"]
]);

const SIZE_LABELS = new Map([
  ["Medium", "Média"],
  ["Large", "Grande"],
  ["Huge", "Enorme"]
]);

const COUNT_LABELS = new Map([
  ["one", "um"],
  ["two", "dois"],
  ["three", "três"],
  ["four", "quatro"]
]);

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[/^\d+$/.test(part) ? Number(part) : part], root);
}

function collectPresentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (root.trim() && isPresentationPath(prefix) && !prefix.includes(".monsterTemplate.") && !prefix.endsWith(".invocation.entity.name")) out[prefix] = root;
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => collectPresentationStrings(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) collectPresentationStrings(value, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

function mergedEntries(catalogs) {
  return Object.assign({}, ...(catalogs ?? []).map((catalog) => catalog?.entries ?? {}));
}

export function buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs) {
  const definitions = new Map((featureDefinitions ?? []).map((feature) => [feature.canonicalId, feature]));
  const result = new Map();
  const conflicts = new Set();
  for (const [canonicalId, overlay] of Object.entries(mergedEntries(featureCatalogs))) {
    const feature = definitions.get(canonicalId);
    if (!feature) continue;
    for (const [pathKey, translated] of Object.entries(overlay)) {
      const source = getPath(feature, pathKey);
      if (typeof source !== "string" || !source.trim() || typeof translated !== "string") continue;
      if (result.has(source) && result.get(source) !== translated) conflicts.add(source);
      else result.set(source, translated);
    }
  }
  for (const source of conflicts) result.delete(source);
  return result;
}

function canonicalDescription(feature) {
  return [feature?.data?.text?.description, feature?.data?.text?.rules?.[0], feature?.data?.activities?.[0]?.description]
    .find((value) => typeof value === "string" && value.trim()) ?? "";
}

function translatedDescription(feature, overlay, exactMap) {
  const source = canonicalDescription(feature);
  if (!source) return "";
  if (exactMap.has(source)) return exactMap.get(source);
  for (const [pathKey, translated] of Object.entries(overlay ?? {})) {
    if (typeof translated === "string" && getPath(feature, pathKey) === source) return translated;
  }
  return "";
}

function macroToken(macro) {
  const body = macro.slice(2, -1);
  const firstSpace = body.indexOf(" ");
  const kind = firstSpace < 0 ? body : body.slice(0, firstSpace);
  const payload = firstSpace < 0 ? "" : body.slice(firstSpace + 1);
  const primary = payload.split("|")[0];
  return {kind, primary};
}

function normalizedSkeleton(text) {
  return text.toLowerCase()
    .replace(/\{@[^}]+\}/g, (macro) => {
      const {kind, primary} = macroToken(macro);
      return ["dc", "damage", "dice", "hit"].includes(kind) ? `<${kind}>` : `<${kind}:${primary.toLowerCase()}>`;
    })
    .replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim();
}

function plainNumbers(text) {
  return text.replace(/\{@[^}]+\}/g, "").match(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g) ?? [];
}

function projectVariant(baseEn, basePt, variantEn) {
  if (!baseEn || !basePt || normalizedSkeleton(baseEn) !== normalizedSkeleton(variantEn)) return null;
  const ptMacros = basePt.match(/\{@[^}]+\}/g) ?? [];
  const variantMacros = variantEn.match(/\{@[^}]+\}/g) ?? [];
  if (ptMacros.length !== variantMacros.length) return null;
  let macroIndex = 0;
  let projected = basePt.replace(/\{@[^}]+\}/g, () => {
    const ptMacro = ptMacros[macroIndex];
    const variantMacro = variantMacros[macroIndex++];
    const pt = macroToken(ptMacro);
    const variant = macroToken(variantMacro);
    if (pt.kind !== variant.kind || pt.primary !== variant.primary) return variantMacro;
    const ptBody = ptMacro.slice(2, -1);
    const ptParts = ptBody.split("|");
    const display = ptParts.length > 1 ? ptParts.at(-1) : null;
    if (!display || display === pt.primary) return variantMacro;
    const variantParts = variantMacro.slice(2, -1).split("|");
    if (variantParts.length > 1) variantParts[variantParts.length - 1] = display;
    else variantParts.push(display);
    return `{@${variantParts.join("|")}}`;
  });
  const from = plainNumbers(baseEn);
  const to = plainNumbers(variantEn);
  if (from.length !== to.length) return null;
  if (from.some((value, index) => value !== to[index])) {
    const macros = [];
    let protectedText = projected.replace(/\{@[^}]+\}/g, (macro) => `§M${macros.push(macro) - 1}§`);
    let numberIndex = 0;
    protectedText = protectedText.replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g, () => to[numberIndex++]);
    projected = protectedText.replace(/§M(\d+)§/g, (_, index) => macros[Number(index)]);
  }
  return projected;
}

function translateRangeClause(clause) {
  if (!/^(?:reach \d+(?:\/\d+)? ft\.|range \d+(?:\/\d+)? ft\.|reach \d+(?:\/\d+)? ft\. or range \d+(?:\/\d+)? ft\.)$/.test(clause)) return null;
  return clause
    .replace(/^reach /, "alcance ")
    .replace(/^range /, "distância ")
    .replace(/ or range /, " ou distância ")
    .replace(/ ft\./g, " pés.");
}

function translateDamageTail(tail) {
  const match = tail.match(/^(\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage(?: plus (\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage)?\.$/);
  if (!match) return null;
  const firstType = DAMAGE_LABELS.get(match[2]);
  const secondType = match[4] ? DAMAGE_LABELS.get(match[4]) : null;
  if (!firstType || (match[4] && !secondType)) return null;
  let out = `${match[1]} de dano ${firstType}`;
  if (match[3]) out += ` mais ${match[3]} de dano ${secondType}`;
  return `${out}.`;
}

function translateStandardAttack(source) {
  const match = source.match(/^(\{@atkr [^}]+\}) (\{@hit [^}]+\})( to hit)?, (.+?) \{@h\}(.+)$/);
  if (!match) return null;
  const range = translateRangeClause(match[4]);
  const damage = translateDamageTail(match[5]);
  if (!range || !damage) return null;
  return `${match[1]} ${match[2]}${match[3] ? " para acertar" : ""}, ${range} {@h}${damage}`;
}

function translatedDamageLabel(type) {
  return DAMAGE_LABELS.get(type) ?? null;
}

function translateBreathWeapon(source) {
  const line = source.match(/^(\{@actSave [^}]+\}) (\{@dc [^}]+\}), each creature in an? (\d+)-foot-long, (\d+)-foot-wide (\{@variantrule Line \[Area of Effect\]\|XPHB\|Line\})\. (\{@actSaveFail\}) (\d+ \(\{@damage [^}]+\}\)) ([A-Za-z]+) damage\. (\{@actSaveSuccess\}) Half damage\.$/);
  if (line) {
    const type = translatedDamageLabel(line[8]);
    if (!type) return null;
    const area = line[5].replace(/\|Line\}$/, "|Linha}");
    return `${line[1]} ${line[2]}, cada criatura em uma ${area} de ${line[3]} pés de comprimento e ${line[4]} pés de largura. ${line[6]} ${line[7]} de dano ${type}. ${line[9]} Metade do dano.`;
  }

  const cone = source.match(/^(\{@actSave [^}]+\}) (\{@dc [^}]+\}), each creature in an? (\d+)-foot (\{@variantrule Cone \[Area of Effect\]\|XPHB\|Cone\})\. (\{@actSaveFail\}) (\d+ \(\{@damage [^}]+\}\)) ([A-Za-z]+) damage\. (\{@actSaveSuccess\}) Half damage\.$/);
  if (cone) {
    const type = translatedDamageLabel(cone[7]);
    if (!type) return null;
    return `${cone[1]} ${cone[2]}, cada criatura em um ${cone[4]} de ${cone[3]} pés. ${cone[5]} ${cone[6]} de dano ${type}. ${cone[8]} Metade do dano.`;
  }
  return null;
}

function featureLabel(source, exactMap) {
  return exactMap.get(source) ?? MATERIALIZED_FEATURE_NAMES.get(source) ?? null;
}

function attackPhrase(count, source, exactMap) {
  const label = featureLabel(source, exactMap);
  const quantity = COUNT_LABELS.get(count);
  if (!label || !quantity) return null;
  return `${quantity} ataque${count === "one" ? "" : "s"} de ${label}`;
}

function translateMultiattack(source, exactMap) {
  let match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks?\.$/);
  if (match) {
    const phrase = attackPhrase(match[1], match[2], exactMap);
    if (phrase) return `A criatura realiza ${phrase}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks? and (one|two|three|four) (.+?) attacks?\.$/);
  if (match) {
    const first = attackPhrase(match[1], match[2], exactMap);
    const second = attackPhrase(match[3], match[4], exactMap);
    if (first && second) return `A criatura realiza ${first} e ${second}.`;
  }

  match = source.match(/^The [^.]+ makes one (.+?) attack, one (.+?) attack, and one (.+?) attack\.$/);
  if (match) {
    const labels = match.slice(1).map((name) => featureLabel(name, exactMap));
    if (labels.every(Boolean)) return `A criatura realiza um ataque de ${labels[0]}, um ataque de ${labels[1]} e um ataque de ${labels[2]}.`;
  }

  match = source.match(/^The [^.]+ makes (two|three|four) attacks, using (.+?) or (.+?) in any combination\.$/);
  if (match) {
    const quantity = COUNT_LABELS.get(match[1]);
    const first = featureLabel(match[2], exactMap);
    const second = featureLabel(match[3], exactMap);
    if (quantity && first && second) return `A criatura realiza ${quantity} ataques, usando ${first} ou ${second} em qualquer combinação.`;
  }

  match = source.match(/^The [^.]+ makes (two|three|four) (.+?) or (.+?) attacks\.$/);
  if (match) {
    const quantity = COUNT_LABELS.get(match[1]);
    const first = featureLabel(match[2], exactMap);
    const second = featureLabel(match[3], exactMap);
    if (quantity && first && second) return `A criatura realiza ${quantity} ataques de ${first} ou ${second}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks? and uses (.+?)( if available)?\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const use = featureLabel(match[3], exactMap);
    if (attacks && use) return `A criatura realiza ${attacks} e usa ${use}${match[4] ? " se disponível" : ""}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks? and uses either (.+?) or (.+?)( if available)?\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const first = featureLabel(match[3], exactMap);
    const second = featureLabel(match[4], exactMap);
    if (attacks && first && second) return `A criatura realiza ${attacks} e usa ${first} ou ${second}${match[5] ? ", se disponível" : ""}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks?\. It can replace one attack with a (.+?) attack\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const replacement = featureLabel(match[3], exactMap);
    if (attacks && replacement) return `A criatura realiza ${attacks}. Ela pode substituir um ataque por um ataque de ${replacement}.`;
  }

  match = source.match(/^The [^.]+ makes one (.+?) attack and one (.+?) attack, or it makes two (.+?) attacks\.$/);
  if (match) {
    const first = featureLabel(match[1], exactMap);
    const second = featureLabel(match[2], exactMap);
    const alternative = featureLabel(match[3], exactMap);
    if (first && second && alternative) return `A criatura realiza um ataque de ${first} e um ataque de ${second}, ou realiza dois ataques de ${alternative}.`;
  }

  match = source.match(/^The [^.]+ makes two (.+?) attacks, or it makes three (.+?) attacks if it used (.+?) this turn\.$/);
  if (match && match[1] === match[2]) {
    const attack = featureLabel(match[1], exactMap);
    const used = featureLabel(match[3], exactMap);
    if (attack && used) return `A criatura realiza dois ataques de ${attack}, ou realiza três ataques de ${attack} se tiver usado ${used} neste turno.`;
  }

  return null;
}

function translateCommonTrait(source) {
  if (/^The [^.]+ has \{@variantrule Advantage\|XPHB\} on saving throws against spells and other magical effects\.$/.test(source)) {
    return "A criatura tem {@variantrule Advantage|XPHB|Vantagem} em salvaguardas contra magias e outros efeitos mágicos.";
  }

  const pack = source.match(/^The (.+?) has \{@variantrule Advantage\|XPHB\} on an attack roll against a creature if at least one of the (.+?)'s allies is within 5 feet of the creature and the ally doesn't have the \{@condition Incapacitated\|XPHB\} condition\.$/);
  if (pack && pack[1] === pack[2]) {
    return "A criatura tem {@variantrule Advantage|XPHB|Vantagem} em uma jogada de ataque contra uma criatura se pelo menos um aliado dela estiver a até 5 pés da criatura e o aliado não tiver a condição {@condition Incapacitated|XPHB|Incapacitado}.";
  }
  return null;
}

function translateStandardAttackRider(source) {
  let match = source.match(/^(.*damage\.) If the target is a (Medium|Large|Huge) or smaller creature, it has the \{@condition Prone\|XPHB\} condition\.$/);
  if (match) {
    const base = translateStandardAttack(match[1]);
    const size = SIZE_LABELS.get(match[2]);
    if (base && size) return `${base} Se o alvo for uma criatura ${size} ou menor, ele recebe a condição {@condition Prone|XPHB|Caído}.`;
  }

  match = source.match(/^(.*damage\.) If the target is a (Medium|Large|Huge) or smaller creature, it has the \{@condition Grappled\|XPHB\} condition \(escape (\{@dc [^}]+\})\)( from both claws)?\.$/);
  if (match) {
    const base = translateStandardAttack(match[1]);
    const size = SIZE_LABELS.get(match[2]);
    if (base && size) return `${base} Se o alvo for uma criatura ${size} ou menor, ele recebe a condição {@condition Grappled|XPHB|Agarrado} (escapar ${match[3]})${match[4] ? " por ambas as garras" : ""}.`;
  }
  return null;
}

function translateSimpleMaterializedVariant(source, exactMap) {
  if (/^The [^.]+ can breathe air and water\.$/.test(source)) return "A criatura pode respirar ar e água.";
  if (/^If the [^.]+ fails a saving throw, it can choose to succeed instead\.$/.test(source)) return "Se a criatura falhar em uma salvaguarda, ela pode escolher obter sucesso em vez disso.";

  const moveAttack = source.match(/^The [^.]+ moves up to half its \{@variantrule Speed\|XPHB\}, and it makes one (.+) attack\.$/);
  if (moveAttack) {
    const attack = featureLabel(moveAttack[1], exactMap);
    if (attack) return `A criatura se move até metade de seu {@variantrule Speed|XPHB|Deslocamento} e realiza um ataque de ${attack}.`;
  }
  return null;
}

function translateStructuredVariant(source, exactMap) {
  return translateStandardAttack(source)
    ?? translateStandardAttackRider(source)
    ?? translateBreathWeapon(source)
    ?? translateMultiattack(source, exactMap)
    ?? translateCommonTrait(source)
    ?? translateSimpleMaterializedVariant(source, exactMap);
}

export function buildMonsterLocalizationCatalog({ monsters, featureDefinitions, featureCatalogs, nameMap, variantTranslations = {}, explicitEntries = {} }) {
  const exactMap = buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs);
  const definitions = new Map((featureDefinitions ?? []).map((feature) => [feature.canonicalId, feature]));
  const featureEntries = mergedEntries(featureCatalogs);
  const names = nameMap?.names ?? {};
  const entries = {};

  for (const monster of monsters ?? []) {
    const overlay = {};
    const explicit = explicitEntries[monster.canonicalId] ?? {};
    for (const [pathKey, source] of Object.entries(collectPresentationStrings(monster))) {
      let translated = explicit[pathKey];
      if (typeof translated !== "string" && pathKey === "name") translated = names[source];
      if (typeof translated !== "string") translated = variantTranslations[source];
      if (typeof translated !== "string" && exactMap.has(source)) translated = exactMap.get(source);
      if (typeof translated !== "string" && MATERIALIZED_FEATURE_NAMES.has(source)) translated = MATERIALIZED_FEATURE_NAMES.get(source);
      if (typeof translated !== "string") translated = translateStructuredVariant(source, exactMap);
      if (typeof translated !== "string") {
        const match = pathKey.match(/^data\.features\.(\d+)\.text\.description$/);
        if (match) {
          const instance = monster.data?.features?.[Number(match[1])];
          const definition = definitions.get(instance?.definition?.canonicalId);
          if (definition) translated = projectVariant(canonicalDescription(definition), translatedDescription(definition, featureEntries[definition.canonicalId], exactMap), source);
        }
      }
      if (typeof translated === "string" && translated.length) overlay[pathKey] = translated;
    }
    entries[monster.canonicalId] = overlay;
  }
  return { format: "oraclerpg-localization", version: 1, locale: "pt-BR", sourceLocale: "en", contentSource: "srd-5.2", entityType: "monster", scope: "monsters", entries };
}

export function collectMonsterPresentationStrings(monster) {
  return collectPresentationStrings(monster);
}
