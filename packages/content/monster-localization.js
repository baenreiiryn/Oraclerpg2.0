import { isPresentationPath } from "./localization.js";

const MATERIALIZED_FEATURE_NAME_TRANSLATIONS = new Map([
  ["Acid Breath", "Sopro Ácido"],
  ["Cold Breath", "Sopro de Frio"],
  ["Fire Breath", "Sopro de Fogo"],
  ["Lightning Breath", "Sopro Elétrico"],
  ["Poison Breath", "Sopro Venenoso"]
]);

const DAMAGE_TYPES = {
  Acid: "Ácido",
  Bludgeoning: "Concussão",
  Cold: "Frio",
  Fire: "Fogo",
  Force: "Força",
  Lightning: "Elétrico",
  Necrotic: "Necrótico",
  Piercing: "Perfurante",
  Poison: "Veneno",
  Psychic: "Psíquico",
  Radiant: "Radiante",
  Slashing: "Cortante",
  Thunder: "Trovejante"
};

const SIZE_TRANSLATIONS = {
  Tiny: "Minúscula",
  Small: "Pequena",
  Medium: "Média",
  Large: "Grande",
  Huge: "Enorme",
  Gargantuan: "Colossal"
};

const SUBJECTS = {
  aboleth: ["aboleth", "m"],
  ape: ["gorila", "m"],
  armor: ["armadura", "f"],
  assassin: ["assassino", "m"],
  balor: ["balor", "m"],
  bandit: ["bandido", "m"],
  basilisk: ["basilisco", "m"],
  bear: ["urso", "m"],
  beetle: ["besouro", "m"],
  behir: ["behir", "m"],
  boar: ["javali", "m"],
  bugbear: ["bugbear", "m"],
  centaur: ["centauro", "m"],
  cloaker: ["cloaker", "m"],
  couatl: ["couatl", "m"],
  devil: ["diabo", "m"],
  dog: ["cão", "m"],
  dragon: ["dragão", "m"],
  drider: ["drider", "m"],
  dryad: ["dríade", "f"],
  efreeti: ["efreeti", "m"],
  elemental: ["elemental", "m"],
  elk: ["alce", "m"],
  erinyes: ["erínia", "f"],
  ettercap: ["ettercap", "m"],
  familiar: ["familiar", "m"],
  frog: ["sapo", "m"],
  gargoyle: ["gárgula", "f"],
  giant: ["gigante", "m"],
  gladiator: ["gladiador", "m"],
  gnoll: ["gnoll", "m"],
  goat: ["cabra", "f"],
  goblin: ["goblin", "m"],
  golem: ["golem", "m"],
  guardian: ["guardião", "m"],
  hezrou: ["hezrou", "m"],
  hippogriff: ["hipogrifo", "m"],
  hippopotamus: ["hipopótamo", "m"],
  horse: ["cavalo", "m"],
  hyena: ["hiena", "f"],
  hydra: ["hidra", "f"],
  jelly: ["geleia", "f"],
  kobold: ["kobold", "m"],
  kraken: ["kraken", "m"],
  limb: ["membro", "m"],
  lizard: ["lagarto", "m"],
  magmin: ["magmin", "m"],
  marilith: ["marilith", "f"],
  medusa: ["medusa", "f"],
  mephit: ["mephit", "m"],
  mouther: ["bocarra", "f"],
  mummy: ["múmia", "f"],
  naga: ["naga", "f"],
  nalfeshnee: ["nalfeshnee", "m"],
  nightmare: ["pesadelo", "m"],
  noble: ["nobre", "m"],
  octopus: ["polvo", "m"],
  ooze: ["limo", "m"],
  panther: ["pantera", "f"],
  piranha: ["piranha", "f"],
  pirate: ["pirata", "m"],
  planetar: ["planetar", "m"],
  plesiosaurus: ["plesiossauro", "m"],
  pseudodragon: ["pseudodragão", "m"],
  pteranodon: ["pteranodonte", "m"],
  rat: ["rato", "m"],
  raven: ["corvo", "m"],
  remorhaz: ["remorhaz", "m"],
  roc: ["roc", "m"],
  roper: ["roper", "m"],
  salamander: ["salamandra", "f"],
  satyr: ["sátiro", "m"],
  seahorse: ["cavalo-marinho", "m"],
  shark: ["tubarão", "m"],
  shadow: ["sombra", "f"],
  skeleton: ["esqueleto", "m"],
  snake: ["cobra", "f"],
  solar: ["solar", "m"],
  specter: ["espectro", "m"],
  sphinx: ["esfinge", "f"],
  spider: ["aranha", "f"],
  stalker: ["espreitador", "m"],
  swarm: ["enxame", "m"],
  tarrasque: ["tarrasque", "m"],
  tiger: ["tigre", "m"],
  toad: ["sapo", "m"],
  treant: ["ente", "m"],
  troll: ["troll", "m"],
  unicorn: ["unicórnio", "m"],
  vampire: ["vampiro", "m"],
  warrior: ["guerreiro", "m"],
  wasp: ["vespa", "f"],
  whale: ["orca", "f"],
  wight: ["wight", "m"],
  wisp: ["fogo-fátuo", "m"],
  worm: ["verme", "m"],
  wraith: ["aparição", "f"],
  wyvern: ["wyvern", "f"],
  xorn: ["xorn", "m"]
};

const CONDITION_LABELS = {
  Blinded: "Cego",
  Charmed: "Enfeitiçado",
  Deafened: "Surdo",
  Frightened: "Amedrontado",
  Grappled: "Agarrado",
  Incapacitated: "Incapacitado",
  Invisible: "Invisível",
  Paralyzed: "Paralisado",
  Petrified: "Petrificado",
  Poisoned: "Envenenado",
  Prone: "Caído",
  Restrained: "Contido",
  Unconscious: "Inconsciente",
  Exhaustion: "Exaustão"
};

const VARIANT_RULE_LABELS = {
  "Advantage": "Vantagem",
  "Burrow Speed": "Deslocamento de Escavação",
  "Climb Speed": "Deslocamento de Escalada",
  "Cover": "Cobertura",
  "D20 Test": "Teste de d20",
  "Difficult Terrain": "Terreno Difícil",
  "Dim Light": "Penumbra",
  "Bright Light": "Luz Plena",
  "Emanation [Area of Effect]": "Emanação",
  "Sphere [Area of Effect]": "Esfera",
  "Cone [Area of Effect]": "Cone",
  "Line [Area of Effect]": "Linha",
  "Cube [Area of Effect]": "Cubo",
  "Fly Speed": "Deslocamento de Voo",
  "High Jump": "Salto em Altura",
  "Hit Points": "Pontos de Vida",
  "Immunity": "Imunidade",
  "Initiative": "Iniciativa",
  "Long Jump": "Salto em Distância",
  "Long Rest": "Descanso Longo",
  "Resistance": "Resistência",
  "Speed": "Deslocamento",
  "Swim Speed": "Deslocamento de Natação",
  "Temporary Hit Points": "Pontos de Vida Temporários",
  "Disadvantage": "Desvantagem"
};

const STATUS_LABELS = {Bloodied: "Ferido", Concentration: "Concentração"};
const ACTION_LABELS = {
  Dash: "Disparada",
  Disengage: "Desengajar",
  Hide: "Esconder-se",
  "Opportunity Attack": "Ataque de Oportunidade",
  "Opportunity Attacks": "Ataques de Oportunidade"
};
const SPELL_LABELS = {
  "Guiding Bolt": "Raio Guiador",
  Mending: "Consertar",
  "Mind Spike": "Espinho Mental",
  "Scorching Ray": "Raio Ardente",
  Shatter: "Despedaçar",
  Wish: "Desejo"
};
const SKILL_LABELS = {Insight: "Intuição", Persuasion: "Persuasão"};

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[/^\d+$/.test(part) ? Number(part) : part], root);
}

function collectPresentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (
      root.trim() &&
      isPresentationPath(prefix) &&
      !prefix.includes(".monsterTemplate.") &&
      !prefix.endsWith(".invocation.entity.name")
    ) out[prefix] = root;
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => collectPresentationStrings(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) {
    collectPresentationStrings(value, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function featureTranslationEntries(featureCatalogs) {
  return Object.assign({}, ...(featureCatalogs ?? []).map((catalog) => catalog?.entries ?? {}));
}

export function buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs) {
  const definitions = new Map((featureDefinitions ?? []).map((feature) => [feature.canonicalId, feature]));
  const candidates = new Map();
  const conflicts = new Set();

  for (const catalog of featureCatalogs ?? []) {
    for (const [canonicalId, overlay] of Object.entries(catalog?.entries ?? {})) {
      const definition = definitions.get(canonicalId);
      if (!definition) continue;
      for (const [pathKey, translated] of Object.entries(overlay)) {
        if (typeof translated !== "string") continue;
        const source = getPath(definition, pathKey);
        if (typeof source !== "string" || !source.trim()) continue;
        const previous = candidates.get(source);
        if (previous !== undefined && previous !== translated) {
          conflicts.add(source);
          continue;
        }
        candidates.set(source, translated);
      }
    }
  }

  for (const source of conflicts) candidates.delete(source);
  return candidates;
}

function translateMacro(macro, nameMap = {}) {
  const match = macro.match(/^\{@([^\s}]+)\s+([^}|]+)(?:\|([^}|]*))?(?:\|([^}]*))?\}$/);
  if (!match) return macro;
  const [, type, primary, sourceBook, display] = match;
  let translatedDisplay;
  if (type === "condition") translatedDisplay = CONDITION_LABELS[primary];
  else if (type === "status") translatedDisplay = STATUS_LABELS[primary];
  else if (type === "variantrule") translatedDisplay = VARIANT_RULE_LABELS[primary] ?? VARIANT_RULE_LABELS[primary.replace(/\|.*$/, "")];
  else if (type === "action") translatedDisplay = ACTION_LABELS[display || primary] ?? ACTION_LABELS[primary];
  else if (type === "spell") translatedDisplay = SPELL_LABELS[primary];
  else if (type === "skill") translatedDisplay = SKILL_LABELS[primary];
  else if (type === "creature") translatedDisplay = nameMap[primary];
  else if (type === "hazard" && primary === "burning") translatedDisplay = "em chamas";
  if (!translatedDisplay) return macro;
  return `{@${type} ${primary}${sourceBook ? `|${sourceBook}` : ""}|${translatedDisplay}}`;
}

function protectMacros(text, nameMap = {}) {
  const macros = [];
  const protectedText = text.replace(/\{@[^}]+\}/g, (macro) => {
    const index = macros.push(translateMacro(macro, nameMap)) - 1;
    return `§M${index}§`;
  });
  return {
    text: protectedText,
    restore(value) {
      return value.replace(/§M(\d+)§/g, (_, index) => macros[Number(index)] ?? _);
    }
  };
}

function subjectInfo(word) {
  return SUBJECTS[word?.toLowerCase()];
}

function replaceSubjectForms(text, fromWord, toWord) {
  if (!fromWord || !toWord || fromWord === toWord) return text;
  const from = subjectInfo(fromWord);
  const to = subjectInfo(toWord);
  if (!from || !to) return text;
  const [fromNoun] = from;
  const [toNoun, gender] = to;
  const forms = gender === "f"
    ? [[`O ${fromNoun}`, `A ${toNoun}`], [`o ${fromNoun}`, `a ${toNoun}`], [`do ${fromNoun}`, `da ${toNoun}`], [`no ${fromNoun}`, `na ${toNoun}`], [`pelo ${fromNoun}`, `pela ${toNoun}`]]
    : [[`A ${fromNoun}`, `O ${toNoun}`], [`a ${fromNoun}`, `o ${toNoun}`], [`da ${fromNoun}`, `do ${toNoun}`], [`na ${fromNoun}`, `no ${toNoun}`], [`pela ${fromNoun}`, `pelo ${toNoun}`]];
  let out = text;
  for (const [a, b] of forms) out = out.split(a).join(b);
  out = out.replace(new RegExp(`\\b${escapeRegex(fromNoun)}\\b`, "gi"), (value) => preserveCase(value, toNoun));
  return out;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preserveCase(source, target) {
  if (source[0] === source[0]?.toUpperCase()) return target[0]?.toUpperCase() + target.slice(1);
  return target;
}

function extractSubjects(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const subject of Object.keys(SUBJECTS).sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${escapeRegex(subject)}\\b`).test(lower)) found.push(subject);
  }
  return found;
}

function normalizeProjection(text) {
  let value = text.toLowerCase();
  value = value.replace(/\{@([^\s}]+)[^}]*\}/g, (_, type) => `<${type}>`);
  for (const subject of Object.keys(SUBJECTS).sort((a, b) => b.length - a.length)) {
    value = value.replace(new RegExp(`\\b${escapeRegex(subject)}(?:'s)?\\b`, "g"), "<subject>");
  }
  value = value.replace(/\b(?:Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\b/gi, "<damage>");
  value = value.replace(/\b(?:Tiny|Small|Medium|Large|Huge|Gargantuan)\b/gi, "<size>");
  value = value.replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g, "<n>");
  return value.replace(/\s+/g, " ").trim();
}

function replaceSequentialPlainNumbers(text, base, variant) {
  const withoutMacros = (value) => value.replace(/\{@[^}]+\}/g, "");
  const baseNumbers = withoutMacros(base).match(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g) ?? [];
  const variantNumbers = withoutMacros(variant).match(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g) ?? [];
  if (baseNumbers.length !== variantNumbers.length) return text;
  let index = 0;
  const protectedPt = protectMacros(text);
  const updated = protectedPt.text.replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g, (number) => {
    const next = variantNumbers[index];
    index += 1;
    return next ?? number;
  });
  return protectedPt.restore(updated);
}

function projectVariantTranslation(baseEn, basePt, variantEn, nameMap) {
  if (!baseEn || !basePt || normalizeProjection(baseEn) !== normalizeProjection(variantEn)) return null;
  const baseMacros = baseEn.match(/\{@[^}]+\}/g) ?? [];
  const variantMacros = variantEn.match(/\{@[^}]+\}/g) ?? [];
  const ptMacros = basePt.match(/\{@[^}]+\}/g) ?? [];
  if (baseMacros.length !== variantMacros.length || ptMacros.length !== variantMacros.length) return null;

  let macroIndex = 0;
  let projected = basePt.replace(/\{@[^}]+\}/g, () => translateMacro(variantMacros[macroIndex++], nameMap));
  projected = replaceSequentialPlainNumbers(projected, baseEn, variantEn);

  const baseDamage = baseEn.match(/\b(?:Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\b/g) ?? [];
  const variantDamage = variantEn.match(/\b(?:Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\b/g) ?? [];
  if (baseDamage.length === variantDamage.length) {
    let damageIndex = 0;
    projected = projected.replace(/\b(?:Ácido|Concussão|Frio|Fogo|Força|Elétrico|Necrótico|Perfurante|Veneno|Psíquico|Radiante|Cortante|Trovejante)\b/g, (word) => DAMAGE_TYPES[variantDamage[damageIndex++]] ?? word);
  }

  const baseSubjects = extractSubjects(baseEn);
  const variantSubjects = extractSubjects(variantEn);
  if (baseSubjects.length && variantSubjects.length) projected = replaceSubjectForms(projected, baseSubjects[0], variantSubjects[0]);

  const baseSizes = baseEn.match(/\b(?:Tiny|Small|Medium|Large|Huge|Gargantuan)\b/g) ?? [];
  const variantSizes = variantEn.match(/\b(?:Tiny|Small|Medium|Large|Huge|Gargantuan)\b/g) ?? [];
  if (baseSizes.length === variantSizes.length) {
    let sizeIndex = 0;
    projected = projected.replace(/\b(?:Minúscula|Pequena|Média|Grande|Enorme|Colossal)\b/g, (word) => SIZE_TRANSLATIONS[variantSizes[sizeIndex++]] ?? word);
  }
  return projected;
}

function translateSubjectPhrases(text) {
  let out = text;
  for (const [source, [target, gender]] of Object.entries(SUBJECTS).sort((a, b) => b[0].length - a[0].length)) {
    const article = gender === "f" ? "a" : "o";
    const Article = gender === "f" ? "A" : "O";
    out = out.replace(new RegExp(`\\bThe ${escapeRegex(source)}\\b`, "g"), `${Article} ${target}`);
    out = out.replace(new RegExp(`\\bthe ${escapeRegex(source)}\\b`, "g"), `${article} ${target}`);
    out = out.replace(new RegExp(`\\b${escapeRegex(source)}'s\\b`, "g"), `do ${target}`);
  }
  return out;
}

function translateStatblockText(source, nameMap) {
  const protectedMacros = protectMacros(source, nameMap);
  let text = translateSubjectPhrases(protectedMacros.text);

  const replacements = [
    [/\breach ([\d/]+) ft\./g, "alcance $1 pés."],
    [/\brange ([\d/]+) ft\./g, "distância $1 pés."],
    [/\breach ([\d/]+) ft\. or range ([\d/]+) ft\./g, "alcance $1 pés ou distância $2 pés."],
    [/\bwithin ([\d/]+) feet of itself\b/g, "a até $1 pés de si"],
    [/\bwithin ([\d/]+) feet of the /g, "a até $1 pés d"],
    [/\bwithin ([\d/]+) feet\b/g, "a até $1 pés"],
    [/\bup to ([\d/]+) feet\b/g, "até $1 pés"],
    [/\b([\d/]+)-foot-long, ([\d/]+)-foot-wide /g, "de $1 pés de comprimento e $2 pés de largura "],
    [/\b([\d/]+)-foot-radius /g, "com raio de $1 pés "],
    [/\b([\d/]+)-foot /g, "de $1 pés "],
    [/\b([\d/]+) feet\b/g, "$1 pés"],
    [/\bBludgeoning damage\b/g, "de dano de Concussão"],
    [/\bPiercing damage\b/g, "de dano Perfurante"],
    [/\bSlashing damage\b/g, "de dano Cortante"],
    [/\bAcid damage\b/g, "de dano de Ácido"],
    [/\bCold damage\b/g, "de dano de Frio"],
    [/\bFire damage\b/g, "de dano de Fogo"],
    [/\bForce damage\b/g, "de dano de Força"],
    [/\bLightning damage\b/g, "de dano Elétrico"],
    [/\bNecrotic damage\b/g, "de dano Necrótico"],
    [/\bPoison damage\b/g, "de dano de Veneno"],
    [/\bPsychic damage\b/g, "de dano Psíquico"],
    [/\bRadiant damage\b/g, "de dano Radiante"],
    [/\bThunder damage\b/g, "de dano Trovejante"],
    [/\bHalf damage only\./g, "Apenas metade do dano."],
    [/\bHalf damage\./g, "Metade do dano."],
    [/\bThe target takes\b/g, "O alvo sofre"],
    [/\bthe target takes\b/g, "o alvo sofre"],
    [/\btakes an extra\b/g, "sofre mais"],
    [/\btakes\b/g, "sofre"],
    [/\bdeals double damage to\b/g, "causa o dobro do dano a"],
    [/\bdealing damage to\b/g, "causar dano a"],
    [/\bdealing any damage\b/g, "causar qualquer dano"],
    [/\bdealing damage\b/g, "causar dano"],
    [/\bdealt\b/g, "causado"],
    [/\bdamage rolls\b/g, "jogadas de dano"],
    [/\battack rolls\b/g, "jogadas de ataque"],
    [/\battack roll\b/g, "jogada de ataque"],
    [/\bability checks\b/g, "testes de atributo"],
    [/\bability check\b/g, "teste de atributo"],
    [/\bsaving throws\b/g, "salvaguardas"],
    [/\bsaving throw\b/g, "salvaguarda"],
    [/\bThe target has\b/g, "O alvo recebe"],
    [/\bthe target has\b/g, "o alvo recebe"],
    [/\bhas the §M(\d+)§ condition\b/g, "recebe a condição §M$1§"],
    [/\bhave the §M(\d+)§ condition\b/g, "recebem a condição §M$1§"],
    [/\bhas §M(\d+)§\b/g, "tem §M$1§"],
    [/\bhas\b/g, "tem"],
    [/\bhave\b/g, "têm"],
    [/\bgains\b/g, "ganha"],
    [/\bgain\b/g, "ganhar"],
    [/\bregains\b/g, "recupera"],
    [/\bregain\b/g, "recuperar"],
    [/\bcan't regain\b/g, "não pode recuperar"],
    [/\bcan't take\b/g, "não pode realizar"],
    [/\bcan take\b/g, "pode realizar"],
    [/\bcan cast\b/g, "pode conjurar"],
    [/\bcasts\b/g, "conjura"],
    [/\bcast\b/g, "conjurar"],
    [/\bcan see\b/g, "possa ver"],
    [/\bcan hear\b/g, "possa ouvir"],
    [/\bcan sense\b/g, "possa perceber"],
    [/\bcan breathe\b/g, "pode respirar"],
    [/\bcan climb\b/g, "pode escalar"],
    [/\bcan move\b/g, "pode se mover"],
    [/\bcan fly\b/g, "pode voar"],
    [/\bcan burrow\b/g, "pode escavar"],
    [/\bcan enter\b/g, "pode entrar em"],
    [/\bcan occupy\b/g, "pode ocupar"],
    [/\bcan escape\b/g, "pode escapar"],
    [/\bcan have\b/g, "pode ter"],
    [/\bcan use\b/g, "pode usar"],
    [/\bcan try to\b/g, "pode tentar"],
    [/\bcan choose to\b/g, "pode escolher"],
    [/\bcan redirect\b/g, "pode redirecionar"],
    [/\bcan teleport\b/g, "pode se teleportar"],
    [/\bcan mimic\b/g, "pode imitar"],
    [/\bcan eat through\b/g, "pode corroer"],
    [/\bcan't\b/g, "não pode"],
    [/\bdoesn't\b/g, "não"],
    [/\bisn't\b/g, "não está"],
    [/\baren't\b/g, "não estão"],
    [/\bwithout provoking\b/g, "sem provocar"],
    [/\bwithout needing to make\b/g, "sem precisar realizar"],
    [/\bwithout expending extra movement to do so\b/g, "sem gastar movimento adicional para isso"],
    [/\bwithout an invitation from an occupant\b/g, "sem um convite de um ocupante"],
    [/\bwithout a running start\b/g, "sem tomar impulso"],
    [/\bwith or without a running start\b/g, "com ou sem tomar impulso"],
    [/\bwith a ([\d/]+)-foot running start\b/g, "com $1 pés de impulso"],
    [/\bwhile underwater\b/g, "enquanto estiver debaixo d'água"],
    [/\bunderwater\b/g, "debaixo d'água"],
    [/\bwhile it is\b/g, "enquanto estiver"],
    [/\bwhile the target is\b/g, "enquanto o alvo estiver"],
    [/\bwhile swallowing the target\b/g, "enquanto engole o alvo"],
    [/\bwhile holding a weapon\b/g, "enquanto empunha uma arma"],
    [/\bwhile in sunlight\b/g, "enquanto estiver sob luz solar"],
    [/\bwhile berserk\b/g, "enquanto estiver em frenesi"],
    [/\bwhile doing so\b/g, "ao fazer isso"],
    [/\bwhile on the Material Plane\b/g, "enquanto estiver no Plano Material"],
    [/\bwhile it doesn't have\b/g, "enquanto não tiver"],
    [/\bwhile it has\b/g, "enquanto tiver"],
    [/\bwhile it has at least\b/g, "enquanto tiver pelo menos"],
    [/\bwhile it has a swallowed target\b/g, "enquanto tiver um alvo engolido"],
    [/\bwhile the .*? is §M(\d+)§\b/g, "enquanto estiver §M$1§"],
    [/\buntil the start of its next turn\b/g, "até o início do próximo turno dele"],
    [/\buntil the end of its next turn\b/g, "até o final do próximo turno dele"],
    [/\buntil the end of the target's next turn\b/g, "até o final do próximo turno do alvo"],
    [/\buntil the grapple ends\b/g, "até o agarrão terminar"],
    [/\buntil the weapon is removed\b/g, "até a arma ser removida"],
    [/\buntil it is destroyed\b/g, "até ser destruído"],
    [/\buntil it dies\b/g, "até morrer"],
    [/\buntil the start of the .*?'s next turn\b/g, "até o início do próximo turno da criatura"],
    [/\bat the start of each of its turns\b/g, "no início de cada um de seus turnos"],
    [/\bat the end of each of its turns\b/g, "ao final de cada um de seus turnos"],
    [/\bat the start of its turn\b/g, "no início de seu turno"],
    [/\bat the end of its turn\b/g, "ao final de seu turno"],
    [/\bat the start of each of the .*?'s turns\b/g, "no início de cada turno da criatura"],
    [/\bat the end of each of the .*?'s turns\b/g, "ao final de cada turno da criatura"],
    [/\bat the end of the .*?'s next turn\b/g, "ao final do próximo turno da criatura"],
    [/\bat the end of the .*?'s turns\b/g, "ao final dos turnos da criatura"],
    [/\bat the end of that turn\b/g, "ao final daquele turno"],
    [/\bat the end of this turn\b/g, "ao final deste turno"],
    [/\bat the end of the current turn\b/g, "ao final do turno atual"],
    [/\bat the end of each turn\b/g, "ao final de cada turno"],
    [/\bat the start of each turn\b/g, "no início de cada turno"],
    [/\bfor 1 minute\b/g, "por 1 minuto"],
    [/\bfor 10 minutes\b/g, "por 10 minutos"],
    [/\bfor 1 hour\b/g, "por 1 hora"],
    [/\bfor 24 hours\b/g, "por 24 horas"],
    [/\bfor 365 days\b/g, "por 365 dias"],
    [/\bfor the next 24 hours\b/g, "pelas próximas 24 horas"],
    [/\bfor an additional\b/g, "por mais"],
    [/\bfor the creature\b/g, "para a criatura"],
    [/\bfor the target\b/g, "para o alvo"],
    [/\bfor the .*?\b/g, "para a criatura"],
    [/\bfor\b/g, "por"],
    [/\bImmediately after\b/g, "Imediatamente após"],
    [/\bimmediately after\b/g, "imediatamente após"],
    [/\bimmediately before\b/g, "imediatamente antes"],
    [/\bAt the end of\b/g, "Ao final de"],
    [/\bAt the start of\b/g, "No início de"],
    [/\bIf the target is a ([A-Z][a-z]+) or smaller creature\b/g, (_, size) => `Se o alvo for uma criatura ${SIZE_TRANSLATIONS[size] ?? size} ou menor`],
    [/\bIf the target is ([A-Z][a-z]+) or smaller\b/g, (_, size) => `Se o alvo for ${SIZE_TRANSLATIONS[size] ?? size} ou menor`],
    [/\bone ([A-Z][a-z]+) or smaller creature\b/g, (_, size) => `uma criatura ${SIZE_TRANSLATIONS[size] ?? size} ou menor`],
    [/\beach creature\b/g, "cada criatura"],
    [/\bEach creature\b/g, "Cada criatura"],
    [/\bone creature\b/g, "uma criatura"],
    [/\bone enemy\b/g, "um inimigo"],
    [/\beach enemy\b/g, "cada inimigo"],
    [/\bany creature\b/g, "qualquer criatura"],
    [/\ban enemy\b/g, "um inimigo"],
    [/\ban ally\b/g, "um aliado"],
    [/\ba creature\b/g, "uma criatura"],
    [/\bcreatures\b/g, "criaturas"],
    [/\bcreature\b/g, "criatura"],
    [/\bthe target\b/g, "o alvo"],
    [/\bThe target\b/g, "O alvo"],
    [/\bthe triggering creature\b/g, "a criatura que acionou a reação"],
    [/\bthe triggering attack\b/g, "o ataque que acionou a reação"],
    [/\bthe attack\b/g, "o ataque"],
    [/\bthe spell\b/g, "a magia"],
    [/\bthe effect\b/g, "o efeito"],
    [/\bthe grapple\b/g, "o agarrão"],
    [/\bthe weapon\b/g, "a arma"],
    [/\bthe armor\b/g, "a armadura"],
    [/\bthe object\b/g, "o objeto"],
    [/\bthe corpse\b/g, "o cadáver"],
    [/\bthe space\b/g, "o espaço"],
    [/\bthe material\b/g, "o material"],
    [/\bthe same web\b/g, "a mesma teia"],
    [/\bthe Abyss\b/g, "o Abismo"],
    [/\bthe Nine Hells\b/g, "os Nove Infernos"],
    [/\bthe Elemental Plane of Fire\b/g, "o Plano Elemental do Fogo"],
    [/\bthe Plane of Fire\b/g, "o Plano do Fogo"],
    [/\bthe Ethereal Plane\b/g, "o Plano Etéreo"],
    [/\bthe Material Plane\b/g, "o Plano Material"],
    [/\bMount Celestia\b/g, "Monte Celestia"],
    [/\boutside\b/g, "fora de"],
    [/\bsomewhere in\b/g, "em algum lugar de"],
    [/\bsomewhere on\b/g, "em algum lugar no"],
    [/\bstraight toward\b/g, "em linha reta em direção a"],
    [/\bstraight away from\b/g, "em linha reta para longe de"],
    [/\bin a random direction\b/g, "em uma direção aleatória"],
    [/\bin sunlight\b/g, "sob luz solar"],
    [/\bin running water\b/g, "em água corrente"],
    [/\bin its resting place\b/g, "em seu local de repouso"],
    [/\bin contact with\b/g, "em contato com"],
    [/\bin the same space\b/g, "no mesmo espaço"],
    [/\bin an unoccupied space\b/g, "para um espaço desocupado"],
    [/\bin a space\b/g, "em um espaço"],
    [/\bin that area\b/g, "nessa área"],
    [/\bin the area\b/g, "na área"],
    [/\bin that turn\b/g, "naquele turno"],
    [/\bin its wake\b/g, "em seu rastro"],
    [/\bin the current turn\b/g, "no turno atual"],
    [/\bin a way .*? can understand\b/g, "de uma forma que possa compreender"],
    [/\bor vice versa\b/g, "ou vice-versa"],
    [/\band vice versa\b/g, "e vice-versa"],
    [/\bplus\b/g, "mais"],
    [/\botherwise\b/g, "caso contrário"],
    [/\binstead\b/g, "em vez disso"],
    [/\bon a success\b/g, "em caso de sucesso"],
    [/\bon a miss\b/g, "se errar"],
    [/\bon attack rolls\b/g, "em jogadas de ataque"],
    [/\bon ability checks\b/g, "em testes de atributo"],
    [/\bon Strength-based\b/g, "em testes baseados em Força"],
    [/\bon behalf of\b/g, "em nome de"],
    [/\bfrom the attack\b/g, "do ataque"],
    [/\bfrom the spell\b/g, "da magia"],
    [/\bfrom the corpse\b/g, "do cadáver"],
    [/\bfrom one of\b/g, "por um de"],
    [/\bfrom both\b/g, "por ambos"],
    [/\bfrom all four\b/g, "pelos quatro"],
    [/\bfrom itself\b/g, "de si"],
    [/\bof itself\b/g, "de si"],
    [/\bof its choice\b/g, "à sua escolha"],
    [/\bof the target\b/g, "do alvo"],
    [/\bof movement\b/g, "de movimento"],
    [/\bof its turns\b/g, "de seus turnos"],
    [/\bof its next turn\b/g, "de seu próximo turno"],
    [/\bof the .*?\b/g, "da criatura"],
    [/\bto its AC\b/g, "à sua CA"],
    [/\bto AC\b/g, "à CA"],
    [/\bto attack rolls\b/g, "nas jogadas de ataque"],
    [/\bto maintain\b/g, "para manter"],
    [/\bto move\b/g, "para se mover"],
    [/\bto wake it\b/g, "para acordá-lo"],
    [/\bto calm it\b/g, "para acalmá-lo"],
    [/\bto determine what it does\b/g, "para determinar o que faz"],
    [/\bto hear its creator\b/g, "ouvir seu criador"],
    [/\bto the roll\b/g, "à jogada"],
    [/\bto life\b/g, "à vida"],
    [/\bto ash\b/g, "em cinzas"],
    [/\bto ichor\b/g, "em icor"],
    [/\bto dust\b/g, "em pó"],
    [/\binto two new\b/g, "em dois novos"],
    [/\binto a ([A-Z][a-z]+) or ([A-Z][a-z]+) Humanoid\b/g, (_, a, b) => `em um Humanoide ${SIZE_TRANSLATIONS[a] ?? a} ou ${SIZE_TRANSLATIONS[b] ?? b}`],
    [/\binto a\b/g, "em um"],
    [/\binto\b/g, "para dentro de"],
    [/\bthrough a space as narrow as\b/g, "através de um espaço de apenas"],
    [/\bthrough other creatures and objects as if they were\b/g, "através de outras criaturas e objetos como se fossem"],
    [/\bthrough any opening large enough for\b/g, "através de qualquer abertura grande o bastante para"],
    [/\bthrough solid rock\b/g, "através de rocha sólida"],
    [/\bthrough nonmagical, unworked earth and stone\b/g, "através de terra e pedra naturais e não mágicas"],
    [/\bmove through\b/g, "atravessar"],
    [/\bmoves up to\b/g, "move-se até"],
    [/\bmoves\b/g, "move-se"],
    [/\bmove up to\b/g, "mover-se até"],
    [/\bmove\b/g, "mover-se"],
    [/\bteleports up to\b/g, "teleporta-se até"],
    [/\bteleports\b/g, "teleporta-se"],
    [/\bflies up to\b/g, "voa até"],
    [/\bflies\b/g, "voa"],
    [/\bjumps up to\b/g, "salta até"],
    [/\bjumps\b/g, "salta"],
    [/\bburrow through\b/g, "escavar através de"],
    [/\bignores movement restrictions caused by webs\b/g, "ignora restrições de movimento causadas por teias"],
    [/\bknows the location of\b/g, "sabe a localização de"],
    [/\bknows if it hears a lie\b/g, "sabe quando ouve uma mentira"],
    [/\bknowing the\b/g, "conhecendo"],
    [/\bstarts its turn\b/g, "inicia seu turno"],
    [/\bends its turn\b/g, "termina seu turno"],
    [/\bends the effect on itself\b/g, "encerra o efeito sobre si"],
    [/\bending the effect on itself\b/g, "encerrando o efeito sobre si"],
    [/\bending the effect\b/g, "encerrando o efeito"],
    [/\bThis effect ends\b/g, "Este efeito termina"],
    [/\bThe effect ends\b/g, "O efeito termina"],
    [/\bThis effect lasts\b/g, "Este efeito dura"],
    [/\bThis trait doesn't function\b/g, "Este traço não funciona"],
    [/\bthis trait from functioning\b/g, "este traço de funcionar"],
    [/\bthis action\b/g, "esta ação"],
    [/\bthis attack\b/g, "este ataque"],
    [/\bthis grapple\b/g, "este agarrão"],
    [/\bthis breath\b/g, "este sopro"],
    [/\bthis turn\b/g, "este turno"],
    [/\bthis effect\b/g, "este efeito"],
    [/\bthis damage\b/g, "este dano"],
    [/\bthis .*?\b/g, "esta criatura"],
    [/\bthat attack\b/g, "esse ataque"],
    [/\bthat damage\b/g, "esse dano"],
    [/\bthat turn\b/g, "esse turno"],
    [/\bthat effect\b/g, "esse efeito"],
    [/\bthat is already\b/g, "que já esteja"],
    [/\bthat starts its turn\b/g, "que iniciar seu turno"],
    [/\bthat it can see\b/g, "que possa ver"],
    [/\bthat it has heard\b/g, "que tenha ouvido"],
    [/\bthat isn't being worn or carried\b/g, "que não esteja vestido nem carregado"],
    [/\bthat isn't currently affected by\b/g, "que não esteja atualmente afetada por"],
    [/\bthat has\b/g, "que tenha"],
    [/\bthat was already\b/g, "que já estava"],
    [/\bthat are\b/g, "que estejam"],
    [/\bthat can\b/g, "que possa"],
    [/\bwhen it dies\b/g, "quando morre"],
    [/\bwhen destroyed\b/g, "quando destruído"],
    [/\bwhen it moves\b/g, "quando se move"],
    [/\bwhen it flies\b/g, "quando voa"],
    [/\bwhen it takes\b/g, "quando sofre"],
    [/\bwhen it makes\b/g, "quando realiza"],
    [/\bwhen it starts\b/g, "quando inicia"],
    [/\bwhen it ends\b/g, "quando termina"],
    [/\bwhen the .*? dies\b/g, "quando a criatura morre"],
    [/\bwhen the .*? moves\b/g, "quando a criatura se move"],
    [/\bwhen the .*? takes\b/g, "quando a criatura sofre"],
    [/\bwhenever it\b/g, "sempre que"],
    [/\bWhenever it\b/g, "Sempre que"],
    [/\bwhenever the .*?\b/g, "sempre que a criatura"],
    [/\bWhenever the .*?\b/g, "Sempre que a criatura"],
    [/\bif it starts its turn\b/g, "se iniciar seu turno"],
    [/\bif it ends its turn\b/g, "se terminar seu turno"],
    [/\bif it takes damage\b/g, "se sofrer dano"],
    [/\bif it takes\b/g, "se sofrer"],
    [/\bif it has\b/g, "se tiver"],
    [/\bif it is\b/g, "se estiver"],
    [/\bif reduced to\b/g, "se for reduzida a"],
    [/\bif the target\b/g, "se o alvo"],
    [/\bIf the target\b/g, "Se o alvo"],
    [/\bif the .*?\b/g, "se a criatura"],
    [/\bIf the .*?\b/g, "Se a criatura"],
    [/\bIf no creature is near enough to move to and attack\b/g, "Se nenhuma criatura estiver perto o bastante para que ela se mova e ataque"],
    [/\bIf this check succeeds\b/g, "Se esse teste for bem-sucedido"],
    [/\bIf the check succeeds\b/g, "Se o teste for bem-sucedido"],
    [/\bIf the .*? succeeds\b/g, "Se a criatura obtiver sucesso"],
    [/\bIf the .*? fails\b/g, "Se a criatura falhar"],
    [/\bIf\b/g, "Se"],
    [/\bif\b/g, "se"],
    [/\bEach new\b/g, "Cada novo"],
    [/\beach new\b/g, "cada novo"],
    [/\bEach\b/g, "Cada"],
    [/\beach\b/g, "cada"],
    [/\bThe original\b/g, "O original"],
    [/\bthe original\b/g, "o original"],
    [/\bThe .*? uses\b/g, "A criatura usa"],
    [/\bthe .*? uses\b/g, "a criatura usa"],
    [/\bThe .*? makes\b/g, "A criatura realiza"],
    [/\bthe .*? makes\b/g, "a criatura realiza"],
    [/\bThe .*? attacks\b/g, "A criatura ataca"],
    [/\bthe .*? attacks\b/g, "a criatura ataca"],
    [/\bThe .*? explodes\b/g, "A criatura explode"],
    [/\bThe .*? sheds\b/g, "A criatura emite"],
    [/\bThe .*? pulls\b/g, "A criatura puxa"],
    [/\bThe .*? is\b/g, "A criatura está"],
    [/\bthe .*? is\b/g, "a criatura está"],
    [/\bThe .*? can\b/g, "A criatura pode"],
    [/\bthe .*? can\b/g, "a criatura pode"],
    [/\bThe .*? has\b/g, "A criatura tem"],
    [/\bthe .*? has\b/g, "a criatura tem"],
    [/\bThe .*? regains\b/g, "A criatura recupera"],
    [/\bthe .*? regains\b/g, "a criatura recupera"],
    [/\bThe .*? moves\b/g, "A criatura se move"],
    [/\bthe .*? moves\b/g, "a criatura se move"],
    [/\bThe .*? dies\b/g, "A criatura morre"],
    [/\bthe .*? dies\b/g, "a criatura morre"],
    [/\bThe .*? knows\b/g, "A criatura sabe"],
    [/\bthe .*? knows\b/g, "a criatura sabe"],
    [/\bThe .*? returns\b/g, "A criatura retorna"],
    [/\bthe .*? returns\b/g, "a criatura retorna"],
    [/\bThe .*? repeats\b/g, "A criatura repete"],
    [/\bthe .*? repeats\b/g, "a criatura repete"],
    [/\bThe .*? chooses\b/g, "A criatura escolhe"],
    [/\bthe .*? chooses\b/g, "a criatura escolhe"],
    [/\bThe .*? reduces\b/g, "A criatura reduz"],
    [/\bthe .*? reduces\b/g, "a criatura reduz"],
    [/\bThe .*? splits\b/g, "A criatura se divide"],
    [/\bthe .*? splits\b/g, "a criatura se divide"],
    [/\bThe .*? shape-shifts\b/g, "A criatura muda de forma"],
    [/\bthe .*? shape-shifts\b/g, "a criatura muda de forma"],
    [/\bThe .*? doesn't\b/g, "A criatura não"],
    [/\bthe .*? doesn't\b/g, "a criatura não"],
    [/\bThe .*?\b/g, "A criatura"],
    [/\bthe .*?\b/g, "a criatura"],
    [/\bis subjected to\b/g, "for submetida a"],
    [/\bsubjected to\b/g, "submetida a"],
    [/\bis destroyed\b/g, "é destruído"],
    [/\bare destroyed\b/g, "são destruídos"],
    [/\bis swallowed\b/g, "é engolido"],
    [/\bis pulled\b/g, "é puxado"],
    [/\bis pushed\b/g, "é empurrado"],
    [/\bis reduced\b/g, "é reduzido"],
    [/\bis divided evenly between\b/g, "é dividido igualmente entre"],
    [/\bis halved\b/g, "é reduzido à metade"],
    [/\bis immune to\b/g, "fica imune a"],
    [/\bis no longer\b/g, "deixa de estar"],
    [/\bis still\b/g, "ainda está"],
    [/\bis already\b/g, "já está"],
    [/\bis Large or Medium\b/g, "for Grande ou Média"],
    [/\bis a creature\b/g, "for uma criatura"],
    [/\bis a Humanoid\b/g, "for um Humanoide"],
    [/\bis a flammable object\b/g, "for um objeto inflamável"],
    [/\bis within range\b/g, "estiver ao alcance"],
    [/\bis near enough\b/g, "estiver perto o bastante"],
    [/\bis able to\b/g, "conseguir"],
    [/\bis\b/g, "é"],
    [/\bare\b/g, "são"],
    [/\bbecomes\b/g, "fica"],
    [/\bbecome\b/g, "ficar"],
    [/\bremains\b/g, "permanece"],
    [/\bremain\b/g, "permanecer"],
    [/\brepeats\b/g, "repete"],
    [/\brepeat\b/g, "repetir"],
    [/\bsucceeds automatically\b/g, "obtém sucesso automaticamente"],
    [/\bsucceed automatically\b/g, "obter sucesso automaticamente"],
    [/\bsucceed instead\b/g, "obter sucesso em vez disso"],
    [/\bsucceed\b/g, "obter sucesso"],
    [/\bfails\b/g, "falha"],
    [/\bfail\b/g, "falhar"],
    [/\bpossibly causing it to miss\b/g, "possivelmente fazendo o ataque errar"],
    [/\bcausing it to miss\b/g, "fazendo o ataque errar"],
    [/\bcausing the attack to miss\b/g, "fazendo o ataque errar"],
    [/\bcausing\b/g, "fazendo"],
    [/\bending\b/g, "encerrando"],
    [/\bfreeing\b/g, "libertando"],
    [/\bexiting\b/g, "saindo"],
    [/\breviving with all its\b/g, "revivendo com todos os seus"],
    [/\breviving\b/g, "revivendo"],
    [/\brestored to life\b/g, "trazido de volta à vida"],
    [/\brestored\b/g, "restaurado"],
    [/\bdestroyed\b/g, "destruído"],
    [/\bdisappears\b/g, "desaparece"],
    [/\bdissolves\b/g, "se dissolve"],
    [/\breturns to life\b/g, "retorna à vida"],
    [/\breturns\b/g, "retorna"],
    [/\brises\b/g, "se ergue"],
    [/\bstarts §M(\d+)§\b/g, "fica §M$1§"],
    [/\bstarts\b/g, "começa"],
    [/\bstops\b/g, "para"],
    [/\bends\b/g, "termina"],
    [/\bends early\b/g, "termina antecipadamente"],
    [/\bends the effect\b/g, "encerra o efeito"],
    [/\bending\b/g, "encerrando"],
    [/\buses all its movement\b/g, "usa todo o seu movimento"],
    [/\buses\b/g, "usa"],
    [/\buse\b/g, "usar"],
    [/\bmakes one\b/g, "realiza um"],
    [/\bmakes a melee attack\b/g, "realiza um ataque corpo a corpo"],
    [/\bmakes\b/g, "realiza"],
    [/\bmake\b/g, "realizar"],
    [/\battacks\b/g, "ataca"],
    [/\battack\b/g, "atacar"],
    [/\bchooses\b/g, "escolhe"],
    [/\bchoose\b/g, "escolher"],
    [/\badds\b/g, "adiciona"],
    [/\bsubtracts\b/g, "subtrai"],
    [/\breduces\b/g, "reduz"],
    [/\breduce\b/g, "reduzir"],
    [/\bsplits\b/g, "se divide"],
    [/\bsplit\b/g, "dividir-se"],
    [/\brolls\b/g, "rola"],
    [/\broll\b/g, "rolar"],
    [/\bcommunicates a wish\b/g, "comunicar um desejo"],
    [/\bsuffers none of\b/g, "não sofre nenhum dos"],
    [/\bsuffers\b/g, "sofre"],
    [/\bsuffer\b/g, "sofrer"],
    [/\bsees its reflection\b/g, "vir seu reflexo"],
    [/\bsees\b/g, "vê"],
    [/\bhears\b/g, "ouve"],
    [/\bheard\b/g, "ouvido"],
    [/\bknows\b/g, "sabe"],
    [/\bknowing\b/g, "sabendo"],
    [/\bunderstand\b/g, "compreender"],
    [/\boccupant\b/g, "ocupante"],
    [/\bresidence\b/g, "residência"],
    [/\bweapon\b/g, "arma"],
    [/\bweapons\b/g, "armas"],
    [/\barmor\b/g, "armadura"],
    [/\bammunition\b/g, "munição"],
    [/\bobjects\b/g, "objetos"],
    [/\bobject\b/g, "objeto"],
    [/\bstructures\b/g, "estruturas"],
    [/\bwebs\b/g, "teias"],
    [/\bweb\b/g, "teia"],
    [/\bopening\b/g, "abertura"],
    [/\bspace\b/g, "espaço"],
    [/\bspaces\b/g, "espaços"],
    [/\bmovement\b/g, "movimento"],
    [/\bdirection\b/g, "direção"],
    [/\bcurrent\b/g, "corrente"],
    [/\bstrong\b/g, "forte"],
    [/\bsimilar\b/g, "semelhante"],
    [/\bink\b/g, "tinta"],
    [/\bflames\b/g, "chamas"],
    [/\bflame\b/g, "chama"],
    [/\bfire\b/g, "fogo"],
    [/\bwater\b/g, "água"],
    [/\bair\b/g, "ar"],
    [/\bearth\b/g, "terra"],
    [/\bstone\b/g, "pedra"],
    [/\bmetal\b/g, "metal"],
    [/\bwood\b/g, "madeira"],
    [/\bpoison\b/g, "veneno"],
    [/\bsunlight\b/g, "luz solar"],
    [/\bheart\b/g, "coração"],
    [/\bstake\b/g, "estaca"],
    [/\bstress\b/g, "estresse"],
    [/\bdays\b/g, "dias"],
    [/\bday\b/g, "dia"],
    [/\bhours\b/g, "horas"],
    [/\bhour\b/g, "hora"],
    [/\bminutes\b/g, "minutos"],
    [/\bminute\b/g, "minuto"],
    [/\bround\b/g, "rodada"],
    [/\bturns\b/g, "turnos"],
    [/\bturn\b/g, "turno"],
    [/\baction\b/g, "ação"],
    [/\bReactions\b/g, "Reações"],
    [/\bReaction\b/g, "Reação"],
    [/\bmelee\b/g, "corpo a corpo"],
    [/\branged\b/g, "à distância"],
    [/\bnearest\b/g, "mais próxima"],
    [/\brandomly determined\b/g, "determinada aleatoriamente"],
    [/\bnonmagical\b/g, "não mágico"],
    [/\bmagical\b/g, "mágico"],
    [/\bflammable\b/g, "inflamável"],
    [/\boriginal\b/g, "original"],
    [/\bnew body\b/g, "novo corpo"],
    [/\bnew\b/g, "novo"],
    [/\bbody\b/g, "corpo"],
    [/\bsounds\b/g, "sons"],
    [/\bsound\b/g, "som"],
    [/\bwhisper\b/g, "sussurro"],
    [/\bchitter\b/g, "guincho"],
    [/\bimitations\b/g, "imitações"],
    [/\bsuccessful\b/g, "bem-sucedido"],
    [/\bcurrent\b/g, "atual"],
    [/\bnext\b/g, "próximo"],
    [/\bprevious\b/g, "anterior"],
    [/\ball\b/g, "todos"],
    [/\bany\b/g, "qualquer"],
    [/\bonly\b/g, "apenas"],
    [/\bmore than\b/g, "mais de"],
    [/\bno more than\b/g, "no máximo"],
    [/\bat least\b/g, "pelo menos"],
    [/\bhalf\b/g, "metade"],
    [/\bdouble\b/g, "dobro"],
    [/\bextra\b/g, "adicional"],
    [/\bequal to\b/g, "igual a"],
    [/\bequal\b/g, "igual"],
    [/\blarge enough\b/g, "grande o bastante"],
    [/\bnear enough\b/g, "perto o bastante"],
    [/\bsame\b/g, "mesmo"],
    [/\bdifferent\b/g, "diferente"],
    [/\bfirst\b/g, "primeiro"],
    [/\bsecond\b/g, "segundo"],
    [/\bthird\b/g, "terceiro"],
    [/\bonce\b/g, "uma vez"],
    [/\bagain\b/g, "novamente"],
    [/\bautomatically\b/g, "automaticamente"],
    [/\binstantly\b/g, "instantaneamente"],
    [/\bearly\b/g, "antecipadamente"],
    [/\bevenly\b/g, "igualmente"],
    [/\bimmediately\b/g, "imediatamente"],
    [/\brandom\b/g, "aleatória"],
    [/\bcurrently\b/g, "atualmente"],
    [/\balready\b/g, "já"],
    [/\bstill\b/g, "ainda"],
    [/\beither\b/g, "qualquer uma"],
    [/\bboth\b/g, "ambas"],
    [/\banother\b/g, "outra"],
    [/\bother\b/g, "outra"],
    [/\bsome\b/g, "alguma"],
    [/\bnone\b/g, "nenhum"],
    [/\bnothing\b/g, "nada"],
    [/\bnot\b/g, "não"],
    [/\bwith\b/g, "com"],
    [/\bwithout\b/g, "sem"],
    [/\bagainst\b/g, "contra"],
    [/\bbefore\b/g, "antes de"],
    [/\bafter\b/g, "após"],
    [/\bduring\b/g, "durante"],
    [/\bwhile\b/g, "enquanto"],
    [/\buntil\b/g, "até"],
    [/\bwithin\b/g, "a até"],
    [/\btoward\b/g, "em direção a"],
    [/\baway from\b/g, "para longe de"],
    [/\boutside of\b/g, "fora de"],
    [/\boutside\b/g, "fora de"],
    [/\binside\b/g, "dentro de"],
    [/\bunder\b/g, "sob"],
    [/\bover\b/g, "sobre"],
    [/\bbetween\b/g, "entre"],
    [/\bfrom\b/g, "de"],
    [/\binto\b/g, "em"],
    [/\bonto\b/g, "sobre"],
    [/\bthrough\b/g, "através de"],
    [/\bby\b/g, "por"],
    [/\babout\b/g, "sobre"],
    [/\bbecause\b/g, "porque"],
    [/\bunless\b/g, "a menos que"],
    [/\bwhere\b/g, "onde"],
    [/\bwhich\b/g, "que"],
    [/\bwho\b/g, "que"],
    [/\bwhose\b/g, "cujo"],
    [/\bwhen\b/g, "quando"],
    [/\bthen\b/g, "então"],
    [/\botherwise\b/g, "caso contrário"],
    [/\band\b/g, "e"],
    [/\bor\b/g, "ou"],
    [/\bits\b/g, "seu"],
    [/\bitself\b/g, "si"],
    [/\bit\b/g, "ele"],
    [/\bthey\b/g, "eles"],
    [/\bthem\b/g, "eles"],
    [/\btheir\b/g, "seus"],
    [/\ba\b/g, "uma"],
    [/\ban\b/g, "uma"],
    [/\bthe\b/g, "o"],
    [/\bof\b/g, "de"],
    [/\bto\b/g, "para"],
    [/\bin\b/g, "em"],
    [/\bon\b/g, "em"],
    [/\bat\b/g, "em"],
    [/\bas\b/g, "como"],
    [/\bis\b/g, "é"],
    [/\bare\b/g, "são"]
  ];

  for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
  for (const [sourceType, translatedType] of Object.entries(DAMAGE_TYPES)) {
    text = text.replace(new RegExp(`\\b${sourceType}\\b`, "g"), translatedType);
  }
  for (const [sourceSize, translatedSize] of Object.entries(SIZE_TRANSLATIONS)) {
    text = text.replace(new RegExp(`\\b${sourceSize}\\b`, "g"), translatedSize);
  }

  return protectedMacros.restore(text)
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function canonicalFeatureDescription(definition) {
  const candidates = [
    definition?.data?.text?.description,
    definition?.data?.text?.rules?.[0],
    definition?.data?.activities?.[0]?.description
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) ?? "";
}

function translatedFeatureDescription(definition, featureOverlay, sourceTranslations) {
  const base = canonicalFeatureDescription(definition);
  if (!base) return "";
  if (sourceTranslations.has(base)) return sourceTranslations.get(base);
  for (const [pathKey, translated] of Object.entries(featureOverlay ?? {})) {
    if (getPath(definition, pathKey) === base && typeof translated === "string") return translated;
  }
  return "";
}

export function buildMonsterLocalizationCatalog({
  monsters,
  featureDefinitions,
  featureCatalogs,
  nameMap,
  explicitEntries = {}
}) {
  const sourceTranslations = buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs);
  const names = nameMap?.names ?? {};
  const definitions = new Map((featureDefinitions ?? []).map((feature) => [feature.canonicalId, feature]));
  const featureEntries = featureTranslationEntries(featureCatalogs);
  const entries = {};

  for (const monster of monsters ?? []) {
    const overlay = {};
    const explicit = explicitEntries[monster.canonicalId] ?? {};
    for (const [pathKey, source] of Object.entries(collectPresentationStrings(monster))) {
      let translated;
      if (typeof explicit[pathKey] === "string") translated = explicit[pathKey];
      else if (pathKey === "name") translated = names[source];
      else if (sourceTranslations.has(source)) translated = sourceTranslations.get(source);
      else if (MATERIALIZED_FEATURE_NAME_TRANSLATIONS.has(source)) translated = MATERIALIZED_FEATURE_NAME_TRANSLATIONS.get(source);
      else {
        const descriptionMatch = pathKey.match(/^data\.features\.(\d+)\.text\.description$/);
        if (descriptionMatch) {
          const instance = monster.data?.features?.[Number(descriptionMatch[1])];
          const definitionId = instance?.definition?.canonicalId;
          const definition = definitions.get(definitionId);
          if (definition) {
            const baseEn = canonicalFeatureDescription(definition);
            const basePt = translatedFeatureDescription(definition, featureEntries[definitionId], sourceTranslations);
            translated = projectVariantTranslation(baseEn, basePt, source, names) ?? translateStatblockText(source, names);
          }
        }
      }

      if (typeof translated === "string" && translated.length) overlay[pathKey] = translated;
    }
    entries[monster.canonicalId] = overlay;
  }

  return {
    format: "oraclerpg-localization",
    version: 1,
    locale: "pt-BR",
    sourceLocale: "en",
    contentSource: "srd-5.2",
    entityType: "monster",
    scope: "monsters",
    entries
  };
}

export function collectMonsterPresentationStrings(monster) {
  return collectPresentationStrings(monster);
}
