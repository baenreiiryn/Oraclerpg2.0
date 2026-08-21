import type { CanonicalContentType } from "@oraclerpg/schema";
import type { CreatorFieldDefinition, CreatorFormDefinition, CreatorSectionDefinition } from "./types.js";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"] as const;
const SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;

const field = (id: string, path: string, label: string, kind: CreatorFieldDefinition["kind"], extra: Omit<CreatorFieldDefinition, "id" | "path" | "label" | "kind"> = {}): CreatorFieldDefinition => ({ id, path, label, kind, ...extra });
const section = (id: string, label: string, fields: readonly CreatorFieldDefinition[], extra: Omit<CreatorSectionDefinition, "id" | "label" | "fields"> = {}): CreatorSectionDefinition => ({ id, label, fields, ...extra });
const textSection = section("text", "Texto e descrição", [field("text", "text", "Texto de regras", "richEntries")]);

export const HOME_BREW_CREATOR_FORMS = {
  item: {
    type: "item",
    label: "Item",
    description: "Editor canônico de armas, armaduras, equipamentos, consumíveis, ferramentas, recipientes, packs, montarias e outros itens.",
    sections: [
      section("item-core", "Dados básicos", [
        field("itemKind", "itemKind", "Tipo de item", "select", { required: true, options: ["weapon", "armor", "equipment", "consumable", "tool", "container", "pack", "mount", "vehiclePurchase", "loot", "charm", "upgrade"] }),
        field("quantity", "quantity", "Quantidade de referência", "number", { min: 0 }),
        field("weight", "weight", "Peso", "object"),
        field("price", "price", "Preço", "object"),
        field("rarity", "rarity", "Raridade", "select", { options: ["common", "uncommon", "rare", "veryRare", "legendary", "artifact", "varies", "unknown"] }),
        field("magical", "magical", "Mágico", "boolean"),
        field("cursed", "cursed", "Amaldiçoado", "boolean"),
        field("attunement", "attunement", "Sintonia", "select", { options: ["none", "required", "optional", "special"] }),
        field("attunementRequirements", "attunementRequirements", "Requisitos de sintonia", "object"),
        field("properties", "properties", "Propriedades", "collection"),
      ]),
      section("weapon", "Arma", [
        field("weaponCategory", "category", "Categoria", "select", { required: true, options: ["simple", "martial", "improvised", "natural", "special"] }),
        field("mode", "mode", "Modo", "select", { required: true, options: ["melee", "ranged"] }),
        field("damage", "damage", "Dano", "object", { required: true }),
        field("range", "range", "Alcance", "object"),
        field("mastery", "mastery", "Mastery", "text"),
        field("ammunitionType", "ammunitionType", "Tipo de munição", "text"),
        field("magicalBonus", "magicalBonus", "Bônus mágico", "object"),
      ], { condition: { path: "itemKind", equals: "weapon" } }),
      section("armor", "Armadura", [
        field("armorCategory", "category", "Categoria", "select", { required: true, options: ["light", "medium", "heavy", "shield", "natural", "other"] }),
        field("armorClass", "armorClass", "Classe de Armadura", "object", { required: true }),
        field("strengthRequirement", "strengthRequirement", "Força mínima", "number", { min: 0 }),
        field("stealthDisadvantage", "stealthDisadvantage", "Desvantagem em Furtividade", "boolean"),
      ], { condition: { path: "itemKind", equals: "armor" } }),
      section("consumable", "Consumível", [
        field("consumableType", "consumableType", "Tipo", "select", { options: ["potion", "poison", "food", "scroll", "ammo", "charge", "other"] }),
        field("consumeOnUse", "consumeOnUse", "Consumir ao usar", "boolean"),
        field("poisonApplicationTypes", "poisonApplicationTypes", "Aplicação de veneno", "multiselect", { options: ["contact", "ingested", "inhaled", "injury"] }),
        field("spellScrollLevel", "spellScrollLevel", "Nível de scroll", "number", { min: 0, max: 9 }),
      ], { condition: { path: "itemKind", equals: "consumable" } }),
      section("tool", "Ferramenta", [field("toolType", "toolType", "Tipo de ferramenta", "text"), field("ability", "ability", "Atributo associado", "text")], { condition: { path: "itemKind", equals: "tool" } }),
      section("container", "Recipiente", [
        field("containerType", "containerType", "Tipo", "select", { options: ["quiver", "pouch", "sack", "backpack", "chest", "case", "vessel", "other"] }),
        field("capacity", "capacity", "Capacidade", "object"),
        field("compartments", "compartments", "Compartimentos", "collection"),
        field("contents", "contents", "Conteúdo padrão", "collection"),
        field("restrictsTo", "restrictsTo", "Restrições", "collection"),
      ], { condition: { path: "itemKind", equals: "container" } }),
      section("pack", "Pacote", [
        field("packType", "packType", "Tipo de pacote", "select", { options: ["equipment", "ammunition", "toolKit", "bundle", "other"] }),
        field("packContents", "contents", "Itens do pacote", "collection", { required: true }),
        field("unpackBehavior", "unpackBehavior", "Ao desempacotar", "select", { options: ["addContents", "replacePack"] }),
      ], { condition: { path: "itemKind", equals: "pack" } }),
      section("mount", "Montaria", [field("speed", "speed", "Deslocamento", "number", { required: true }), field("carryingCapacity", "carryingCapacity", "Capacidade de carga", "number"), field("creature", "creature", "Criatura vinculada", "reference", { referenceTypes: ["monster"] })], { condition: { path: "itemKind", equals: "mount" } }),
      section("vehicle-purchase", "Compra de veículo", [field("vehicle", "vehicle", "Veículo vinculado", "reference", { referenceTypes: ["vehicle"] }), field("armorClass", "armorClass", "CA", "number"), field("hitPoints", "hitPoints", "PV", "number"), field("damageThreshold", "damageThreshold", "Limiar de dano", "number"), field("speed", "speed", "Velocidade", "number"), field("crew", "crew", "Tripulação", "number"), field("passengers", "passengers", "Passageiros", "number")], { condition: { path: "itemKind", equals: "vehiclePurchase" } }),
      section("item-mechanics", "Mecânicas compartilhadas", [
        field("abilityAdjustments", "abilityAdjustments", "Ajustes de atributos", "collection"),
        field("damageResistances", "damageResistances", "Resistências", "multiselect", { options: DAMAGE_TYPES }),
        field("damageImmunities", "damageImmunities", "Imunidades", "multiselect", { options: DAMAGE_TYPES }),
        field("movementModifications", "movementModifications", "Movimento", "collection"),
        field("light", "light", "Emissão de luz", "collection"),
        field("grants", "grants", "Concessões", "collection"),
        field("spellcastingFocusFor", "spellcastingFocusFor", "Foco para classes", "collection"),
        field("uses", "uses", "Usos", "object", { advanced: true }),
        field("activities", "activities", "Atividades", "collection", { advanced: true }),
        field("grantedFeatures", "grantedFeatures", "Features concedidas", "referenceList", { referenceTypes: ["feature"] }),
        field("benefitGrants", "benefitGrants", "Benefícios", "collection", { advanced: true }),
        field("effects", "effects", "Efeitos", "collection", { advanced: true }),
        field("modifiers", "modifiers", "Modificadores", "collection", { advanced: true }),
        field("states", "states", "Estados", "collection", { advanced: true }),
        field("triggers", "triggers", "Gatilhos", "collection", { advanced: true }),
        field("manualAdjudication", "manualAdjudication", "Adjudicação manual", "object", { advanced: true }),
      ]),
      textSection,
    ],
  },
  spell: {
    type: "spell",
    label: "Magia",
    description: "Editor completo da estrutura SpellData.",
    sections: [
      section("spell-core", "Dados básicos", [
        field("level", "level", "Nível", "number", { required: true, min: 0, max: 9 }),
        field("school", "school", "Escola", "select", { required: true, options: ["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"] }),
        field("aliases", "aliases", "Nomes alternativos", "collection"),
        field("ritual", "ritual", "Ritual", "boolean"),
        field("concentration", "concentration", "Concentração", "boolean"),
        field("spellcastingAbility", "spellcastingAbility", "Atributo de conjuração", "select", { options: ABILITIES }),
      ]),
      section("spell-casting", "Conjuração", [field("castingTimes", "castingTimes", "Tempo de conjuração", "collection", { required: true }), field("range", "range", "Alcance/área", "object", { required: true }), field("durations", "durations", "Durações", "collection", { required: true }), field("components", "components", "Componentes", "object", { required: true })]),
      section("spell-mechanics", "Mecânicas", [field("activities", "activities", "Atividades executáveis", "collection", { required: true }), field("scaling", "scaling", "Escalonamento", "collection", { advanced: true }), field("spellLists", "spellLists", "Listas de magia", "referenceList", { referenceTypes: ["class", "subclass"] }), field("mechanicIndex", "mechanicIndex", "Índice mecânico", "object", { advanced: true }), field("tags", "tags", "Tags", "collection")]),
      textSection,
      section("spell-higher", "Níveis superiores", [field("higherLevelText", "higherLevelText", "Em níveis superiores", "richEntries")]),
    ],
  },
  feature: {
    type: "feature",
    label: "Feature / Habilidade",
    description: "Feat, class feature, subclass feature, species feature, background feature e outras features canônicas.",
    sections: [
      section("feature-core", "Identidade mecânica", [
        field("featureKind", "featureKind", "Tipo de feature", "select", { required: true, options: ["feat", "classFeature", "subclassFeature", "speciesFeature", "backgroundFeature", "monsterFeature", "optionalFeature", "darkGift", "charm"] }),
        field("category", "category", "Categoria", "text"),
        field("featCategory", "featCategory", "Categoria de feat", "select", { options: ["origin", "general", "fightingStyle", "epicBoon", "other"] }),
        field("subtype", "subtype", "Subtipo", "text"),
        field("repeatable", "repeatable", "Repetível", "boolean"),
      ]),
      section("feature-requirements", "Pré-requisitos e escolhas", [field("prerequisiteMode", "prerequisiteMode", "Modo de pré-requisitos", "select", { options: ["all", "any"] }), field("prerequisites", "prerequisites", "Pré-requisitos", "collection"), field("abilityScoreOptions", "abilityScoreOptions", "Opções de atributo", "collection"), field("proficiencyChoices", "proficiencyChoices", "Escolhas de proficiência", "collection")]),
      section("feature-grants", "Concessões", [field("spellGrants", "spellGrants", "Magias concedidas", "collection"), field("spellGrantChoices", "spellGrantChoices", "Escolhas de magias", "collection"), field("grants", "grants", "Concessões", "collection"), field("advancement", "advancement", "Progressão", "collection")]),
      section("feature-mechanics", "Mecânicas", [field("activities", "activities", "Atividades", "collection"), field("effects", "effects", "Efeitos", "collection", { advanced: true }), field("modifiers", "modifiers", "Modificadores", "collection", { advanced: true }), field("states", "states", "Estados", "collection", { advanced: true }), field("patches", "patches", "Patches", "collection", { advanced: true }), field("classMechanics", "classMechanics", "Mecânicas de classe", "object", { advanced: true }), field("classRules", "classRules", "Regras de classe", "object", { advanced: true }), field("monsterTemplate", "monsterTemplate", "Template de monstro", "object", { advanced: true }), field("speciesTemplate", "speciesTemplate", "Template de espécie", "object", { advanced: true }), field("manualAdjudication", "manualAdjudication", "Adjudicação manual", "object", { advanced: true }), field("properties", "properties", "Propriedades", "collection")]),
      textSection,
    ],
  },
  class: {
    type: "class",
    label: "Classe",
    description: "Classe completa, incluindo progressão, equipamento e spellcasting.",
    sections: [
      section("class-core", "Dados básicos", [field("hitDie", "hitDie", "Dado de Vida", "select", { required: true, options: ["6", "8", "10", "12"] }), field("primaryAbilities", "primaryAbilities", "Atributos primários", "multiselect", { options: ABILITIES }), field("savingThrowProficiencies", "savingThrowProficiencies", "Salvaguardas", "multiselect", { options: ABILITIES }), field("armorTraining", "armorTraining", "Treinamento em armaduras", "collection"), field("weaponProficiencies", "weaponProficiencies", "Proficiências em armas", "collection"), field("toolProficiencies", "toolProficiencies", "Proficiências em ferramentas", "collection"), field("skillChoices", "skillChoices", "Escolhas de perícias", "object")]),
      section("class-equipment", "Equipamento inicial", [field("startingEquipment", "startingEquipment", "Concessões", "collection"), field("equipmentBundles", "equipmentBundles", "Pacotes/escolhas", "collection")]),
      section("class-progression", "Progressão", [field("spellcasting", "spellcasting", "Conjuração", "object"), field("advancement", "advancement", "Progressão por nível", "collection", { required: true }), field("subclassLevel", "subclassLevel", "Nível de subclasse", "number", { min: 1, max: 20 })]),
      section("class-advanced", "Mecânicas avançadas", [field("mechanics", "mechanics", "Mecânicas", "object", { advanced: true }), field("classRules", "classRules", "Regras", "object", { advanced: true })]),
      textSection,
    ],
  },
  subclass: {
    type: "subclass",
    label: "Subclasse",
    description: "Subclasse ligada a uma classe canônica.",
    sections: [section("subclass-core", "Dados básicos", [field("parentClass", "parentClass", "Classe-pai", "reference", { required: true, referenceTypes: ["class"] }), field("advancement", "advancement", "Progressão e features", "collection", { required: true })]), section("subclass-advanced", "Mecânicas avançadas", [field("mechanics", "mechanics", "Mecânicas", "object", { advanced: true }), field("classRules", "classRules", "Regras", "object", { advanced: true })]), textSection],
  },
  species: {
    type: "species",
    label: "Espécie",
    description: "Espécie jogável com variantes, features, escolhas e concessões.",
    sections: [section("species-core", "Dados básicos", [field("size", "size", "Tamanhos", "multiselect", { required: true, options: SIZES }), field("sizeChoice", "sizeChoice", "Escolha de tamanho", "object"), field("speed", "speed", "Deslocamento", "number", { required: true, min: 0 }), field("creatureType", "creatureType", "Tipo de criatura", "text"), field("darkvision", "darkvision", "Visão no escuro", "number", { min: 0 }), field("resistances", "resistances", "Resistências", "multiselect", { options: DAMAGE_TYPES }), field("resistanceChoice", "resistanceChoice", "Escolha de resistência", "object")]), section("species-features", "Features e concessões", [field("features", "features", "Features", "referenceList", { referenceTypes: ["feature"] }), field("featureParameters", "featureParameters", "Parâmetros de features", "collection"), field("spellGrants", "spellGrants", "Magias concedidas", "collection"), field("grants", "grants", "Concessões", "collection"), field("choices", "choices", "Escolhas", "collection")]), section("species-variants", "Variantes e progressão", [field("variants", "variants", "Variantes", "collection"), field("advancement", "advancement", "Progressão", "collection", { advanced: true }), field("patches", "patches", "Patches", "collection", { advanced: true })]), textSection],
  },
  background: {
    type: "background",
    label: "Antecedente",
    description: "Antecedente com atributos, proficiências, feat e equipamento.",
    sections: [section("background-core", "Dados básicos", [field("abilityScoreOptions", "abilityScoreOptions", "Opções de atributos", "object"), field("skillProficiencies", "skillProficiencies", "Perícias", "collection"), field("toolProficiencies", "toolProficiencies", "Ferramentas", "collection"), field("languages", "languages", "Idiomas", "object"), field("originFeat", "originFeat", "Feat de origem", "reference", { referenceTypes: ["feature"] })]), section("background-equipment", "Equipamento", [field("equipment", "equipment", "Concessões", "collection"), field("equipmentBundles", "equipmentBundles", "Pacotes", "collection")]), section("background-extra", "Escolhas e concessões", [field("choices", "choices", "Escolhas", "collection"), field("grants", "grants", "Concessões", "collection")]), textSection],
  },
  monster: {
    type: "monster",
    label: "Monstro",
    description: "Bloco completo MonsterData, inclusive features e Activities.",
    sections: [
      section("monster-core", "Dados básicos", [field("creatureType", "creatureType", "Tipo de criatura", "text", { required: true }), field("creatureSubtype", "creatureSubtype", "Subtipo", "text"), field("size", "size", "Tamanho", "select", { required: true, options: SIZES }), field("alignment", "alignment", "Alinhamento", "text"), field("challengeRating", "challengeRating", "ND", "number", { required: true, min: 0 }), field("proficiencyBonus", "proficiencyBonus", "Bônus de proficiência", "number"), field("experience", "experience", "XP", "number", { min: 0 })]),
      section("monster-defense", "Atributos e defesas", [field("abilities", "abilities", "Atributos", "object", { required: true }), field("armorClass", "armorClass", "CA", "collection", { required: true }), field("hitPoints", "hitPoints", "PV", "object", { required: true }), field("initiative", "initiative", "Iniciativa", "object"), field("movement", "movement", "Movimentos", "collection", { required: true }), field("savingThrows", "savingThrows", "Salvaguardas", "collection"), field("skills", "skills", "Perícias", "collection"), field("passivePerception", "passivePerception", "Percepção passiva", "number"), field("senses", "senses", "Sentidos", "collection"), field("languages", "languages", "Idiomas", "collection")]),
      section("monster-resistance", "Resistências", [field("vulnerabilities", "vulnerabilities", "Vulnerabilidades", "multiselect", { options: DAMAGE_TYPES }), field("resistances", "resistances", "Resistências", "multiselect", { options: DAMAGE_TYPES }), field("damageImmunities", "damageImmunities", "Imunidades a dano", "multiselect", { options: DAMAGE_TYPES }), field("conditionImmunities", "conditionImmunities", "Imunidades a condições", "collection")]),
      section("monster-actions", "Features e ações", [field("features", "features", "Features instanciadas", "collection"), field("traits", "traits", "Traits legados", "referenceList", { referenceTypes: ["feature"] }), field("actions", "actions", "Ações", "collection"), field("bonusActions", "bonusActions", "Ações bônus", "collection"), field("reactions", "reactions", "Reações", "collection"), field("legendaryActions", "legendaryActions", "Ações lendárias", "collection"), field("lairActions", "lairActions", "Ações de covil", "collection"), field("legendaryActionUses", "legendaryActionUses", "Usos de ação lendária", "number"), field("legendaryResistanceUses", "legendaryResistanceUses", "Resistências lendárias", "number"), field("spellcasting", "spellcasting", "Conjuração", "referenceList", { referenceTypes: ["spell", "feature"] })]),
      section("monster-world", "Habitat e tesouro", [field("habitats", "habitats", "Habitats", "collection"), field("treasure", "treasure", "Tesouro", "collection"), field("gear", "gear", "Equipamento", "referenceList", { referenceTypes: ["item"] })]),
      textSection,
    ],
  },
  vehicle: {
    type: "vehicle",
    label: "Veículo",
    description: "Veículo completo VehicleData com estações e Activities.",
    sections: [section("vehicle-core", "Dados básicos", [field("size", "size", "Tamanho", "text", { required: true }), field("weight", "weight", "Peso", "number"), field("capacity", "capacity", "Capacidade", "object"), field("armorClass", "armorClass", "CA", "collection", { required: true }), field("hitPoints", "hitPoints", "PV", "object", { required: true }), field("thresholds", "thresholds", "Limiares", "object"), field("speed", "speed", "Velocidade", "object"), field("travelPace", "travelPace", "Ritmo de viagem", "object")]), section("vehicle-defense", "Atributos e defesas", [field("abilities", "abilities", "Atributos", "object"), field("damageImmunities", "damageImmunities", "Imunidades a dano", "multiselect", { options: DAMAGE_TYPES }), field("conditionImmunities", "conditionImmunities", "Imunidades a condições", "collection")]), section("vehicle-actions", "Traits, estações e ações", [field("traits", "traits", "Traits", "referenceList", { referenceTypes: ["feature"] }), field("activities", "activities", "Atividades", "collection"), field("reactions", "reactions", "Reações", "collection"), field("stations", "stations", "Estações", "collection"), field("effects", "effects", "Efeitos", "collection", { advanced: true }), field("triggers", "triggers", "Gatilhos", "collection", { advanced: true })]), textSection],
  },
  rule: { type: "rule", label: "Regra", description: "Regra textual estruturada.", sections: [section("rule", "Regra", [field("category", "category", "Categoria", "text"), field("entries", "entries", "Conteúdo", "richEntries", { required: true })])] },
  table: { type: "table", label: "Tabela", description: "Tabela estruturada e tabelas aleatórias.", sections: [section("table", "Tabela", [field("formula", "formula", "Fórmula", "text"), field("columns", "columns", "Colunas", "collection", { required: true }), field("rows", "rows", "Linhas", "collection", { required: true })])] },
  condition: { type: "condition", label: "Condição", description: "Condição com entradas de regras.", sections: [section("condition", "Condição", [field("entries", "entries", "Efeitos", "richEntries", { required: true })])] },
} satisfies Record<CanonicalContentType, CreatorFormDefinition>;

export function getHomebrewCreatorForm(type: CanonicalContentType): CreatorFormDefinition {
  return HOME_BREW_CREATOR_FORMS[type];
}

export function listHomebrewCreatorForms(): readonly CreatorFormDefinition[] {
  return Object.values(HOME_BREW_CREATOR_FORMS);
}
