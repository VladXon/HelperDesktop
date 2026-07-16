import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('starts in closed state and executes successfully', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    expect(cb.state()).toBe('closed');
    const result = await cb.execute(async () => 'ok');
    expect(result).toBe('ok');
    expect(cb.state()).toBe('closed');
  });

  it('opens after reaching failure threshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 60_000 });
    const op = vi.fn().mockRejectedValue(new Error('boom'));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(op)).rejects.toThrow('boom');
    }
    expect(cb.state()).toBe('open');
  });

  it('rejects immediately with CircuitOpenError when open', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 60_000 });
    const op = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(cb.execute(op)).rejects.toThrow('boom');
    await expect(cb.execute(op)).rejects.toThrow('boom');
    const op2 = vi.fn().mockResolvedValue('value');
    await expect(cb.execute(op2)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(op2).not.toHaveBeenCalled();
  });

  it('transitions to half-open after reset timeout and closes on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 50 });
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    expect(cb.state()).toBe('open');
    await new Promise((r) => setTimeout(r, 60));
    const success = vi.fn().mockResolvedValue('ok');
    const result = await cb.execute(success);
    expect(result).toBe('ok');
    expect(cb.state()).toBe('closed');
  });

  it('reopens if half-open call fails', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 50 });
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    await new Promise((r) => setTimeout(r, 60));
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    expect(cb.state()).toBe('open');
  });

  it('counts consecutive failures only', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 60_000 });
    await expect(cb.execute(async () => { throw new Error('a'); })).rejects.toThrow('a');
    await expect(cb.execute(async () => { throw new Error('b'); })).rejects.toThrow('b');
    await cb.execute(async () => 'ok');
    await expect(cb.execute(async () => { throw new Error('c'); })).rejects.toThrow('c');
    expect(cb.state()).toBe('closed');
  });
});
