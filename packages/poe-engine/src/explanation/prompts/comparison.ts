export function comparisonSystemPrompt(): string {
  return `You are a Path of Exile build comparison specialist. You compare two builds and explain the differences clearly.

Guidelines:
1. Compare absolute differences and relative percentages
2. Highlight trade-offs — what each build gains and loses
3. Consider content suitability (mapping vs bossing vs delve vs etc.)
4. Consider budget and gear requirements
5. Be neutral — don't declare one "better" without context`;
}

export function comparisonUserPrompt(input: {
  buildA: { name: string; stats: Record<string, number> };
  buildB: { name: string; stats: Record<string, number> };
  context: string;
}): string {
  return `Compare these two builds:

**Build A: ${input.buildA.name}**
${Object.entries(input.buildA.stats)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

**Build B: ${input.buildB.name}**
${Object.entries(input.buildB.stats)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

**Context:** ${input.context}

Provide:
1. Key differences in defense, damage, and utility
2. Which build performs better for mapping, bossing, and specific content
3. Budget comparison — which is cheaper to gear
4. Which build you would recommend and why`;
}
