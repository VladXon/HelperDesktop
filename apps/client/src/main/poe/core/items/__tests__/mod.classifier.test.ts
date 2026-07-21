import { describe, it, expect } from 'vitest';
import { classifyMod } from '../mod.classifier.js';

describe('mod classifier', () => {
  it('classifies explicit mod from flag', () => {
    const result = classifyMod('+99 to maximum life', false, true, false);
    expect(result.category).toBe('explicit');
    expect(result.tags).toContain('life');
  });

  it('classifies implicit mod from flag', () => {
    const result = classifyMod('+12% to all elemental resistances', true, false, false);
    expect(result.category).toBe('implicit');
    expect(result.tags).toContain('resist');
  });

  it('classifies crafted mod from flag', () => {
    const result = classifyMod('+15% to cold resistance', false, false, true);
    expect(result.category).toBe('crafted');
  });

  it('detects veiled mod from text', () => {
    const result = classifyMod('Veiled prefix', false, true, false);
    expect(result.category).toBe('veiled');
  });

  it('detects fractured mod from text', () => {
    const result = classifyMod('+50 to maximum life (Fractured)', false, true, false);
    expect(result.category).toBe('fractured');
  });

  it('detects influence mod from text', () => {
    const result = classifyMod('Shaper Item', false, true, false);
    expect(result.category).toBe('influence');
  });

  it('detects synthesized from text', () => {
    const result = classifyMod('Synthesised Item', false, true, false);
    expect(result.category).toBe('synthesized');
  });

  it('gathers damage tag for damage mods', () => {
    const result = classifyMod('Adds 12 to 24 fire damage', false, true, false);
    expect(result.tags).toContain('damage');
    expect(result.tags).toContain('fire');
  });

  it('gathers defense tags for armour mods', () => {
    const result = classifyMod('+1500 to armour', false, true, false);
    expect(result.tags).toContain('armour');
  });

  it('gathers speed tag for movement speed', () => {
    const result = classifyMod('+25% to movement speed', false, true, false);
    expect(result.tags).toContain('speed');
  });

  it('gathers critical tag for crit mods', () => {
    const result = classifyMod('+30% to critical strike multiplier', false, true, false);
    expect(result.tags).toContain('critical');
  });

  it('gathers conversion tag for extra-as mods', () => {
    const result = classifyMod('Gain 10% of Physical Damage as Extra Fire', false, true, false);
    expect(result.tags).toContain('conversion');
  });

  it('deduplicates tags', () => {
    const result = classifyMod('+30% to fire resistance and fire damage', false, true, false);
    const fireCount = result.tags.filter((t) => t === 'fire').length;
    expect(fireCount).toBeLessThanOrEqual(2);
  });
});
