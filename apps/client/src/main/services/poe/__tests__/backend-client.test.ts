import { describe, it, expect } from 'vitest';
import * as backend from '../backend-client.js';

describe('PoE Backend Client', () => {
  it('exports saveBuild function', () => {
    expect(typeof backend.saveBuild).toBe('function');
  });

  it('exports listBuilds function', () => {
    expect(typeof backend.listBuilds).toBe('function');
  });

  it('exports deleteBuild function', () => {
    expect(typeof backend.deleteBuild).toBe('function');
  });

  it('exports compareBuilds function', () => {
    expect(typeof backend.compareBuilds).toBe('function');
  });

  it('exports getAccounts function', () => {
    expect(typeof backend.getAccounts).toBe('function');
  });

  it('exports disconnectAccount function', () => {
    expect(typeof backend.disconnectAccount).toBe('function');
  });

  it('exports getAuthUrl function', () => {
    expect(typeof backend.getAuthUrl).toBe('function');
  });
});
