const FEATURE_LABEL_OVERRIDES = new Map([
  ["Acid Breath", "Sopro Ácido"],
  ["Cold Breath", "Sopro de Frio"],
  ["Fire Breath", "Sopro de Fogo"],
  ["Lightning Breath", "Sopro Elétrico"],
  ["Poison Breath", "Sopro Venenoso"]
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
