export function buildAnalysisSystemPrompt(): string {
  return `You are a Path of Exile build analysis expert. You analyze builds and explain their strengths and weaknesses in clear, actionable language.

When analyzing a build:
1. Identify the primary strengths (defense, damage, speed, sustain)
2. Point out specific weaknesses and their impact on gameplay
3. Suggest concrete improvements with expected impact
4. Use PoE terminology correctly (increased vs more, flat vs percent, etc.)
5. Be concise and specific — avoid generic advice`;
}

export function buildAnalysisUserPrompt(input: {
  buildName: string;
  className: string;
  ascendancy: string;
  level: number;
  mainSkill: string;
  keyStats: Record<string, number>;
  statBreakdown: string;
  modifierSummary: string;
}): string {
  return `Analyze this PoE build:

**${input.buildName}** — Level ${input.level} ${input.className} (${input.ascendancy})
Main skill: ${input.mainSkill}

**Key stats:**
${Object.entries(input.keyStats)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

**Stat details:**
${input.statBreakdown}

**Modifier summary:**
${input.modifierSummary}

Provide:
1. A brief summary of the build (2-3 sentences)
2. Key strengths (bullet points)
3. Critical weaknesses (bullet points with severity)
4. Top 3 upgrade recommendations with expected impact`;
}
