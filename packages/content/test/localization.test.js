import assert from "node:assert/strict";
import test from "node:test";
import { isPresentationPath, localizeEntity } from "../localization.js";

test("localization overlays do not mutate canonical entities", () => {
  const entity = {
    id: "dnd2024:2024:feature:feat-alert:srd-5.2",
    canonicalId: "dnd2024:2024:feature:feat-alert:srd-5.2",
    name: "Alert",
    data: {
      text: { rules: ["You gain the following benefits."] },
      actionRules: [{
        id: "initiative-swap",
        activity: {
          id: "initiative-swap",
          name: "Initiative Swap",
          description: "Swap Initiative.",
          rolls: [{ formula: "2d4" }]
        }
      }]
    }
  };
  const original = structuredClone(entity);
  const catalog = {
    entries: {
      [entity.canonicalId]: {
        name: "Alerta",
        "data.text.rules.0": "Você recebe os benefícios a seguir.",
        "data.actionRules.0.activity.name": "Troca de Iniciativa",
        "data.actionRules.0.activity.description": "Troque a Iniciativa.",
        "data.actionRules.0.activity.id": "NAO-PODE-MUDAR",
        "data.actionRules.0.activity.rolls.0.formula": "999d999"
      }
    }
  };

  const localized = localizeEntity(entity, catalog);

  assert.deepEqual(entity, original);
  assert.equal(localized.name, "Alerta");
  assert.equal(localized.data.text.rules[0], "Você recebe os benefícios a seguir.");
  assert.equal(localized.data.actionRules[0].activity.name, "Troca de Iniciativa");
  assert.equal(localized.data.actionRules[0].activity.description, "Troque a Iniciativa.");
  assert.equal(localized.id, original.id);
  assert.equal(localized.canonicalId, original.canonicalId);
  assert.equal(localized.data.actionRules[0].id, "initiative-swap");
  assert.equal(localized.data.actionRules[0].activity.id, "initiative-swap");
  assert.equal(localized.data.actionRules[0].activity.rolls[0].formula, "2d4");
});

test("string overlays can never replace structured presentation nodes", () => {
  const entity = {
    id: "spell:test",
    canonicalId: "spell:test",
    name: "Test Spell",
    data: {
      text: {
        rules: [
          "A text rule.",
          { type: "entries", name: "Structured Rule", entries: ["Nested text."] }
        ]
      }
    }
  };
  const original = structuredClone(entity);
  const catalog = {
    entries: {
      [entity.canonicalId]: {
        "data.text.rules.0": "Uma regra de texto.",
        "data.text.rules.1": "ISTO NÃO PODE SUBSTITUIR O OBJETO",
        "data.text.rules.1.name": "Regra Estruturada",
        "data.text.rules.1.entries.0": "Texto aninhado."
      }
    }
  };

  const localized = localizeEntity(entity, catalog);

  assert.deepEqual(entity, original);
  assert.equal(localized.data.text.rules[0], "Uma regra de texto.");
  assert.equal(typeof localized.data.text.rules[1], "object");
  assert.equal(localized.data.text.rules[1].type, "entries");
  assert.equal(localized.data.text.rules[1].name, "Regra Estruturada");
  assert.equal(localized.data.text.rules[1].entries[0], "Texto aninhado.");
});

test("only presentation paths are accepted", () => {
  assert.equal(isPresentationPath("name"), true);
  assert.equal(isPresentationPath("data.text.rules.0"), true);
  assert.equal(isPresentationPath("data.actionRules.0.activity.description"), true);
  assert.equal(isPresentationPath("data.activities.0.target.restrictions.0.description"), true);
  assert.equal(isPresentationPath("canonicalId"), false);
  assert.equal(isPresentationPath("data.actionRules.0.activity.id"), false);
  assert.equal(isPresentationPath("data.actionRules.0.activity.rolls.0.formula"), false);
  assert.equal(isPresentationPath("data.activities.0.target.type"), false);
  assert.equal(isPresentationPath("data.activities.0.target.restrictions.0.type"), false);
  assert.equal(isPresentationPath("data.modifiers.0.mode"), false);
});
