import { compileSpeciesDocument as compileBaseSpeciesDocument } from './domain-compilers.mjs';

const clean = value => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/\*+/g, '')
  .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();
const ruleText = node => clean([node?.raw, ...(node?.data?.rules || []), ...(node?.rules || [])].filter(Boolean).join('\n'));
const traitText = trait => `${clean(trait?.name)}. ${ruleText(trait)}`.trim();

function parseRetainedBaseTraits(raw) {
  if (!/base race|base species/i.test(raw)) return null;
  const retained = [];
  if (/ability score improvement/i.test(raw)) retained.push('abilityScoreImprovement');
  if (/\bsize\b/i.test(raw)) retained.push('size');
  if (/\blanguages?\b/i.test(raw)) retained.push('languages');
  if (/\bspeed\b/i.test(raw) && /retain/i.test(raw)) retained.push('speed');
  return retained.length ? {
    appliesTo: 'species', baseReferenceRequired: true,
    mode: /retain no additional features|no additional features attributed/i.test(raw) ? 'replaceFeatures' : 'overlay',
    retains: [...new Set(retained)]
  } : null;
}

function parseAc(body) {
  if (!/(?:AC of|armor class(?: \(AC\))?\s*(?:equals|is))\s*10\s*\+\s*your\s*Dexterity\s*modifier\s*\+\s*your\s*Strength\s*modifier/i.test(body)) return null;
  return { formula: '10 + DEX + STR', shieldCompatible: /shield/i.test(body) && /benefit|still wield/i.test(body) };
}

function parseNaturalWeapons(body) {
  const out = [];
  const multi = body.match(/(?:claws? and fangs?|natural weapons?)[\s\S]*?deal\s*(\d+d\d+)\s*(slashing)\s+or\s+(piercing)\s+damage/i);
  const bite = body.match(/(?:bite(?: attack)?|fangs?|natural weapon)[\s\S]*?deal(?:s)?\s*(\d+d\d+)\s*(piercing)\s+damage/i);
  if (multi) out.push({ name: /claws? and fangs?/i.test(body) ? 'Claws and Fangs' : 'Natural Weapon', damage: { formula: multi[1], types: [multi[2].toLowerCase(), multi[3].toLowerCase()] }, proficient: /proficien/i.test(body) });
  else if (bite) out.push({ name: /fangs?/i.test(body) ? 'Fangs' : /bite/i.test(body) ? 'Bite' : 'Natural Weapon', damage: { formula: bite[1], types: [bite[2].toLowerCase()] }, proficient: /proficien/i.test(body) });
  const infection = /Constitution save[\s\S]*?DC\s*(?:being|equals|=)?\s*8\s*\+\s*your\s*proficiency(?: bonus)?\s*\+\s*(?:your\s*)?Wisdom(?: modifier)?[\s\S]*?(?:cursed with|contract)\s*lycanthropy/i.test(body);
  if (infection && out[0]) out[0].onHit = { targetType: /against humanoids/i.test(body) ? 'humanoid' : null, save: { ability: 'CON', dcFormula: '8 + PB + WIS' }, effect: 'lycanthropy' };
  return out;
}

function parseTerrifying(body) {
  if (!/Terrifying Transformation/i.test(body)) return null;
  return {
    activation: 'onEnterForm',
    range: Number(body.match(/within\s*(\d+)\s*feet/i)?.[1] || 0) || null,
    save: { ability: 'WIS', dcFormula: /8\s*\+\s*your proficiency bonus\s*\+\s*your Charisma modifier/i.test(body) ? '8 + PB + CHA' : null },
    condition: /frightened/i.test(body) ? 'frightened' : null,
    targetSelection: /creature of your choice/i.test(body) ? 'chosenCreatures' : 'creatures',
    immuneTags: /other lycanthropes are immune/i.test(body) ? ['lycanthrope'] : [],
    resource: /use this trait once/i.test(body) ? { max: 1, recovery: [/long rest/i.test(body) ? 'longRest' : null].filter(Boolean) } : null
  };
}
function parsePackTactics(body) {
  if (!/Help action as a bonus action/i.test(body)) return null;
  return { activation: 'bonusAction', action: 'Help', resource: { maxFormula: /Wisdom modifier[\s\S]*?minimum of once/i.test(body) ? 'max(1, WIS)' : /Wisdom modifier/i.test(body) ? 'WIS' : null, recovery: [/long rest/i.test(body) ? 'longRest' : null, /short rest/i.test(body) ? 'shortRest' : null].filter(Boolean) } };
}
function parseDisguise(body) {
  if (!/Insight[\s\S]*?opposed by[\s\S]*?Deception/i.test(body)) return null;
  return { contest: { observer: 'WIS:Insight', actor: 'CHA:Deception' }, appearance: /regular wolf|any other wolf/i.test(body) ? 'ordinary wolf' : null };
}

function parseForm(node) {
  const body = ruleText(node), name = clean(node?.name || 'Form');
  const id = name.toLowerCase().replace(/\s+form$/i, '').replace(/[^a-z0-9]+/g, '-');
  const cannotWeapons = /unable to[\s\S]{0,80}?(?:wield|use)[\s\S]{0,30}?weapons|cannot[\s\S]{0,30}?(?:wield|use)[\s\S]{0,30}?weapons|can't[\s\S]{0,30}?(?:wield|use)[\s\S]{0,30}?weapons/i.test(body);
  const cannotCast = /unable to[\s\S]{0,100}?cast(?: any)? spells|cannot cast(?: any)? spells|can't cast(?: any)? spells/i.test(body);
  const form = {
    id, name,
    size: clean(body.match(/your size is\s*(tiny|small|medium|large|huge|gargantuan)/i)?.[1] || '').toLowerCase() || null,
    canUseWeapons: cannotWeapons ? false : /still able to use your weapons|can wield weapons/i.test(body) ? true : null,
    canCastSpells: cannotCast ? false : /still able to[^.]*cast spells|can cast spells/i.test(body) ? true : null,
    hitPoints: /retain the same amount of (?:health|hit points)/i.test(body) ? 'preserve' : null,
    armorClass: parseAc(body), naturalWeapons: parseNaturalWeapons(body), effects: []
  };
  if (/adv(?:antage|\.) on str(?:ength)? checks/i.test(body)) form.effects.push({ kind: 'checkAdvantage', ability: 'STR' });
  if (/advantage on Wisdom \(Perception\) checks that rely on hearing or smell/i.test(body)) form.effects.push({ kind: 'checkAdvantage', skill: 'perception', condition: 'hearingOrSmell' });
  if (/equipment[^.]*not transformed|equipment[^.]*does not transform/i.test(body)) form.equipmentTransforms = false;
  if (/armor or clothing[^.]*falls off/i.test(body)) form.equipmentHandling = { incompatibleWearables: 'fallOff' };
  form.terrifyingTransformation = parseTerrifying(body);
  form.disguise = parseDisguise(body);
  form.packTactics = parsePackTactics(body);
  return form;
}

function groupForms(traits) {
  const forms = [];
  for (let i=0;i<traits.length;i++) {
    if (!/\bform\b/i.test(traits[i]?.name || '')) continue;
    const parts = [traitText(traits[i])];
    let j=i+1;
    while (j<traits.length && !/\bform\b/i.test(traits[j]?.name || '') && !/random height|suggested characteristics/i.test(traits[j]?.name || '')) { parts.push(traitText(traits[j])); j++; }
    forms.push(parseForm({ name: traits[i].name, rules: [parts.join('\n')] }));
    i=j-1;
  }
  return forms;
}

function parseFormChange(raw, forms) {
  if (!/change into|transform into|shapechanger/i.test(raw)) return null;
  return {
    activation: /as a bonus action/i.test(raw) ? 'bonusAction' : /as an action/i.test(raw) ? 'action' : null,
    options: forms.map(x => x.id),
    statistics: /game statistics, other than (?:your )?AC, remain the same/i.test(raw) ? { preserve: 'all', exceptions: ['AC'] } : /game statistics, other than (?:your )?speed, remain the same/i.test(raw) ? { preserve:'all', exceptions:['speed'] } : null,
    equipmentTransforms: /equipment[^.]*not transformed/i.test(raw) ? false : null,
    revertActivation: /take an action to revert|action[^.]*revert/i.test(raw) ? 'action' : null,
    revertAtZeroHp: /reduced to 0 hit points/i.test(raw)
  };
}

function enrichSpeciesGraph(ir, compiled) {
  const root = ir?.root || ir, species = compiled.entities?.find(x => x.entityType === 'species');
  if (!root || !species) return compiled;
  const traits = root?.data?.traits || root?.data?.features || [];
  const whole = clean([ruleText(root), ...traits.map(traitText)].join('\n'));
  const forms = groupForms(traits);
  const template = parseRetainedBaseTraits(whole);
  if (template) species.data.template = template;
  if (forms.length) species.data.forms = forms;
  const formChange = parseFormChange(whole, forms);
  if (formChange) species.data.formChange = formChange;
  const dark = whole.match(/Darkvision[\s\S]*?within\s*(\d+)\s*feet/i);
  if (dark) species.data.darkvision = { range: Number(dark[1]), forms: /only have darkvision in hybrid and wolf form/i.test(whole) ? ['hybrid', 'wolf'] : [] };
  const profBlock = whole.match(/(?:gain|have) proficiency in[\s\S]{0,180}?(?:skills?|\.)/i)?.[0] || whole;
  const skills = [];
  if (/\bPerception\b/i.test(profBlock) && /proficien/i.test(profBlock)) skills.push('perception');
  if (/\bSurvival\b/i.test(profBlock) && /proficien/i.test(profBlock)) skills.push('survival');
  if (skills.length) species.data.skillProficiencies = [...new Set(skills)];
  if (/same languages as your base race|same languages as your base species/i.test(whole)) species.data.languageInheritance = { fromBaseSpecies: true };
  return compiled;
}

export function compileSpeciesDocument(ir, options = {}) {
  return enrichSpeciesGraph(ir, compileBaseSpeciesDocument(ir, options));
}
