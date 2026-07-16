import { describe, expect, it } from 'vitest';
import {
  botLinkByCodeSchema,
  botQrLoginApproveSchema,
  botUnlinkByTelegramIdSchema,
  loginSchema,
  noteCreateSchema,
  passwordPolicySchema,
  presetCreateSchema,
} from '../index.js';

describe('loginSchema', () => {
  it('accepts valid login', () => {
    expect(loginSchema.parse('valid_login-123').length).toBeGreaterThan(0);
  });

  it('rejects login with invalid characters', () => {
    expect(() => loginSchema.parse('bad login!')).toThrow();
    expect(() => loginSchema.parse('логин')).toThrow();
  });

  it('rejects too short login', () => {
    expect(() => loginSchema.parse('ab')).toThrow();
  });

  it('rejects too long login', () => {
    expect(() => loginSchema.parse('a'.repeat(65))).toThrow();
  });
});

describe('passwordPolicySchema', () => {
  it('accepts strong password', () => {
    expect(passwordPolicySchema.parse('Strong1Pass')).toBe('Strong1Pass');
  });

  it('rejects short password', () => {
    expect(() => passwordPolicySchema.parse('Abc1')).toThrow();
  });

  it('rejects password without digit', () => {
    expect(() => passwordPolicySchema.parse('NoDigitHere')).toThrow();
  });

  it('rejects password without uppercase', () => {
    expect(() => passwordPolicySchema.parse('lowercase1')).toThrow();
  });

  it('rejects password without lowercase', () => {
    expect(() => passwordPolicySchema.parse('UPPERCASE1')).toThrow();
  });
});

describe('noteCreateSchema', () => {
  it('applies defaults', () => {
    const result = noteCreateSchema.parse({});
    expect(result.title).toBe('');
    expect(result.body).toBe('');
    expect(result.tags).toEqual([]);
    expect(result.reminderAt).toBeNull();
    expect(result.notifyTelegram).toBe(false);
  });

  it('rejects title over 200 chars', () => {
    expect(() => noteCreateSchema.parse({ title: 'x'.repeat(201) })).toThrow();
  });

  it('rejects body over 10000 chars', () => {
    expect(() => noteCreateSchema.parse({ body: 'x'.repeat(10001) })).toThrow();
  });

  it('rejects more than 10 tags', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(() => noteCreateSchema.parse({ tags })).toThrow();
  });
});

describe('presetCreateSchema', () => {
  it('accepts valid preset with apps', () => {
    const result = presetCreateSchema.parse({
      name: 'Work',
      icon: 'Briefcase',
      apps: [{ name: 'VSCode', path: 'C:\\VSCode\\code.exe', runAsAdmin: false }],
    });
    expect(result.apps).toHaveLength(1);
  });

  it('rejects preset with too many apps', () => {
    const apps = Array.from({ length: 33 }, (_, i) => ({
      name: `app${i}`,
      path: `C:\\app${i}.exe`,
    }));
    expect(() => presetCreateSchema.parse({ name: 'X', apps })).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => presetCreateSchema.parse({ name: '' })).toThrow();
  });
});

describe('botQrLoginApproveSchema', () => {
  it('accepts positive telegramId', () => {
    const result = botQrLoginApproveSchema.parse({
      token: 'abc',
      telegramId: 123456,
    });
    expect(result.telegramId).toBe(123456);
  });

  it('rejects non-positive telegramId', () => {
    expect(() => botQrLoginApproveSchema.parse({ token: 'abc', telegramId: 0 })).toThrow();
    expect(() => botQrLoginApproveSchema.parse({ token: 'abc', telegramId: -1 })).toThrow();
  });
});

describe('botLinkByCodeSchema', () => {
  it('accepts valid code + telegramId', () => {
    const result = botLinkByCodeSchema.parse({ code: 'X7K9P2', telegramId: 999 });
    expect(result.code).toBe('X7K9P2');
  });
});

describe('botUnlinkByTelegramIdSchema', () => {
  it('accepts positive telegramId', () => {
    const result = botUnlinkByTelegramIdSchema.parse({ telegramId: 1 });
    expect(result.telegramId).toBe(1);
  });

  it('rejects non-positive telegramId', () => {
    expect(() => botUnlinkByTelegramIdSchema.parse({ telegramId: 0 })).toThrow();
  });
});
