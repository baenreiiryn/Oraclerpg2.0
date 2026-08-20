import type { CanonicalContentType } from "@oraclerpg/schema";
import type { CreatorFormDefinition } from "./types.js";

const abilityOptions = ["str", "dex", "con", "int", "wis", "cha"] as const;
const damageOptions = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"] as const;
const sizeOptions = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;

const textSection = {
  id: "text",
  label: "Texto e descrição",
  fields: [
    { id: "text", path: "text", label: "Texto de regras", kind: "richEntries" as const },
  ],
};

export const HOME_BREW_CREATOR_FORMS = {
  item: {
    type: "item",
    label: "Item",
    description: "Armas, armaduras, equipamentos, consumíveis, ferramentas, recipientes, pacotes, montarias e outros itens.",
    sections: [
      {
        id: "item-core",
        label: "Dados básicos",
        fields: [
          { id: "itemKind", path: "itemKind", label: "Tipo de item", kind: "select", required: true, options: ["weapon", "armor", "equipment", "consumable", "tool", "container", "pack", "mount", "vehiclePurchase", "loot", "charm", "upgrade"] },
          { id: "rarity", path: "rarity", label: "Raridade", kind: "select", options: ["common", "uncommon", "rare", "veryRare", "legendary", "artifact", "varies", "unknown"] },
          { id: "magical", path: "magical", label: "Mágico", kind: "boolean" },
          { id: "cursed", path: "cursed", label: "Amaldiçoado", kind: "boolean" },
          { id: "attunement", path: "attunement", label: "Sintonia", kind: "select", options: ["none", "required", "optional", "special"] },
          { id: "weight", path: "weight", label: "Peso", kind: "object" },
          { id: "price", path: "price", label: "Preço", kind: "object" },
          { id: "properties", path: "properties", label: "Propriedades", kind: "collection" },
        ],
      },
      {
        id: "weapon",
        label: "Arma",
        condition: { path: "itemKind", equals: "weapon" },
        fields: [
          { id: "category", path: "category", label: "Categoria", kind: "select", required: true, options: ["simple", "martial", "improvised", "natural", "special"] },
          { id: "mode", path: "mode", label: "Modo", kind: "select", required: true, options: ["melee", "ranged"] },
          { id: "damage", path: "damage", label: "Dano", kind: "object", required: true },
          { id: "range", path: "range", label: "Alcance", kind: "object" },
          { id: "mastery", path: "mastery", label: "Mastery", kind: "text" },
          { id: "magicalBonus", path: "magicalBonus", label: "Bônus mágico", kind: "object" },
        ],
      },
      {
        id: "armor",
        label: "Armadura",
        condition: { path: "itemKind", equals: "armor" },
        fields: [
          { id: "armorCategory", path: "category", label: "Categoria", kind: "select", required: true, options: ["light", "medium", "heavy", "shield", "natural", "other"] },
          { id: "armorClass", path: "armorClass", label: "Classe de Armadura", kind: "object", required: true },
          { id: "strengthRequirement", path: "strengthRequirement", label: "Força mínima", kind: "number" },
          { id: "stealthDisadvantage", path: "stealthDisadvantage", label: "Desvantagem em Furtividade", kind: "boolean" },
        ],
      },
      {
        id: "consumable",
        label: "Consumível",
        condition: { path: "itemKind", equals: "consumable" },
        fields: [
          { id: "consumableType", path: "consumableType", label: "Tipo", kind: "select", options: ["potion", "poison", "food", "scroll", "ammo", "charge", "other"] },
          { id: "consumeOnUse", path: "consumeOnUse", label: "Consumir ao usar", kind: "boolean" },
          { id: "spellScrollLevel", path: "spellScrollLevel", label: "Nível de scroll", kind: "number", min: 0, max: 9 },
        ],
      },
      {
        id: "container",
        label: "Recipiente",
        condition: { path: "itemKind", equals: "container" },
        fields: [
          { id: "containerType", path: "containerType", label: "Tipo", kind: "select", options: ["quiver", "pouch", "sack", "backpack", "chest", "case", "vessel", "other"] },
          { id: "capacity", path: "capacity", label: "Capacidade", kind: "object" },
          { id: "compartments", path: "compartments", label: "Compartimentos", kind: "collection" },
          { id: "contents", path: "contents", label: "Conteúdo padrão", kind: "collection" },
        ],
      },
      {
        id: "pack",
        label: "Pacote",
        condition: { path: "itemKind", equals: "pack" },
        fields: [
          { id: "packType", path: "packType", label: "Tipo de pacote", kind: "select", options: ["equipment", "ammunition", "toolKit", "bundle", "other"] },
          { id: "packContents", path: "contents", label: "Itens do pacote", kind: "collection", required: true },
          { id: "unpackBehavior", path: "unpackBehavior", label: "Ao desempacotar", kind: "select", options: ["addContents", "replacePack"] },
        ],
      },
      {
        id: "item-mechanics",
        label: "Mecânicas",
        fields: [
          { id: "uses", path: "uses", label: "Usos", kind: "object", advanced: true },
          { id: "activities", path: "activities", label: "Atividades", kind: "collection", advanced: true },
          { id: "effects", path: "effects", label: "Efeitos", kind: "collection", advanced: true },
          { id: "modifiers", path: "modifiers", label: "Modificadores", kind: "collection", advanced: true },
          { id: "grantedFeatures", path: "grantedFeatures", label: "Features concedidas", kind: "referenceList", referenceTypes: ["feature"] },
          { id: "damageResistances", path: "damageResistances", label: "Resistências", kind: "multiselect", options: damageOptions },
          { id: "damageImmunities", path: "damageImmunities", label: "Imunidades", kind: "multiselect", options: damageOptions },
        ],
      },
      textSection,
    ],
  },
  spell: {
    type: "spell",
    label: "Magia",
    description: "Magias com execução estruturada por Activities.",
    sections: [
      { id: "spell-core", label: "Dados básicos", fields: [
        { id: "level", path: "level", label: "Nível", kind: "number", required: true, min: 0, max: 9 },
        { id: "school", path: "school", label: "Escola", kind: "select", required: true, options: ["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"] },
        { id: "ritual", path: "ritual", label: "Ritual", kind: "boolean" },
        { id: "concentration", path: "concentration", label: "Concentração", kind: "boolean" },
        { id: "aliases", path: "aliases", label: "Nomes alternativos", kind: "collection" },
      ]},
      { id: "spell-casting", label: "Conjuração", fields: [
        { id: "castingTimes", path: "castingTimes", label: "Tempo de conjuração", kind: "collection", required: true },
        { id: "range", path: "range", label: "Alcance/área", kind: "object", required: true },
        { id: "durations", path: "durations", label: "Duração", kind: "collection", required: true },
        { id: "components", path: "components", label: "Componentes", kind: "object", required: true },
      ]},
      { id: "spell-mechanics", label: "Mecânicas", fields: [
        { id: "activities", path: "activities", label: "Atividades executáveis", kind: "collection", required: true },
        { id: "scaling", path: "scaling", label: "Escalonamento", kind: "collection", advanced: true },
        { id: "spellLists", path: "spellLists", label: "Listas de magia", kind: "referenceList", referenceTypes: ["class", "subclass"] },
        { id: "mechanicIndex", path: "mechanicIndex", label: "Índice mecânico", kind: "object", advanced: true },
      ]},
      textSection,
      { id: "spell-higher", label: "Níveis superiores", fields: [{ id: "higherLevelText", path: "higherLevelText", label: "Em níveis superiores", kind: "richEntries" }] },
    ],
  },
  class: {
    type: "class",
    label: "Classe",
    description: "Classe completa com progressão de 20 níveis, equipamento e mecânicas.",
    sections: [
      { id: "class-core", label: "Dados básicos", fields: [
        { id: "hitDie", path: "hitDie", label: "Dado de Vida", kind: "select", required: true, options: ["6", "8", "10", "12"] },
        { id: "primaryAbilities", path: "primaryAbilities", label: "Atributos primários", kind: "multiselect", options: abilityOptions },
        { id: "savingThrowProficiencies", path: "savingThrowProficiencies", label: "Salvaguardas", kind: "multiselect", options: abilityOptions },
        { id: "armorTraining", path: "armorTraining", label: "Treinamento em armaduras", kind: "collection" },
        { id: "weaponProficiencies", path: "weaponProficiencies", label: "Proficiências em armas", kind: "collection" },
        { id: "toolProficiencies", path: "toolProficiencies", label: "Proficiências em ferramentas", kind: "collection" },
      ]},
      { id: "class-equipment", label: "Equipamento inicial", fields: [
        { id: "startingEquipment", path: "startingEquipment", label: "Concessões", kind: "collection" },
        { id: "equipmentBundles", path: "equipmentBundles", label: "Pacotes/escolhas", kind: "collection" },
      ]},
      { id: "class-progression", label: "Progressão", fields: [
        { id: "spellcasting", path: "spellcasting", label: "Conjuração", kind: "object" },
        { id: "advancement", path: "advancement", label: "Níveis e features", kind: "collection", required: true },
        { id: "subclassLevel", path: "subclassLevel", label: "Nível da subclasse", kind: "number", min: 1, max: 20 },
      ]},
      { id: "class-advanced", label: "Mecânicas avançadas", fields: [
        { id: "mechanics", path: "mechanics", label: "Mecânicas", kind: "object", advanced: true },
        { id: "classRules", path: "classRules", label: "Regras da classe", kind: "object", advanced: true },
      ]},
      textSection,
    ],
  },
  subclass: {
    type: "subclass",
    label: "Subclasse",
    description: "Subclasse ligada a uma classe canônica.",
    sections: [
      { id: "subclass-core", label: "Dados básicos", fields: [
        { id: "parentClass", path: "parentClass", label: "Classe-pai", kind: "reference", required: true, referenceTypes: ["class"] },
        { id: "advancement", path: "advancement", label: "Progressão e features", kind: "collection", required: true },
      ]},
      { id: "subclass-advanced", label: "Mecânicas avançadas", fields: [
        { id: "mechanics", path: "mechanics", label: "Mecânicas", kind: "object", advanced: true },
        { id: "classRules", path: "classRules", label: "Regras", kind: "object", advanced: true },
      ]},
      textSection,
    ],
  },
  species: {
    type: "species",
    label: "Espécie",
    description: "Espécie jogável, variantes, features e escolhas.",
    sections: [
      { id: "species-core", label: "Dados básicos", fields: [
        { id: "size", path: "size", label: "Tamanhos", kind: "multiselect", required: true, options: sizeOptions },
        { id: "speed", path: "speed", label: "Deslocamento", kind: "number", required: true, min: 0 },
        { id: "creatureType", path: "creatureType", label: "Tipo de criatura", kind: "text" },
        { id: "darkvision", path: "darkvision", label: "Visão no escuro", kind: "number", min: 0 },
        { id: "resistances", path: "resistances", label: "Resistências", kind: "multiselect", options: damageOptions },
      ]},
      { id: "species-features", label: "Features e concessões", fields: [
        { id: "features", path: "features", label: "Features", kind: "referenceList", referenceTypes: ["feature"] },
        { id: "spellGrants", path: "spellGrants", label: "Magias concedidas", kind: "collection" },
        { id: "grants", path: "grants", label: "Concessões", kind: "collection" },
        { id: "choices", path: "choices", label: "Escolhas", kind: "collection" },
      ]},
      { id: "species-variants", label: "Variantes", fields: [{ id: "variants", path: "variants", label: "Variantes", kind: "collection" }] },
      { id: "species-advancement", label: "Progressão", fields: [{ id: "advancement", path: "advancement", label: "Avanços", kind: "collection", advanced: true }] },
      textSection,
    ],
  },
  background: {
    type: "background",
    label: "Antecedente",
    description: "Antecedente com perícias, ferramentas, idiomas, feat e equipamento.",
    sections: [
      { id: "background-core", label: "Proficiências e atributos", fields: [
        { id: "abilityScoreOptions", path: "abilityScoreOptions", label: "Opções de atributos", kind: "object" },
        { id: "skillProficiencies", path: "skillProficiencies", label: "Perícias", kind: "collection" },
        { id: "toolProficiencies", path: "toolProficiencies", label: "Ferramentas", kind: "collection" },
        { id: "languages", path: "languages", label: "Idiomas", kind: "object" },
        { id: "originFeat", path: "originFeat", label: "Feat de origem", kind: "reference", referenceTypes: ["feature"] },
      ]},
      { id: "background-equipment", label: "Equipamento", fields: [
        { id: "equipment", path: "equipment", label: "Concessões", kind: "collection" },
        { id: "equipmentBundles", path: "equipmentBundles", label: "Pacotes", kind: "collection" },
      ]},
      { id: "background-extra", label: "Escolhas e concessões", fields: [
        { id: "choices", path: "choices", label: "Escolhas", kind: "collection" },
        { id: "grants", path: "grants", label: "Concessões", kind: "collection" },
      ]},
      textSection,
    ],
  },
  feature: {
    type: "feature",
    label: "Feature / Habilidade",
    description: "Feature independente para classes, subclasses, espécies, feats e itens.",
    sections: [
      { id: "feature-core", label: "Configuração", fields: [
        { id: "featureType", path: "featureType", label: "Tipo de feature", kind: "text" },
        { id: "level", path: "level", label: "Nível", kind: "number", min: 1, max: 20 },
        { id: "requirements", path: "requirements", label: "Requisitos", kind: "object" },
      ]},
      { id: "feature-mechanics", label: "Mecânicas", fields: [
        { id: "uses", path: "uses", label: "Usos", kind: "object" },
        { id: "activities", path: "activities", label: "Atividades", kind: "collection" },
        { id: "grants", path: "grants", label: "Concessões", kind: "collection" },
        { id: "choices", path: "choices", label: "Escolhas", kind: "collection" },
        { id: "effects", path: "effects", label: "Efeitos", kind: "collection", advanced: true },
        { id: "modifiers", path: "modifiers", label: "Modificadores", kind: "collection", advanced: true },
      ]},
      textSection,
    ],
  },
  monster: {
    type: "monster",
    label: "Monstro",
    description: "Bloco completo de criatura/monstro.",
    sections: [
      { id: "monster-core", label: "Dados básicos", fields: [
        { id: "size", path: "size", label: "Tamanho", kind: "select", options: sizeOptions },
        { id: "creatureType", path: "type", label: "Tipo", kind: "object" },
        { id: "alignment", path: "alignment", label: "Alinhamento", kind: "collection" },
        { id: "armorClass", path: "armorClass", label: "CA", kind: "collection" },
        { id: "hitPoints", path: "hitPoints", label: "PV", kind: "object" },
        { id: "speed", path: "speed", label: "Deslocamentos", kind: "object" },
      ]},
      { id: "monster-stats", label: "Atributos e defesas", fields: [
        { id: "abilities", path: "abilities", label: "Atributos", kind: "object" },
        { id: "saves", path: "savingThrows", label: "Salvaguardas", kind: "object" },
        { id: "skills", path: "skills", label: "Perícias", kind: "object" },
        { id: "resistances", path: "damageResistances", label: "Resistências", kind: "collection" },
        { id: "immunities", path: "damageImmunities", label: "Imunidades", kind: "collection" },
        { id: "conditionImmunities", path: "conditionImmunities", label: "Imunidades a condições", kind: "collection" },
      ]},
      { id: "monster-actions", label: "Traços e ações", fields: [
        { id: "traits", path: "traits", label: "Traços", kind: "collection" },
        { id: "actions", path: "actions", label: "Ações", kind: "collection" },
        { id: "bonusActions", path: "bonusActions", label: "Ações bônus", kind: "collection" },
        { id: "reactions", path: "reactions", label: "Reações", kind: "collection" },
        { id: "legendaryActions", path: "legendaryActions", label: "Ações lendárias", kind: "collection" },
      ]},
      { id: "monster-meta", label: "Desafio e sentidos", fields: [
        { id: "challengeRating", path: "challengeRating", label: "ND", kind: "object" },
        { id: "senses", path: "senses", label: "Sentidos", kind: "object" },
        { id: "languages", path: "languages", label: "Idiomas", kind: "collection" },
      ]},
    ],
  },
  vehicle: {
    type: "vehicle",
    label: "Veículo",
    description: "Veículo com estatísticas e componentes próprios.",
    sections: [
      { id: "vehicle-core", label: "Dados básicos", fields: [
        { id: "vehicleType", path: "vehicleType", label: "Tipo", kind: "text" },
        { id: "armorClass", path: "armorClass", label: "CA", kind: "number" },
        { id: "hitPoints", path: "hitPoints", label: "PV", kind: "number" },
        { id: "damageThreshold", path: "damageThreshold", label: "Limiar de dano", kind: "number" },
        { id: "speed", path: "speed", label: "Velocidade", kind: "object" },
        { id: "crew", path: "crew", label: "Tripulação", kind: "number" },
        { id: "passengers", path: "passengers", label: "Passageiros", kind: "number" },
      ]},
      { id: "vehicle-parts", label: "Componentes e ações", fields: [
        { id: "components", path: "components", label: "Componentes", kind: "collection" },
        { id: "actions", path: "actions", label: "Ações", kind: "collection" },
      ]},
      textSection,
    ],
  },
  rule: {
    type: "rule",
    label: "Regra",
    description: "Regra textual de sistema ou módulo homebrew.",
    sections: [{ id: "rule-core", label: "Regra", fields: [
      { id: "category", path: "category", label: "Categoria", kind: "text" },
      { id: "entries", path: "entries", label: "Conteúdo", kind: "richEntries", required: true },
    ]}],
  },
  table: {
    type: "table",
    label: "Tabela",
    description: "Tabela estruturada, inclusive tabelas aleatórias.",
    sections: [{ id: "table-core", label: "Tabela", fields: [
      { id: "formula", path: "formula", label: "Fórmula de rolagem", kind: "text" },
      { id: "columns", path: "columns", label: "Colunas", kind: "collection", required: true },
      { id: "rows", path: "rows", label: "Linhas", kind: "collection", required: true },
    ]}],
  },
  condition: {
    type: "condition",
    label: "Condição",
    description: "Condição com texto de regras estruturado.",
    sections: [{ id: "condition-core", label: "Condição", fields: [
      { id: "entries", path: "entries", label: "Efeitos da condição", kind: "richEntries", required: true },
    ]}],
  },
} satisfies Record<CanonicalContentType, CreatorFormDefinition>;

export function getHomebrewCreatorForm(type: CanonicalContentType): CreatorFormDefinition {
  return HOME_BREW_CREATOR_FORMS[type];
}

export function listHomebrewCreatorForms(): readonly CreatorFormDefinition[] {
  return Object.values(HOME_BREW_CREATOR_FORMS);
}
