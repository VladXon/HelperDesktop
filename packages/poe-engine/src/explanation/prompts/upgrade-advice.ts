export function upgradeAdviceSystemPrompt(): string {
  return `You are a Path of Exile gear and upgrade advisor. You provide specific, actionable upgrade recommendations based on build analysis data.

Guidelines:
1. Prioritize upgrades with the highest cost/benefit ratio
2. Specify target stat values and acceptable ranges
3. Consider budget constraints realistically
4. Mention trade-offs (what you lose vs what you gain)
5. Suggest specific item bases, mods, and crafting methods when relevant`;
}

export function upgradeAdviceUserPrompt(input: {
  currentStats: Record<string, number>;
  weaknesses: string[];
  budget: string;
  targetContent: string;
}): string {
  return `Recommend upgrades for this build:

**Current weak points:**
${input.weaknesses.map((w) => `- ${w}`).join('\n')}

**Budget tier:** ${input.budget}
**Target content:** ${input.targetContent}

**Current key values:**
${Object.entries(input.currentStats)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

Provide:
1. Priority upgrade slots (ranked by impact)
2. For each slot: target mods, expected stat gains, estimated cost
3. Alternative budget options if applicable
4. Crafting vs trading recommendation per slot`;
}
