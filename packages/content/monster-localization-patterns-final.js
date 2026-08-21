const FEATURE_LABELS = new Map([
  ["Bite", "Mordida"],
  ["Claw", "Garra"],
  ["Constrict", "Constrição"],
  ["Dreadful Glare", "Olhar Aterrador"],
  ["Entangling Rope", "Corda Enredante"],
  ["Fling", "Arremessar"],
  ["Harpoon", "Arpão"],
  ["Lightning Strike", "Golpe Elétrico"],
  ["Nightmare Ray", "Raio de Pesadelo"],
  ["Pact Blade", "Lâmina do Pacto"],
  ["Rotting Fist", "Punho Apodrecente"],
  ["Channel Negative Energy", "Canalizar Energia Negativa"],
  ["Swallow", "Engolir"],
  ["Tentacle", "Tentáculo"],
  ["Thorn Burst", "Explosão de Espinhos"],
  ["Vine Lash", "Chicote de Cipó"],
  ["Withering Sword", "Espada Definhante"],
  ["Spellcasting", "Conjuração"]
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
  ["Small", "Pequena"],
  ["Medium", "Média"],
  ["Large", "Grande"],
  ["Huge", "Enorme"]
]);

const COUNT_LABELS = new Map([
  ["one", "um"],
  ["two", "dois"],
  ["three", "três"],
  ["four", "quatro"],
  ["five", "cinco"],
  ["six", "seis"]
]);

function label(name, exactMap) {
  return exactMap.get(name) ?? FEATURE_LABELS.get(name) ?? null;
}

function damageLabel(name) {
  return DAMAGE_LABELS.get(name) ?? null;
}

function translateMultiattack(source, exactMap) {
  let match = source.match(/^The [^.]+ makes (one|two|three|four|five|six) (.+?) attacks? and can use (.+?)\.$/);
  if (match) {
    const count = COUNT_LABELS.get(match[1]);
    const attack = label(match[2], exactMap);
    const use = label(match[3], exactMap);
    if (count && attack && use) return `A criatura realiza ${count} ataque${match[1] === "one" ? "" : "s"} de ${attack} e pode usar ${use}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four|five|six) (.+?) attacks? and uses (.+?)\.$/);
  if (match) {
    const count = COUNT_LABELS.get(match[1]);
    const attack = label(match[2], exactMap);
    const use = label(match[3], exactMap);
    if (count && attack && use) return `A criatura realiza ${count} ataque${match[1] === "one" ? "" : "s"} de ${attack} e usa ${use}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four|five|six) (.+?) attacks? and uses (.+?), (.+?), or (.+?)\.$/);
  if (match) {
    const count = COUNT_LABELS.get(match[1]);
    const attack = label(match[2], exactMap);
    const uses = match.slice(3).map((name) => label(name, exactMap));
    if (count && attack && uses.every(Boolean)) return `A criatura realiza ${count} ataque${match[1] === "one" ? "" : "s"} de ${attack} e usa ${uses[0]}, ${uses[1]} ou ${uses[2]}.`;
  }

  match = source.match(/^The [^.]+ makes (one|two|three|four|five|six) attacks, using (.+?), (.+?), or (.+?) in any combination\.$/);
  if (match) {
    const count = COUNT_LABELS.get(match[1]);
    const attacks = match.slice(2).map((name) => label(name, exactMap));
    if (count && attacks.every(Boolean)) return `A criatura realiza ${count} ataques, usando ${attacks[0]}, ${attacks[1]} ou ${attacks[2]} em qualquer combinação.`;
  }

  match = source.match(/^The [^.]+ makes one (.+?) or (.+?) attack, and it uses (.+?)\.$/);
  if (match) {
    const first = label(match[1], exactMap);
    const second = label(match[2], exactMap);
    const use = label(match[3], exactMap);
    if (first && second && use) return `A criatura realiza um ataque de ${first} ou ${second} e usa ${use}.`;
  }

  match = source.match(/^The [^.]+ makes one (.+?) or (.+?) attack, and it can use Spellcasting to cast (\{@spell Charm Monster\|XPHB\})\.$/);
  if (match) {
    const first = label(match[1], exactMap);
    const second = label(match[2], exactMap);
    if (first && second) return `A criatura realiza um ataque de ${first} ou ${second} e pode usar Conjuração para conjurar {@spell Charm Monster|XPHB|Enfeitiçar Monstro}.`;
  }

  match = source.match(/^The [^.]+ makes (two|three|four|five|six) (.+?) or (.+?) attacks\. It can replace one attack with a use of Spellcasting\.$/);
  if (match) {
    const count = COUNT_LABELS.get(match[1]);
    const first = label(match[2], exactMap);
    const second = label(match[3], exactMap);
    if (count && first && second) return `A criatura realiza ${count} ataques de ${first} ou ${second}. Ela pode substituir um ataque por um uso de Conjuração.`;
  }

  return null;
}

function translateConstrict(source) {
  let match = source.match(/^\{@actSave str\} (\{@dc [^}]+\}), one (Small|Medium|Large|Huge) or smaller creature the [^.]+ can see within (\d+) feet\. \{@actSaveFail\} (\d+ \(\{@damage [^}]+\}\)) Bludgeoning damage, and the target has the \{@condition Grappled\|XPHB\} condition \(escape (\{@dc [^}]+\})\)\.$/);
  if (match) {
    const size = SIZE_LABELS.get(match[2]);
    if (size) return `{@actSave str} ${match[1]}, uma criatura ${size} ou menor que a criatura possa ver a até ${match[3]} pés. {@actSaveFail} ${match[4]} de dano de Concussão, e o alvo recebe a condição {@condition Grappled|XPHB|Agarrado} (escapar ${match[5]}).`;
  }

  match = source.match(/^\{@actSave str\} (\{@dc [^}]+\}), one (Small|Medium|Large|Huge) or smaller creature the [^.]+ can see within (\d+) feet\. \{@actSaveFail\} (\d+ \(\{@damage [^}]+\}\)) Bludgeoning damage\. The target has the \{@condition Grappled\|XPHB\} condition \(escape (\{@dc [^}]+\})\), and it has the \{@condition Restrained\|XPHB\} condition until the grapple ends\.$/);
  if (match) {
    const size = SIZE_LABELS.get(match[2]);
    if (size) return `{@actSave str} ${match[1]}, uma criatura ${size} ou menor que a criatura possa ver a até ${match[3]} pés. {@actSaveFail} ${match[4]} de dano de Concussão. O alvo recebe a condição {@condition Grappled|XPHB|Agarrado} (escapar ${match[5]}) e a condição {@condition Restrained|XPHB|Contido} até o agarrão terminar.`;
  }
  return null;
}

function translateDeathBurst(source) {
  const match = source.match(/^The [^.]+ explodes when it dies\. (\{@actSave [^}]+\}) (\{@dc [^}]+\}), each creature in a (\d+)-foot \{@variantrule Emanation \[Area of Effect\]\|XPHB\|Emanation\} originating from the [^.]+\. (\{@actSaveFail\}) (\d+ \(\{@damage [^}]+\}\)) ([A-Za-z]+) damage\. (\{@actSaveSuccess\}) Half damage\.$/);
  if (!match) return null;
  const type = damageLabel(match[7]);
  if (!type) return null;
  return `A criatura explode quando morre. ${match[1]} ${match[2]}, cada criatura em uma {@variantrule Emanation [Area of Effect]|XPHB|Emanação} de ${match[3]} pés originada na criatura. ${match[4]} ${match[5]} de dano ${type}. ${match[8]} Metade do dano.`;
}

function translateFireAura(source) {
  const match = source.match(/^At the end of each of the [^.]+ turns, each creature in a (\d+)-foot \{@variantrule Emanation \[Area of Effect\]\|XPHB\|Emanation\} originating from the [^.]+ takes (\d+ \(\{@damage [^}]+\}\)) Fire damage\.(?: Creatures and flammable objects in the \{@variantrule Emanation \[Area of Effect\]\|XPHB\|Emanation\} start \{@hazard burning\|XPHB\}\.)?$/);
  if (!match) return null;
  const hasBurning = source.includes("flammable objects");
  return `Ao final de cada turno da criatura, cada criatura em uma {@variantrule Emanation [Area of Effect]|XPHB|Emanação} de ${match[1]} pés originada nela sofre ${match[2]} de dano de Fogo.${hasBurning ? " Criaturas e objetos inflamáveis na {@variantrule Emanation [Area of Effect]|XPHB|Emanação} começam a {@hazard burning|XPHB|queimar}." : ""}`;
}

function translateRestoration(source) {
  if (/^If the [^.]+ dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its \{@variantrule Hit Points\|XPHB\} somewhere in the Abyss\.$/.test(source)) {
    return "Se a criatura morrer fora do Abismo, seu corpo se dissolve em icor e ela adquire instantaneamente um novo corpo, revivendo com todos os seus {@variantrule Hit Points|XPHB|Pontos de Vida} em algum lugar do Abismo.";
  }
  if (/^If the [^.]+ dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its \{@variantrule Hit Points\|XPHB\} somewhere in the Nine Hells\.$/.test(source)) {
    return "Se a criatura morrer fora dos Nove Infernos, seu corpo desaparece em fumaça sulfúrea e ela adquire instantaneamente um novo corpo, revivendo com todos os seus {@variantrule Hit Points|XPHB|Pontos de Vida} em algum lugar dos Nove Infernos.";
  }
  if (/^If the [^.]+ dies outside the Elemental Plane of Fire, its body dissolves into ash, and it gains a new body in \{@dice 1d4\} days, reviving with all its \{@variantrule Hit Points\|XPHB\} somewhere on the Plane of Fire\.$/.test(source)) {
    return "Se a criatura morrer fora do Plano Elemental do Fogo, seu corpo se dissolve em cinzas e ela adquire um novo corpo em {@dice 1d4} dias, revivendo com todos os seus {@variantrule Hit Points|XPHB|Pontos de Vida} em algum lugar do Plano do Fogo.";
  }
  return null;
}

function translateShortTraits(source, exactMap) {
  if (/^The [^.]+ can see 60 feet into the Ethereal Plane while on the Material Plane and vice versa\.$/.test(source)) {
    return "A criatura pode enxergar 60 pés para dentro do Plano Etéreo enquanto estiver no Plano Material, e vice-versa.";
  }
  if (/^The [^.]+ can enter an enemy's space and stop there\. It can move through a space as narrow as 1 inch without expending extra movement to do so\.$/.test(source)) {
    return "A criatura pode entrar no espaço de um inimigo e parar ali. Ela pode se mover por um espaço de apenas 1 polegada de largura sem gastar movimento adicional para isso.";
  }
  if (/^The [^.]+ doesn't provoke \{@action Opportunity Attack\|XPHB\|Opportunity Attacks\} when it flies out of an enemy's reach\.$/.test(source)) {
    return "A criatura não provoca {@action Opportunity Attack|XPHB|Ataques de Oportunidade} quando voa para fora do alcance de um inimigo.";
  }
  if (/^The [^.]+ takes the \{@action Disengage\|XPHB\} or \{@action Hide\|XPHB\} action\.$/.test(source)) {
    return "A criatura realiza a ação {@action Disengage|XPHB|Desengajar} ou {@action Hide|XPHB|Esconder-se}.";
  }
  const leap = source.match(/^The [^.]+ \{@variantrule Long Jump\|XPHB\} is up to (\d+) feet and its \{@variantrule High Jump\|XPHB\} is up to (\d+) feet with or without a running start\.$/);
  if (leap) return `O {@variantrule Long Jump|XPHB|Salto em Distância} da criatura é de até ${leap[1]} pés e seu {@variantrule High Jump|XPHB|Salto em Altura} é de até ${leap[2]} pés, com ou sem corrida prévia.`;

  const uses = source.match(/^The [^.]+ uses (.+?)\.$/);
  if (uses) {
    const translated = label(uses[1], exactMap);
    if (translated) return `A criatura usa ${translated}.`;
  }
  return null;
}

function translateStench(source) {
  const match = source.match(/^(\{@actSave con\}) (\{@dc [^}]+\}), any creature that starts its turn in a (\d+)-foot \{@variantrule Emanation \[Area of Effect\]\|XPHB\|Emanation\} originating from the [^.]+\. (\{@actSaveFail\}) The target has the \{@condition Poisoned\|XPHB\} condition until the start of its next turn\.$/);
  if (!match) return null;
  return `${match[1]} ${match[2]}, qualquer criatura que iniciar seu turno em uma {@variantrule Emanation [Area of Effect]|XPHB|Emanação} de ${match[3]} pés originada na criatura. ${match[4]} O alvo recebe a condição {@condition Poisoned|XPHB|Envenenado} até o início do próximo turno dele.`;
}

function translateSleepBreath(source) {
  const match = source.match(/^(\{@actSave con\}) (\{@dc [^}]+\}), each creature in a (\d+)-foot \{@variantrule Cone \[Area of Effect\]\|XPHB\|Cone\}\. (\{@actSaveFail\}) The target has the \{@condition Incapacitated\|XPHB\} condition until the end of its next turn, at which point it repeats the save\. (\{@actSaveFail 2\}) The target has the \{@condition Unconscious\|XPHB\} condition for 1 minute\. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it\.$/);
  if (!match) return null;
  return `${match[1]} ${match[2]}, cada criatura em um {@variantrule Cone [Area of Effect]|XPHB|Cone} de ${match[3]} pés. ${match[4]} O alvo recebe a condição {@condition Incapacitated|XPHB|Incapacitado} até o fim do próximo turno dele, quando repete a salvaguarda. ${match[5]} O alvo recebe a condição {@condition Unconscious|XPHB|Inconsciente} por 1 minuto. Esse efeito termina para o alvo se ele sofrer dano ou se uma criatura a até 5 pés dele usar uma ação para acordá-lo.`;
}

export function translateFinalCommonMonsterVariant(source, exactMap) {
  return translateMultiattack(source, exactMap)
    ?? translateConstrict(source)
    ?? translateDeathBurst(source)
    ?? translateFireAura(source)
    ?? translateRestoration(source)
    ?? translateStench(source)
    ?? translateSleepBreath(source)
    ?? translateShortTraits(source, exactMap);
}
