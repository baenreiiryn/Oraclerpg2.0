import type { CreatorFieldDefinition, CreatorSubformDefinition, CreatorSubformId } from "./types.js";

const f = (id: string, path: string, label: string, kind: CreatorFieldDefinition["kind"], extra: Omit<CreatorFieldDefinition, "id" | "path" | "label" | "kind"> = {}): CreatorFieldDefinition => ({ id, path, label, kind, ...extra });
const sf = (id: CreatorSubformId, label: string, fields: readonly CreatorFieldDefinition[], description?: string): CreatorSubformDefinition => ({ id, label, fields, ...(description ? { description } : {}) });

const abilities = ["str", "dex", "con", "int", "wis", "cha"];
const damageTypes = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

export const HOME_BREW_CREATOR_SUBFORMS: Record<CreatorSubformId, CreatorSubformDefinition> = {
  entityRef: sf("entityRef", "Referência de entidade", [
    f("id", "id", "ID canônico", "text", { required: true }),
    f("name", "name", "Nome de exibição", "text"),
    f("type", "type", "Tipo", "select", { options: ["monster", "vehicle", "item", "spell", "feature", "class", "subclass", "species", "background", "rule", "table", "condition"] }),
  ]),
  choice: sf("choice", "Escolha", [
    f("id", "id", "ID da escolha", "text"),
    f("count", "count", "Quantidade", "number", { min: 1 }),
    f("options", "options", "Opções", "referenceList"),
    f("query", "query", "Consulta/filtro", "text", { advanced: true }),
  ]),
  activity: sf("activity", "Activity", [
    f("id", "id", "ID", "text", { required: true }),
    f("name", "name", "Nome", "text", { required: true }),
    f("kind", "kind", "Tipo", "select", { required: true, options: ["attack", "save", "check", "damage", "healing", "utility", "summon", "transform", "enchant", "invoke", "multiattack", "special"] }),
    f("activation", "activation", "Ativação", "subform", { subformId: "activityActivation" }),
    f("range", "range", "Alcance", "subform", { subformId: "activityRange" }),
    f("target", "target", "Alvo", "subform", { subformId: "activityTarget" }),
    f("attack", "attack", "Ataque", "subform", { subformId: "attack" }),
    f("save", "save", "Teste de resistência", "subform", { subformId: "save" }),
    f("check", "check", "Teste", "subform", { subformId: "check" }),
    f("damage", "damage", "Dano", "subformCollection", { subformId: "damagePart" }),
    f("healing", "healing", "Cura", "subformCollection", { subformId: "healingPart" }),
    f("duration", "duration", "Duração", "subform", { subformId: "duration" }),
    f("uses", "uses", "Usos", "subform", { subformId: "uses" }),
    f("costs", "costs", "Custos", "subformCollection", { subformId: "resourceCost" }),
    f("scaling", "scaling", "Escalonamento", "subformCollection", { subformId: "scaling" }),
    f("effects", "effects", "Efeitos", "subformCollection", { subformId: "effect" }),
    f("predicates", "predicates", "Predicados", "subformCollection", { subformId: "predicate" }),
    f("triggers", "triggers", "Gatilhos", "subformCollection", { subformId: "trigger" }),
    f("description", "description", "Descrição", "textarea"),
  ]),
  activityActivation: sf("activityActivation", "Ativação", [
    f("type", "type", "Tipo", "select", { required: true, options: ["action", "bonusAction", "reaction", "minute", "hour", "special", "none"] }),
    f("cost", "cost", "Custo", "number", { min: 0 }),
    f("trigger", "trigger", "Gatilho", "subform", { subformId: "trigger" }),
    f("predicate", "predicate", "Predicado", "subform", { subformId: "predicate" }),
  ]),
  activityRange: sf("activityRange", "Alcance da Activity", [
    f("normal", "normal", "Alcance normal", "object"),
    f("long", "long", "Alcance longo", "object"),
    f("reach", "reach", "Reach", "object"),
  ]),
  activityTarget: sf("activityTarget", "Alvo", [
    f("type", "type", "Tipo", "select", { required: true, options: ["self", "creature", "object", "creatureOrObject", "point", "space", "special"] }),
    f("count", "count", "Quantidade", "text"),
    f("disposition", "disposition", "Disposição", "select", { options: ["ally", "enemy", "any"] }),
    f("area", "area", "Área", "object"),
    f("restrictions", "restrictions", "Restrições", "subformCollection", { subformId: "predicate" }),
  ]),
  attack: sf("attack", "Ataque", [
    f("classification", "classification", "Classificação", "select", { required: true, options: ["weapon", "spell", "unarmed", "special"] }),
    f("mode", "mode", "Modo", "select", { required: true, options: ["melee", "ranged", "meleeOrRanged"] }),
    f("ability", "ability", "Atributo", "select", { options: abilities }),
    f("proficient", "proficient", "Proficiente", "boolean"),
    f("bonus", "bonus", "Bônus/Fórmula", "text"),
  ]),
  save: sf("save", "Teste de resistência", [
    f("ability", "ability", "Atributo", "select", { required: true, options: abilities }),
    f("dc", "dc", "CD", "object", { required: true }),
    f("onSuccess", "onSuccess", "Em sucesso", "select", { options: ["none", "half", "reduced", "special"] }),
  ]),
  check: sf("check", "Teste", [
    f("ability", "ability", "Atributo", "select", { options: abilities }),
    f("skill", "skill", "Perícia", "text"),
    f("dc", "dc", "CD", "text"),
  ]),
  damagePart: sf("damagePart", "Parte de dano", [
    f("damageType", "damageType", "Tipo de dano", "select", { options: damageTypes }),
    f("damageTypes", "damageTypes", "Tipos possíveis", "multiselect", { options: damageTypes }),
    f("chooseDamageType", "chooseDamageType", "Escolher tipo", "boolean"),
    f("formula", "formula", "Fórmula", "text"),
    f("versatileFormula", "versatileFormula", "Fórmula versátil", "text"),
    f("inheritDamageType", "inheritDamageType", "Herdar tipo", "boolean"),
    f("scaling", "scaling", "Escalonamento", "subform", { subformId: "scaling" }),
  ]),
  healingPart: sf("healingPart", "Parte de cura", [
    f("formula", "formula", "Fórmula", "text"),
    f("type", "type", "Tipo", "select", { options: ["healing", "temporaryHp", "maxHp"] }),
    f("scaling", "scaling", "Escalonamento", "subform", { subformId: "scaling" }),
  ]),
  duration: sf("duration", "Duração", [
    f("type", "type", "Tipo", "select", { required: true, options: ["instant", "timed", "concentration", "untilRest", "untilTrigger", "permanent", "special"] }),
    f("value", "value", "Valor", "text"),
    f("unit", "unit", "Unidade", "select", { options: ["round", "minute", "hour", "day"] }),
    f("endTrigger", "endTrigger", "Gatilho de término", "subform", { subformId: "trigger" }),
  ]),
  uses: sf("uses", "Usos e recuperação", [
    f("max", "max", "Máximo", "text", { required: true }),
    f("recovery", "recovery", "Recuperação", "collection", { required: true, itemSchema: [f("period", "period", "Período", "select", { options: ["turn", "round", "shortRest", "longRest", "dawn", "daily", "special"] }), f("amount", "amount", "Quantidade", "text")] }),
    f("sharedResourceId", "sharedResourceId", "Recurso compartilhado", "text"),
  ]),
  resourceCost: sf("resourceCost", "Custo de recurso", [
    f("resource", "resource", "Recurso", "select", { required: true, options: ["spellSlot", "hitDie", "itemCharge", "classResource", "custom"] }),
    f("amount", "amount", "Quantidade", "text", { required: true }),
    f("resourceId", "resourceId", "ID do recurso", "text"),
    f("level", "level", "Nível", "number", { min: 0 }),
    f("dieSize", "dieSize", "Dado", "select", { options: ["4", "6", "8", "10", "12"] }),
    f("scaling", "scaling", "Escalonamento", "subform", { subformId: "scaling" }),
  ]),
  scaling: sf("scaling", "Escalonamento", [
    f("type", "type", "Tipo", "select", { required: true, options: ["characterLevel", "classLevel", "spellSlotLevel", "proficiencyBonus", "custom"] }),
    f("progression", "progression", "Progressão", "collection"),
    f("formula", "formula", "Fórmula", "text"),
  ]),
  grant: sf("grant", "Concessão", [
    f("type", "type", "Tipo", "select", { required: true, options: ["entity", "proficiency", "expertise", "language", "sense", "movement", "ability", "spell", "resource", "benefits", "custom"] }),
    f("entity", "entity", "Entidade", "subform", { subformId: "entityRef" }),
    f("choice", "choice", "Escolha", "subform", { subformId: "choice" }),
    f("value", "value", "Valor", "text"),
    f("level", "level", "Nível", "number", { min: 1, max: 20 }),
    f("choiceId", "choiceId", "ID da escolha", "text"),
  ]),
  advancement: sf("advancement", "Avanço por nível", [
    f("level", "level", "Nível", "number", { required: true, min: 1, max: 20 }),
    f("grants", "grants", "Concessões", "subformCollection", { subformId: "grant" }),
    f("choices", "choices", "Escolhas", "subformCollection", { subformId: "choice" }),
    f("scaleValues", "scaleValues", "Valores de escala", "collection"),
    f("patches", "patches", "Patches", "collection", { advanced: true }),
  ]),
  predicate: sf("predicate", "Predicado", [
    f("mode", "mode", "Modo", "select", { options: ["all", "any", "not"] }),
    f("conditions", "conditions", "Condições", "collection"),
    f("description", "description", "Descrição", "textarea"),
  ]),
  trigger: sf("trigger", "Gatilho", [
    f("event", "event", "Evento", "text", { required: true }),
    f("timing", "timing", "Timing", "text"),
    f("predicate", "predicate", "Predicado", "subform", { subformId: "predicate" }),
    f("description", "description", "Descrição", "textarea"),
  ]),
  effect: sf("effect", "Efeito", [
    f("id", "id", "ID", "text"),
    f("name", "name", "Nome", "text"),
    f("duration", "duration", "Duração", "subform", { subformId: "duration" }),
    f("modifiers", "modifiers", "Modificadores", "subformCollection", { subformId: "modifier" }),
    f("states", "states", "Estados", "subformCollection", { subformId: "stateVariable" }),
    f("predicate", "predicate", "Predicado", "subform", { subformId: "predicate" }),
  ]),
  modifier: sf("modifier", "Modificador", [
    f("target", "target", "Alvo", "text", { required: true }),
    f("mode", "mode", "Modo", "text", { required: true }),
    f("value", "value", "Valor/Fórmula", "text", { required: true }),
    f("predicate", "predicate", "Predicado", "subform", { subformId: "predicate" }),
  ]),
  stateVariable: sf("stateVariable", "Variável de estado", [
    f("id", "id", "ID", "text", { required: true }),
    f("value", "value", "Valor", "text"),
    f("maximum", "maximum", "Máximo", "text"),
    f("recovery", "recovery", "Recuperação", "text"),
  ]),
  spellCastingTime: sf("spellCastingTime", "Tempo de conjuração", [
    f("amount", "amount", "Quantidade", "number", { required: true, min: 1 }),
    f("unit", "unit", "Unidade", "select", { required: true, options: ["action", "bonusAction", "reaction", "minute", "hour"] }),
    f("condition", "condition", "Condição", "text"),
    f("note", "note", "Nota", "text"),
  ]),
  spellRange: sf("spellRange", "Alcance da magia", [
    f("type", "type", "Forma", "select", { required: true, options: ["point", "cone", "cube", "emanation", "line", "sphere"] }),
    f("origin", "origin", "Origem", "select", { options: ["self", "point", "target", "special"] }),
    f("distance", "distance", "Distância", "object", { required: true }),
  ]),
  spellDuration: sf("spellDuration", "Duração da magia", [
    f("type", "type", "Tipo", "select", { required: true, options: ["instant", "timed", "permanent", "special"] }),
    f("amount", "amount", "Quantidade", "number", { min: 0 }),
    f("unit", "unit", "Unidade", "select", { options: ["round", "minute", "hour", "day"] }),
    f("concentration", "concentration", "Concentração", "boolean"),
    f("upTo", "upTo", "Até", "boolean"),
    f("ends", "ends", "Termina por", "multiselect", { options: ["dispel", "trigger"] }),
    f("scaling", "scaling", "Escalonamento", "subform", { subformId: "scaling" }),
  ]),
  spellComponents: sf("spellComponents", "Componentes", [
    f("verbal", "verbal", "Verbal", "boolean"),
    f("somatic", "somatic", "Somático", "boolean"),
    f("material", "material", "Material", "object"),
  ]),
  weight: sf("weight", "Peso", [f("value", "value", "Valor", "number", { required: true }), f("unit", "unit", "Unidade", "select", { required: true, options: ["lb", "oz", "kg", "g", "ton", "custom"] }), f("customUnit", "customUnit", "Unidade personalizada", "text")]),
  price: sf("price", "Preço", [f("amount", "amount", "Valor", "number", { required: true, min: 0 }), f("currency", "currency", "Moeda", "text", { required: true })]),
  itemStack: sf("itemStack", "Item empilhado", [f("item", "item", "Item", "subform", { subformId: "entityRef", required: true }), f("quantity", "quantity", "Quantidade", "number", { required: true, min: 1 }), f("unit", "unit", "Unidade", "text"), f("consumedWithParent", "consumedWithParent", "Consumido com o pai", "boolean")]),
  containerCompartment: sf("containerCompartment", "Compartimento", [f("id", "id", "ID", "text", { required: true }), f("label", "label", "Nome", "text"), f("maxItems", "maxItems", "Máx. itens", "number", { min: 0 }), f("maxWeight", "maxWeight", "Peso máximo", "subform", { subformId: "weight" }), f("acceptedItems", "acceptedItems", "Itens aceitos", "referenceList", { referenceTypes: ["item"] }), f("acceptedTags", "acceptedTags", "Tags aceitas", "collection"), f("description", "description", "Descrição", "textarea")]),
  monsterArmorClass: sf("monsterArmorClass", "Classe de armadura", [f("value", "value", "CA", "number", { required: true, min: 0 }), f("type", "type", "Tipo", "select", { options: ["natural", "armor", "shield", "unarmored", "special"] }), f("condition", "condition", "Condição", "text"), f("sourceItem", "sourceItem", "Item de origem", "reference", { referenceTypes: ["item"] })]),
  monsterMovement: sf("monsterMovement", "Movimento", [f("type", "type", "Tipo", "select", { required: true, options: ["walk", "burrow", "climb", "fly", "swim"] }), f("speed", "speed", "Velocidade", "number", { required: true, min: 0 }), f("unit", "unit", "Unidade", "select", { required: true, options: ["ft"] }), f("hover", "hover", "Hover", "boolean"), f("condition", "condition", "Condição", "text")]),
  monsterSense: sf("monsterSense", "Sentido", [f("type", "type", "Tipo", "select", { required: true, options: ["blindsight", "darkvision", "tremorsense", "truesight", "special"] }), f("range", "range", "Alcance", "number", { min: 0 }), f("unit", "unit", "Unidade", "select", { options: ["ft"] }), f("condition", "condition", "Condição", "text")]),
  monsterProficiency: sf("monsterProficiency", "Proficiência", [f("ability", "ability", "Atributo", "select", { options: abilities }), f("skill", "skill", "Perícia", "text"), f("bonus", "bonus", "Bônus", "text", { required: true })]),
  vehicleStation: sf("vehicleStation", "Estação de veículo", [f("id", "id", "ID", "text", { required: true }), f("name", "name", "Nome", "text", { required: true }), f("crewRequired", "crewRequired", "Tripulação necessária", "number", { required: true, min: 0 }), f("cover", "cover", "Cobertura", "select", { options: ["half", "threeQuarters", "total", "none"] }), f("activities", "activities", "Activities", "subformCollection", { subformId: "activity" }), f("grants", "grants", "Concessões", "referenceList"), f("predicate", "predicate", "Predicado", "subform", { subformId: "predicate" }), f("description", "description", "Descrição", "textarea")]),
};

export function getHomebrewCreatorSubform(id: CreatorSubformId): CreatorSubformDefinition {
  return HOME_BREW_CREATOR_SUBFORMS[id];
}

export function listHomebrewCreatorSubforms(): readonly CreatorSubformDefinition[] {
  return Object.values(HOME_BREW_CREATOR_SUBFORMS);
}
