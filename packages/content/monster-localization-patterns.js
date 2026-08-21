const FEATURE_LABEL_OVERRIDES = new Map([
  ["Acid Breath", "Sopro Ácido"],
  ["Cold Breath", "Sopro de Frio"],
  ["Fire Breath", "Sopro de Fogo"],
  ["Lightning Breath", "Sopro Elétrico"],
  ["Poison Breath", "Sopro Venenoso"],
  ["Sleep Breath", "Sopro do Sono"],
  ["Slowing Breath", "Sopro de Lentidão"],
  ["Weakening Breath", "Sopro Enfraquecedor"],
  ["Paralyzing Breath", "Sopro Paralisante"],
  ["Repulsion Breath", "Sopro de Repulsão"],
  ["Spellcasting", "Conjuração"]
]);

const SPELL_DISPLAY_NAMES = new Map([
  ["Melf's Acid Arrow", "Flecha Ácida"],
  ["Shatter", "Despedaçar"],
  ["Scorching Ray", "Raio Ardente"],
  ["Guiding Bolt", "Raio Guiador"],
  ["Mind Spike", "Espinho Mental"],
  ["Ice Knife", "Faca de Gelo"],
  ["Fog Cloud", "Nuvem de Névoa"],
  ["Charm Monster", "Enfeitiçar Monstro"]
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

function featureLabel(source, exactMap) {
  return exactMap.get(source) ?? FEATURE_LABEL_OVERRIDES.get(source) ?? null;
}

function attackPhrase(count, source, exactMap) {
  const label = featureLabel(source, exactMap);
  const quantity = COUNT_LABELS.get(count);
  if (!label || !quantity) return null;
  return `${quantity} ataque${count === "one" ? "" : "s"} de ${label}`;
}

function localizeSpellMacro(macro) {
  const match = macro.match(/^\{@spell ([^|}]+)\|XPHB\}$/);
  if (!match) return null;
  const display = SPELL_DISPLAY_NAMES.get(match[1]);
  return display ? `{@spell ${match[1]}|XPHB|${display}}` : null;
}

function translateSpellcastingCast(clause) {
  const match = clause.match(/^Spellcasting to cast (\{@spell [^}]+\})(?: \(level (\d+) version\))?$/);
  if (!match) return null;
  const spell = localizeSpellMacro(match[1]);
  if (!spell) return null;
  return `Conjuração para conjurar ${spell}${match[2] ? ` (versão de nível ${match[2]})` : ""}`;
}

function translateUseClause(clause, exactMap) {
  const spellcasting = translateSpellcastingCast(clause);
  if (spellcasting) return spellcasting;
  const label = featureLabel(clause, exactMap);
  return label ?? null;
}

function translateMultiattack(source, exactMap) {
  let match = source.match(/^The [^.]+ makes (two|three|four) attacks, using (.+?) (or|and) (.+?) in any combination\.$/);
  if (match) {
    const quantity = COUNT_LABELS.get(match[1]);
    const first = featureLabel(match[2], exactMap);
    const second = featureLabel(match[4], exactMap);
    const conjunction = match[3] === "and" ? "e" : "ou";
    if (quantity && first && second) return `A criatura realiza ${quantity} ataques, usando ${first} ${conjunction} ${second} em qualquer combinação.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks? and can use (.+?)\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const use = featureLabel(match[3], exactMap);
    if (attacks && use) return `A criatura realiza ${attacks} e pode usar ${use}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks?\. It can replace one attack with a use of (.+?)\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const replacement = translateUseClause(match[3], exactMap);
    if (attacks && replacement) return `A criatura realiza ${attacks}. Ela pode substituir um ataque por um uso de ${replacement}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks?\. It can replace any attack with a use of (.+?)\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const replacement = translateUseClause(match[3], exactMap);
    if (attacks && replacement) return `A criatura realiza ${attacks}. Ela pode substituir qualquer ataque por um uso de ${replacement}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks?\. It can replace one attack with a use of \(A\) (.+?) or \(B\) (.+?)\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const first = translateUseClause(match[3], exactMap);
    const second = translateUseClause(match[4], exactMap);
    if (attacks && first && second) return `A criatura realiza ${attacks}. Ela pode substituir um ataque por um uso de (A) ${first} ou (B) ${second}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks?\. It can replace one attack with a use of \(A\) (.+?) or \(B\) (.+?) to cast (\{@spell [^}]+\})(?: \(level (\d+) version\))?\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const first = featureLabel(match[3], exactMap);
    const second = featureLabel(match[4], exactMap);
    const spell = localizeSpellMacro(match[5]);
    if (attacks && first && second && spell) return `A criatura realiza ${attacks}. Ela pode substituir um ataque por um uso de (A) ${first} ou (B) ${second} para conjurar ${spell}${match[6] ? ` (versão de nível ${match[6]})` : ""}.`;
  }

  match = source.match(/^The [^.]+ makes (two|three|four) attacks, using (.+?) or (.+?) in any combination\. It can replace one attack with a use of (.+?)\.$/);
  if (match) {
    const quantity = COUNT_LABELS.get(match[1]);
    const first = featureLabel(match[2], exactMap);
    const second = featureLabel(match[3], exactMap);
    const replacement = translateUseClause(match[4], exactMap);
    if (quantity && first && second && replacement) return `A criatura realiza ${quantity} ataques, usando ${first} ou ${second} em qualquer combinação. Ela pode substituir um ataque por um uso de ${replacement}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four) (.+?) attacks? and uses (.+?) or (.+?)\.$/);
  if (match) {
    const attacks = attackPhrase(match[1], match[2], exactMap);
    const first = featureLabel(match[3], exactMap);
    const second = featureLabel(match[4], exactMap);
    if (attacks && first && second) return `A criatura realiza ${attacks} e usa ${first} ou ${second}.`;
  }

  match = source.match(/^The [^.]+ makes one (.+?) attack, one (.+?) attack, and one (.+?) attack\. It can replace the (.+?) attack with a use of (.+?) if available\.$/);
  if (match && match[3] === match[4]) {
    const first = featureLabel(match[1], exactMap);
    const second = featureLabel(match[2], exactMap);
    const third = featureLabel(match[3], exactMap);
    const replacement = featureLabel(match[5], exactMap);
    if (first && second && third && replacement) {
      return `A criatura realiza um ataque de ${first}, um ataque de ${second} e um ataque de ${third}. Ela pode substituir o ataque de ${third} por um uso de ${replacement}, se disponível.`;
    }
  }

  if (/^The hydra makes as many Bite attacks as it has heads\.$/.test(source)) return "A hidra realiza tantos ataques de Mordida quanto o número de cabeças que possui.";

  return null;
}

function translateDamage(type) {
  return DAMAGE_LABELS.get(type) ?? null;
}

function translateRange(clause) {
  const match = clause.match(/^(reach|range) (\d+(?:\/\d+)?) (ft|feet)\.$/);
  if (!match) return null;
  return `${match[1] === "reach" ? "alcance" : "distância"} ${match[2]} pés.`;
}

function translateDamageTail(tail) {
  const match = tail.match(/^(\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage(?: plus (\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage)?\.$/);
  if (!match) return null;
  const first = translateDamage(match[2]);
  const second = match[4] ? translateDamage(match[4]) : null;
  if (!first || (match[4] && !second)) return null;
  return `${match[1]} de dano ${first}${match[3] ? ` mais ${match[3]} de dano ${second}` : ""}.`;
}

function translatePlainAttack(source) {
  const match = source.match(/^(\{@atkr [^}]+\}) (\{@hit [^}]+\})( to hit)?, (.+?) \{@h\}(.+)$/);
  if (!match) return null;
  const range = translateRange(match[4]);
  const damage = translateDamageTail(match[5]);
  if (!range || !damage) return null;
  return `${match[1]} ${match[2]}${match[3] ? " para acertar" : ""}, ${range} {@h}${damage}`;
}

function translateAttackRider(source) {
  let match = source.match(/^(.*damage\.) If the target is a (Medium|Large|Huge) or smaller creature, it has the \{@condition Grappled\|XPHB\} condition \(escape (\{@dc [^}]+\})\) from one of two claws\.$/);
  if (match) {
    const base = translatePlainAttack(match[1]);
    const size = SIZE_LABELS.get(match[2]);
    if (base && size) return `${base} Se o alvo for uma criatura ${size} ou menor, ele recebe a condição {@condition Grappled|XPHB|Agarrado} (escapar ${match[3]}) por uma das duas garras.`;
  }

  match = source.match(/^(.*damage\.) If the target is a (Medium|Large|Huge) or smaller creature, it has the \{@condition Grappled\|XPHB\} condition \(escape (\{@dc [^}]+\})\)\. While \{@condition Grappled\|XPHB\}, the target has the \{@condition Restrained\|XPHB\} condition\.$/);
  if (match) {
    const base = translatePlainAttack(match[1]);
    const size = SIZE_LABELS.get(match[2]);
    if (base && size) return `${base} Se o alvo for uma criatura ${size} ou menor, ele recebe a condição {@condition Grappled|XPHB|Agarrado} (escapar ${match[3]}). Enquanto estiver {@condition Grappled|XPHB|Agarrado}, o alvo também recebe a condição {@condition Restrained|XPHB|Contido}.`;
  }

  match = source.match(/^(.*damage\.) If the target is a (Medium|Large|Huge) or smaller creature and the [^.]+ moved (\d+\+) feet straight toward it immediately before the hit, the target(?: takes an extra (\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage and)? has the \{@condition Prone\|XPHB\} condition\.$/);
  if (match) {
    const base = translatePlainAttack(match[1]);
    const size = SIZE_LABELS.get(match[2]);
    const extraType = match[5] ? translateDamage(match[5]) : null;
    if (base && size && (!match[5] || extraType)) {
      const extra = match[4] ? ` sofre ${match[4]} de dano ${extraType} adicional e` : "";
      return `${base} Se o alvo for uma criatura ${size} ou menor e a criatura tiver se movido ${match[3]} pés em linha reta em direção a ele imediatamente antes do acerto, o alvo${extra} recebe a condição {@condition Prone|XPHB|Caído}.`;
    }
  }

  match = source.match(/^(.*damage), or (\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage if the target is \{@status Bloodied\|XPHB\}\.$/);
  if (match) {
    const base = translatePlainAttack(`${match[1]} damage.`);
    const type = translateDamage(match[3]);
    if (base && type) return `${base.slice(0, -1)}, ou ${match[2]} de dano ${type} se o alvo estiver {@status Bloodied|XPHB|Sangrando}.`;
  }

  match = source.match(/^(.*damage), or (\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage if the [^.]+ had \{@variantrule Advantage\|XPHB\} on the attack roll\.$/);
  if (match) {
    const base = translatePlainAttack(`${match[1]} damage.`);
    const type = translateDamage(match[3]);
    if (base && type) return `${base.slice(0, -1)}, ou ${match[2]} de dano ${type} se a criatura tinha {@variantrule Advantage|XPHB|Vantagem} na jogada de ataque.`;
  }

  match = source.match(/^(.*damage), or (\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage if the [^.]+ moved (\d+\+) feet straight toward the target immediately before the hit\.$/);
  if (match) {
    const base = translatePlainAttack(`${match[1]} damage.`);
    const type = translateDamage(match[3]);
    if (base && type) return `${base.slice(0, -1)}, ou ${match[2]} de dano ${type} se a criatura tiver se movido ${match[4]} pés em linha reta em direção ao alvo imediatamente antes do acerto.`;
  }

  match = source.match(/^(.*damage), plus (\d+(?: \(\{@damage [^}]+\}\))?) ([A-Za-z]+) damage if the attack roll had \{@variantrule Advantage\|XPHB\}\.$/);
  if (match) {
    const base = translatePlainAttack(`${match[1]} damage.`);
    const type = translateDamage(match[3]);
    if (base && type) return `${base.slice(0, -1)}, mais ${match[2]} de dano ${type} se a jogada de ataque teve {@variantrule Advantage|XPHB|Vantagem}.`;
  }

  match = source.match(/^(.*damage), and the target has the \{@condition Poisoned\|XPHB\} condition until the (start|end) of the [^.]+ next turn\.$/);
  if (match) {
    const base = translatePlainAttack(`${match[1]} damage.`);
    if (base) return `${base} O alvo recebe a condição {@condition Poisoned|XPHB|Envenenado} até o ${match[2] === "start" ? "início" : "fim"} do próximo turno da criatura.`;
  }

  return null;
}

function translateCommonTrait(source) {
  if (/^The [^.]+ can climb difficult surfaces, including along ceilings, without needing to make an ability check\.$/.test(source)) {
    return "A criatura pode escalar superfícies difíceis, inclusive tetos, sem precisar fazer um teste de habilidade.";
  }
  if (/^The [^.]+ can breathe only underwater\.$/.test(source)) return "A criatura só pode respirar debaixo d'água.";
  if (/^The [^.]+ doesn't provoke an \{@action Opportunity Attack\|XPHB\} when it flies out of an enemy's reach\.$/.test(source)) {
    return "A criatura não provoca um {@action Opportunity Attack|XPHB|Ataque de Oportunidade} quando voa para fora do alcance de um inimigo.";
  }

  let match = source.match(/^The (.+?) ignores movement restrictions caused by webs, and (?:the (.+?)|it) knows the location of any other creature in contact with the same web\.$/);
  if (match && (!match[2] || match[1] === match[2])) {
    return "A criatura ignora restrições de movimento causadas por teias e sabe a localização de qualquer outra criatura em contato com a mesma teia.";
  }

  match = source.match(/^The [^.]+ sheds \{@variantrule Bright Light\|XPHB\} in a (\d+)-foot radius and \{@variantrule Dim Light\|XPHB\} for an additional (\d+) feet\.$/);
  if (match) {
    return `A criatura emite {@variantrule Bright Light|XPHB|Luz Plena} em um raio de ${match[1]} pés e {@variantrule Dim Light|XPHB|Penumbra} por mais ${match[2]} pés.`;
  }

  match = source.match(/^The [^.]+ jumps up to (\d+) feet by spending (\d+) feet of movement\.$/);
  if (match) return `A criatura salta até ${match[1]} pés gastando ${match[2]} pés de movimento.`;

  match = source.match(/^The [^.]+ can hold its breath for (\d+) (minute|minutes|hour|hours)\.$/);
  if (match) {
    const units = {minute: "minuto", minutes: "minutos", hour: "hora", hours: "horas"};
    return `A criatura pode prender a respiração por ${match[1]} ${units[match[2]]}.`;
  }

  if (/^The [^.]+ deals double damage to objects and structures\.$/.test(source)) return "A criatura causa o dobro de dano a objetos e estruturas.";

  match = source.match(/^The [^.]+ teleports up to (\d+) feet to an unoccupied space it can see\.$/);
  if (match) return `A criatura se teleporta até ${match[1]} pés para um espaço desocupado que possa ver.`;

  if (/^The [^.]+ takes the Disengage or Hide action\.$/.test(source)) return "A criatura realiza a ação Desengajar ou Esconder-se.";
  if (/^The [^.]+ can move through a space as narrow as 1 inch without expending extra movement to do so\.$/.test(source)) return "A criatura pode se mover por um espaço de apenas 1 polegada de largura sem gastar movimento adicional para isso.";
  if (/^While in sunlight, the [^.]+ has \{@variantrule Disadvantage\|XPHB\} on ability checks and attack rolls\.$/.test(source)) return "Enquanto estiver sob luz solar, a criatura tem {@variantrule Disadvantage|XPHB|Desvantagem} em testes de habilidade e jogadas de ataque.";
  if (/^The [^.]+ has \{@variantrule Advantage\|XPHB\} on melee attack rolls while it is \{@status Bloodied\|XPHB\}\.$/.test(source)) return "A criatura tem {@variantrule Advantage|XPHB|Vantagem} em jogadas de ataque corpo a corpo enquanto estiver {@status Bloodied|XPHB|Sangrando}.";

  match = source.match(/^The [^.]+ uses Spellcasting to cast (\{@spell [^}]+\})(?: \(level (\d+) version\))?\. The [^.]+ can't take this action again until the start of its next turn\.$/);
  if (match) {
    const spell = localizeSpellMacro(match[1]);
    if (spell) return `A criatura usa Conjuração para conjurar ${spell}${match[2] ? ` (versão de nível ${match[2]})` : ""}. A criatura não pode realizar esta ação novamente até o início do próximo turno dela.`;
  }

  match = source.match(/^The [^.]+ uses Spellcasting to cast (\{@spell [^}]+\})(?: \(level (\d+) version\))?\.$/);
  if (match) {
    const spell = localizeSpellMacro(match[1]);
    if (spell) return `A criatura usa Conjuração para conjurar ${spell}${match[2] ? ` (versão de nível ${match[2]})` : ""}.`;
  }

  return null;
}

function translateParry(source) {
  const match = source.match(/^\{@actTrigger\} The [^.]+ is hit by a melee attack roll while holding a weapon\. \{@actResponse\} The [^.]+ adds (\d+) to its AC against that attack, possibly causing it to miss\.$/);
  if (!match) return null;
  return `{@actTrigger} A criatura é atingida por uma jogada de ataque corpo a corpo enquanto empunha uma arma. {@actResponse} A criatura adiciona ${match[1]} à sua CA contra esse ataque, possivelmente fazendo-o errar.`;
}

export function translateAdditionalMonsterVariant(source, exactMap) {
  return translatePlainAttack(source)
    ?? translateAttackRider(source)
    ?? translateMultiattack(source, exactMap)
    ?? translateCommonTrait(source)
    ?? translateParry(source);
}
