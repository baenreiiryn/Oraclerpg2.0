const clean = value => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/\*+/g, '')
  .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

const slug = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseSizes(text) {
  return [...new Set([...text.matchAll(/\b(Tiny|Small|Medium|Large|Huge|Gargantuan)\b/gi)].map(m => m[1].toLowerCase()))];
}

function namedFixedForms(text) {
  const forms = [];
  const patterns = [
    /into (?:a|an)\s+(Tiny|Small|Medium|Large|Huge|Gargantuan)?\s*([A-Za-z][A-Za-z -]{1,40}?)(?=\s+or\s+(?:a|an)|,?\s+or back into|,?\s+or into|\.|$)/gi,
    /into (?:its|a)\s+([A-Za-z][A-Za-z -]{1,30}?)\s+form(?=,|\.|\s+or)/gi
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const size = m.length > 2 ? clean(m[1]).toLowerCase() || null : null;
      const label = clean(m.length > 2 ? m[2] : m[1]).replace(/^(?:wolf-humanoid|humanoid-wolf)\s*/i, 'hybrid ');
      if (!label || /true form/i.test(label)) continue;
      const id = /hybrid/i.test(label) ? 'hybrid' : /\bwolf\b/i.test(label) ? 'wolf' : /\bbat\b/i.test(label) ? 'bat' : /mist/i.test(label) ? 'mist' : slug(label);
      if (!forms.some(x => x.id === id)) forms.push({ id, name: label, size });
    }
  }
  if (/wolf-humanoid hybrid|hybrid form/i.test(text) && !forms.some(x=>x.id==='hybrid')) forms.push({id:'hybrid',name:'Hybrid',size:null});
  if (/\binto (?:a )?wolf\b/i.test(text) && !forms.some(x=>x.id==='wolf')) forms.push({id:'wolf',name:'Wolf',size:null});
  if (/\bTiny bat\b/i.test(text) && !forms.some(x=>x.id==='bat')) forms.push({id:'bat',name:'Bat',size:'tiny'});
  if (/\bcloud of mist\b/i.test(text) && !forms.some(x=>x.id==='mist')) forms.push({id:'mist',name:'Mist',size:/Medium cloud of mist/i.test(text)?'medium':null});
  return forms;
}

function parseCopiedTarget(text) {
  const humanoid = text.match(/into (?:a|an)\s+((?:Tiny|Small|Medium|Large|Huge|Gargantuan)(?:\s+or\s+(?:Tiny|Small|Medium|Large|Huge|Gargantuan))*)\s+humanoid/i);
  if (humanoid) return { kind:'humanoid', sizes:parseSizes(humanoid[1]), seenRequired:/it has seen|has seen/i.test(text) };
  const creature = text.match(/into (?:a|an)\s+creature[^.]*?challenge rating\s*(\d+)/i);
  if (creature) return { kind:'creature', maxCr:Number(creature[1]) };
  return null;
}

function parsePreservation(text) {
  let m = text.match(/statistics,? other than (?:its|the)\s+([A-Za-z ,and]+?),? (?:are|remain) the same/i);
  if (m) return { preserve:'all', exceptions:m[1].split(/,|\band\b/i).map(clean).filter(Boolean).map(x=>x.toLowerCase().replace(/armor class|ac/,'ac')) };
  m = text.match(/game statistics,? other than (?:its|the|your)\s+([A-Za-z ,and]+?),? remain the same/i);
  if (m) return { preserve:'all', exceptions:m[1].split(/,|\band\b/i).map(clean).filter(Boolean).map(x=>x.toLowerCase().replace(/armor class|ac/,'ac')) };
  if (/statistics are the same in each form/i.test(text)) return { preserve:'all', exceptions:[] };
  return null;
}

function parseEquipment(text) {
  if (/equipment[^.]*is not transformed|equipment[^.]*doesn't transform|equipment[^.]*does not transform/i.test(text)) return { transforms:false };
  if (/equipment[^.]*falls to the ground/i.test(text)) return { transforms:false, onChange:'fallsToGround' };
  if (/equipment[^.]*merges into/i.test(text)) return { transforms:false, onChange:'mergesIntoForm' };
  return null;
}

function parseFeature(feature) {
  const text = clean(`${feature?.name || ''}. ${feature?.text || ''}`);
  if (!/(shapechanger|change shape|shape-shift|shape shift|shapeshift|polymorphs? into|transforms? into)/i.test(text)) return null;
  const fixedForms = namedFixedForms(text);
  const copiedTarget = parseCopiedTarget(text);
  const change = {
    sourceFeature: feature.name,
    activation: feature.activation || (/bonus action/i.test(text) ? 'bonusAction' : /(?:as|use) (?:an|its) action|can use its action/i.test(text) ? 'action' : null),
    mode: copiedTarget ? 'copyTarget' : fixedForms.length ? 'fixedForms' : 'transformation',
    forms: fixedForms,
    target: copiedTarget,
    preservation: parsePreservation(text),
    equipment: parseEquipment(text),
    trueFormReturn: /back into (?:its|their) true form|revert to (?:its|their) true form/i.test(text),
    revertOnDeath: /reverts?[^.]*if it dies|reverts?[^.]*when it dies/i.test(text),
    revertAtZeroHp: /reduced to 0 hit points/i.test(text),
    restrictions: []
  };
  if (/sunlight/i.test(text) && /(not in sunlight|isn't in sunlight|is not in sunlight|can't use|cannot use)/i.test(text)) change.restrictions.push('sunlight');
  if (/running water/i.test(text) && /(not in sunlight or running water|not in running water|isn't in running water|is not in running water|can't use|cannot use)/i.test(text)) change.restrictions.push('runningWater');
  return change;
}

function formClause(text, id) {
  if (id === 'bat') return text.match(/(?:in )?bat form[\s\S]*?(?=(?:in )?mist form|$)/i)?.[0] || '';
  if (id === 'mist') return text.match(/(?:in )?mist form[\s\S]*$/i)?.[0] || '';
  return text;
}
function applyFormSpecificRules(change, feature) {
  const text = clean(feature?.text || '');
  for (const form of change.forms || []) {
    const clause = formClause(text, form.id);
    const noActions = /can't take actions|cannot take actions/i.test(clause);
    const noSpeech = /can't speak|cannot speak|(?:can't|cannot) take actions or speak/i.test(clause);
    if (form.id === 'bat') {
      const fly = clause.match(/flying speed(?: of| is)?\s*(\d+)\s*feet/i);
      const walk = clause.match(/walking speed(?: of| is)?\s*(\d+)\s*feet/i);
      form.speed = { ...(walk?{walk:Number(walk[1])}:{}), ...(fly?{fly:Number(fly[1])}:{}) };
      if (noSpeech) form.canSpeak=false;
      if (noActions) form.canTakeActions=false;
    }
    if (form.id === 'mist') {
      const fly = clause.match(/flying speed(?: of| is)?\s*(\d+)\s*feet/i);
      form.speed = fly ? { fly:Number(fly[1]) } : form.speed;
      form.hover = /\bhover\b/i.test(clause);
      if (noActions) form.canTakeActions=false;
      if (noSpeech) form.canSpeak=false;
    }
  }
}

export function enrichMonsterShapeMechanics(root) {
  const lists = [root?.data?.traits, root?.data?.actions, root?.data?.bonusActions, root?.data?.reactions].filter(Array.isArray);
  const changes = [];
  for (const list of lists) {
    for (const feature of list) {
      const change = parseFeature(feature);
      if (!change) continue;
      applyFormSpecificRules(change, feature);
      feature.formChange = change;
      changes.push(change);
    }
  }
  if (changes.length) root.data.formChanges = changes;
  return root;
}
