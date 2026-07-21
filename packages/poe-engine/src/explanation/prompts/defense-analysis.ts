export function defenseAnalysisSystemPrompt(): string {
  return `You are a Path of Exile defense specialist. You analyze defensive layers and survivability.

Key concepts to reference:
- Effective HP (EHP) against physical, elemental, and chaos damage
- Defensive layers: life/ES pool, resistances, armour, evasion, block, spell suppression, recovery
- Max hit taken vs one-shot thresholds
- Recovery mechanics: leech, regen, recoup, life on hit/block
- Ailment immunity and avoidance
- Guard skills and their uptime`;
}

export function defenseAnalysisUserPrompt(input: {
  life: number;
  energyShield: number;
  combinedPool: number;
  resistances: Record<string, { uncapped: number; capped: number }>;
  armour: number;
  evasion: number;
  block: number;
  spellSuppression: number;
  recovery: string;
  ehp: Record<string, number>;
  problems: string[];
}): string {
  return `Analyze the defensive setup of this build:

**Life pool:**
- Life: ${input.life}
- Energy Shield: ${input.energyShield}
- Combined: ${input.combinedPool}

**Resistances (capped/uncapped):**
${Object.entries(input.resistances)
  .map(([elem, vals]) => `- ${elem}: ${vals.capped}% (${vals.uncapped}% uncapped)`)
  .join('\n')}

**Mitigation:**
- Armour: ${input.armour}
- Evasion: ${input.evasion}
- Block: ${input.block}%
- Spell Suppression: ${input.spellSuppression}%

**Recovery:** ${input.recovery}

**Max hits taken:**
${Object.entries(input.ehp)
  .map(([type, val]) => `- ${type}: ${val}`)
  .join('\n')}

**Known problems:**
${input.problems.map((p) => `- ${p}`).join('\n')}

Provide:
1. Overall survivability assessment
2. Which damage types are most dangerous and why
3. What defensive layer should be prioritized for improvement
4. Specific suggestions to improve survivability with estimated impact`;
}
