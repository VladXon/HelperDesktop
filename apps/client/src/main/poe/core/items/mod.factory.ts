import type { Modifier, ModSource } from './modifier.model.js';
import { classifyMod } from './mod.classifier.js';
import { parseModRange } from './mod.range.parser.js';

let idCounter = 0;

export interface ModifierInput {
  text: string;
  implicit: boolean;
  explicit: boolean;
  crafted: boolean;
  source: ModSource;
}

export function createModifier(input: ModifierInput): Modifier {
  const classified = classifyMod(input.text, input.implicit, input.explicit, input.crafted);
  const stats = parseModRange(input.text);
  const values = stats
    .filter((s) => s.type === 'flat')
    .map((s) => s.value);

  return {
    id: `mod_${++idCounter}`,
    source: input.source,
    category: classified.category,
    text: input.text,
    stats,
    tags: classified.tags,
    tier: classified.tier,
    values,
  };
}

export function createModifiers(inputs: ModifierInput[]): Modifier[] {
  return inputs.map(createModifier);
}
