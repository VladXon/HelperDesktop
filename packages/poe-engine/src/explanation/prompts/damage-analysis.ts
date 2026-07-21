export function damageAnalysisSystemPrompt(): string {
  return `You are a Path of Exile damage scaling expert. You analyze damage profiles and suggest optimization strategies.

Key concepts:
- Increased vs More multipliers — More is always multiplicative with itself
- Damage conversion chains and how they scale
- Critical strike scaling (chance × multiplier breakpoints)
- Attack/cast speed breakpoints
- Penetration and resistance reduction
- Ailment DPS (poison, bleed, ignite) and their scaling vectors
- "Double dipping" and how stat types apply`;
}

export function damageAnalysisUserPrompt(input: {
  mainSkill: string;
  totalDps: number;
  bossDps: number;
  damageBreakdown: Record<string, number>;
  critChance: number;
  critMultiplier: number;
  attackSpeed: number;
  penetration: number;
  isDotBuild: boolean;
  primaryScalars: { name: string; value: number; efficiency: number }[];
  bottlenecks: string[];
}): string {
  return `Analyze the damage profile of this build:

**Main skill:** ${input.mainSkill}
- Total DPS: ${input.totalDps}
- Boss DPS (after resistances): ${input.bossDps}

**Damage breakdown by type:**
${Object.entries(input.damageBreakdown)
  .map(([type, val]) => `- ${type}: ${val}`)
  .join('\n')}

**Crit stats:**
- Chance: ${input.critChance}%
- Multiplier: ${input.critMultiplier}%

**Other:**
- Attack/Cast Speed: ${input.attackSpeed}
- Penetration: ${input.penetration}%
- Dot build: ${input.isDotBuild ? 'Yes' : 'No'}

**Primary scaling vectors (efficiency = %DPS per point):**
${input.primaryScalars
  .map((s) => `- ${s.name}: ${s.value} (efficiency: ${s.efficiency})`)
  .join('\n')}

**Bottlenecks:**
${input.bottlenecks.map((b) => `- ${b}`).join('\n')}

Provide:
1. Overall damage assessment for current content
2. Which scaling vector gives the most DPS per investment
3. What the main bottleneck is and how to fix it
4. Specific changes to increase boss DPS
5. Return on investment for different upgrade paths`;
}
