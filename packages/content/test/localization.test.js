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

test("only presentation paths are accepted", () => {
  assert.equal(isPresentationPath("name"), true);
  assert.equal(isPresentationPath("data.text.rules.0"), true);
  assert.equal(isPresentationPath("data.actionRules.0.activity.description"), true);
  assert.equal(isPresentationPath("canonicalId"), false);
  assert.equal(isPresentationPath("data.actionRules.0.activity.id"), false);
  assert.equal(isPresentationPath("data.actionRules.0.activity.rolls.0.formula"), false);
  assert.equal(isPresentationPath("data.modifiers.0.mode"), false);
});
