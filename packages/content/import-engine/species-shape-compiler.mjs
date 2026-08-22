import { compileSpeciesDocument as compileBaseSpeciesDocument } from './domain-compilers.mjs';

const clean = value => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/\*+/g, '')
  .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

const abilityToken = value => String(value || '')
  .replace(/Strength/gi, 'STR')
  .replace(/Dexterity/gi, 'DEX')
  .replace(/Constitution/gi, 'CON')
  .replace(/Intelligence/gi, 'INT')
  .replace(/Wisdom/gi, 'WIS')
  .replace(/Charisma/gi, 'CHA')
  .replace(/Proficiency(?: bonus)?/gi, 'PB')
  .replace(/modifier/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

function ruleText(node) {
  return clean([node?.raw, ...(node?.data?.rules || []), ...(node?.rules || [])].filter(Boolean).join('\n'));
}

function parseRetainedBaseTraits(raw) {
  if (!/base race|base species/i.test(raw)) return null;
  const retained = [];
  if (/ability score improvement/i.test(raw)) retained.push('abilityScoreImprovement');
  if (/\bsize\b/i.test(raw)) retained.push('size');
  if (/\blanguages?\b/i.test(raw)) retained.push('languages');
  if (/\bspeed\b/i.test(raw) && /retain/i.test(raw)) retained.push('speed');
  return retained.length ? {
    appliesTo: 'species',
    baseReferenceRequired: true,
    mode: /retain no additional features|no additional features attributed/i.test(raw) ? 'replaceFeatures' : 'overlay',
    retains: [...new Set(retained)]
  } : null;
}

function parseAc(body) {
  const m = body.match(/AC of\s*10\s*\+\s*your\s*(Dexterity)\s*modifier\s*\+\s*your\s*(Strength)\s*modifier/i)
    || body.match(/armor class(?: \(AC\))?\s*(?:equals|is)\s*10\s*\+\s*your\s*(Dexterity)\s*modifier\s*\+\s*your\s*(Strength)\s*modifier/i);
  if (!m) return null;
  return { formula: '10 + DEX + STR', shieldCompatible: /shield/i.test(body) && /benefit|still wield/i.test(body) };
}

function parseNaturalWeapons(body) {
  const out = [];
  const multi = body.match(/(?:claws? and fangs?|natural weapons?)[\s\S]*?deal\s*(\d+d\d+)\s*(slashing)\s+or\s+(piercing)\s+damage/i);
  const bite = body.match(/(?:bite attack|fangs?)[\s\S]*?deal(?:s)?\s*(\d+d\d+)\s*(piercing)\s+damage/i);
  if (multi) out.push({ name: /claws? and fangs?/i.test(body) ? 'Claws and Fangs' : 'Natural Weapon', damage: { formula: multi[1], types: [multi[2].toLowerCase(), multi[3].toLowerCase()] }, proficient: /proficien/i.test(body) });
  else if (bite) out.push({ name: /fangs?/i.test(body) ? 'Fangs' : 'Bite', damage: { formula: bite[1], types: [bite[2].toLowerCase()] }, proficient: /proficien/i.test(body) });
  const infection = body.match(/Constitution save[^.]*?DC\s*(?:being|equals|=)?\s*8\s*\+\s*your\s*proficiency(?: bonus)?\s*\+\s*(?:your\s*)?Wisdom(?: modifier)?[^.]*?(?:cursed with|contract)\s*lycanthropy/i);
  if (infection && out[0]) out[0].onHit = { targetType: /against humanoids/i.test(body) ? 'humanoid' : null, save: { ability: 'CON', dcFormula: '8 + PB + WIS' }, effect: 'lycanthropy' };
  return out;
}

function parseTerrifying(body) {
  if (!/Terrifying Transformation/i.test(body)) return null;
  const range = Number(body.match(/within\s*(\d+)\s*feet/i)?.[1] || 0) || null;
  const once = /use this trait once/i.test(body);
  return {
    activation: 'onEnterForm',
    range,
    save: { ability: 'WIS', dcFormula: /8\s*\+\s*your proficiency bonus\s*\+\s*your Charisma modifier/i.test(body) ? '8 + PB + CHA' : null },
    condition: /frightened/i.test(body) ? 'frightened' : null,
    targetSelection: /creature of your choice/i.test(body) ? 'chosenCreatures' : 'creatures',
    immuneTags: /other lycanthropes are immune/i.test(body) ? ['lycanthrope'] : [],
    resource: once ? { max: 1, recovery: [/long rest/i.test(body) ? 'longRest' : null].filter(Boolean) } : null
  };
}

function parsePackTactics(body) {
  if (!/Help action as a bonus action/i.test(body)) return null;
  return {
    activation: 'bonusAction',
    action: 'Help',
    resource: {
      maxFormula: /Wisdom modifier[^.]*minimum of once/i.test(body) ? 'max(1, WIS)' : /Wisdom modifier/i.test(body) ? 'WIS' : null,
      recovery: [/long rest/i.test(body) ? 'longRest' : null, /short rest/i.test(body) ? 'shortRest' : null].filter(Boolean)
    }
  };
}

function parseDisguise(body) {
  if (!/Insight[^.]*opposed by[^.]*Deception/i.test(body)) return null;
  return { contest: { observer: 'WIS:Insight', actor: 'CHA:Deception' }, appearance: /regular wolf|any other wolf/i.test(body) ? 'ordinary wolf' : null };
}

function parseForm(node) {
  const body = ruleText(node);
  const name = clean(node?.name || 'Form');
  const id = name.toLowerCase().replace(/\s+form$/i, '').replace(/[^a-z0-9]+/g, '-');
  const size = clean(body.match(/your size is\s*(tiny|small|medium|large|huge|gargantuan)/i)?.[1] || '').toLowerCase() || null;
  const cannotWeapons = /unable to wield(?: any)? weapons|cannot wield(?: any)? weapons/i.test(body);
  const canWeapons = /still able to use your weapons|can wield weapons/i.test(body);
  const cannotCast = /cannot cast(?: any)? spells|unable to cast(?: any)? spells/i.test(body);
  const canCast = /still able to[^.]*cast spells|can cast spells/i.test(body);
  const form = {
    id,
    name,
    size,
    canUseWeapons: cannotWeapons ? false : canWeapons ? true : null,
    canCastSpells: cannotCast ? false : canCast ? true : null,
    hitPoints: /retain the same amount of (?:health|hit points)/i.test(body) ? 'preserve' : null,
    armorClass: parseAc(body),
    naturalWeapons: parseNaturalWeapons(body),
    effects: []
  };
  if (/advantage on Strength checks/i.test(body)) form.effects.push({ kind: 'checkAdvantage', ability: 'STR' });
  if (/advantage on Wisdom \(Perception\) checks that rely on hearing or smell/i.test(body)) form.effects.push({ kind: 'checkAdvantage', skill: 'perception', condition: 'hearingOrSmell' });
  if (/equipment[^.]*not transformed|equipment[^.]*does not transform/i.test(body)) form.equipmentTransforms = false;
  if (/armor or clothing[^.]*falls off/i.test(body)) form.equipmentHandling = { incompatibleWearables: 'fallOff' };
  form.terrifyingTransformation = parseTerrifying(body);
  form.disguise = parseDisguise(body);
  form.packTactics = parsePackTactics(body);
  return form;
}

function parseFormChange(raw, forms) {
  const shape = raw.match(/Shapechanger\.\s*As an action[^.]*change into your\s+([^.]*)/i) || raw.match(/As an action[^.]*change into your\s+([^.]*)/i);
  if (!shape && !/change into|transform into|shapechanger/i.test(raw)) return null;
  const options = forms.map(x => x.id);
  return {
    activation: /as a bonus action/i.test(raw) ? 'bonusAction' : /as an action/i.test(raw) ? 'action' : null,
    options,
    statistics: /game statistics, other than your AC, remain the same/i.test(raw) ? { preserve: 'all', exceptions: ['AC'] } : null,
    equipmentTransforms: /equipment[^.]*not transformed/i.test(raw) ? false : null,
    revertActivation: /take an action to revert/i.test(raw) ? 'action' : null,
    revertAtZeroHp: /reduced to 0 hit points/i.test(raw)
  };
}

function enrichSpeciesGraph(ir, compiled) {
  const root = ir?.root || ir;
  const species = compiled.entities?.find(x => x.entityType === 'species');
  if (!root || !species) return compiled;
  const intro = ruleText(root);
  const formNodes = (root?.data?.traits || root?.data?.features || []).filter(x => /\bform\b/i.test(x?.name || ''));
  const forms = formNodes.map(parseForm).filter(Boolean);
  const template = parseRetainedBaseTraits(intro);
  if (template) species.data.template = template;
  if (forms.length) species.data.forms = forms;
  const formChange = parseFormChange(intro, forms);
  if (formChange) species.data.formChange = formChange;
  const dark = intro.match(/Darkvision[\s\S]*?within\s*(\d+)\s*feet/i);
  if (dark) species.data.darkvision = { range: Number(dark[1]), forms: /only have darkvision in hybrid and wolf form/i.test(intro) ? ['hybrid', 'wolf'] : [] };
  const skills = [];
  if (/proficiency in (?:the )?Perception/i.test(intro)) skills.push('perception');
  if (/proficiency in (?:the )?Survival/i.test(intro)) skills.push('survival');
  if (skills.length) species.data.skillProficiencies = [...new Set(skills)];
  if (/same languages as your base race|same languages as your base species/i.test(intro)) species.data.languageInheritance = { fromBaseSpecies: true };
  return compiled;
}

export function compileSpeciesDocument(ir, options = {}) {
  return enrichSpeciesGraph(ir, compileBaseSpeciesDocument(ir, options));
}
