import { DefaultSessionAuthenticator } from './session';
import { PoesessidAuthenticator } from './poesessid';
import { BrowserWindowAuthenticator } from './browserwindow';
import { FallbackChainAuthenticator } from './fallback';
import type { IGggAuthenticator, PartitionInfo } from './authenticator';
import { isNewAuthEnabled } from './feature-flag';

export type { IGggAuthenticator, GggAuthHeaders, AuthAttemptLog, ValidationResult, ErrorCategory, TransportSelection, PartitionInfo } from './authenticator';

/**
 * Карта: accountId → authenticator instance.
 * Каждый аккаунт получает изолированную Chromium-партицию.
 */
const _instances = new Map<string | symbol, IGggAuthenticator>();
const DEFAULT_KEY = Symbol('default');

/** Очищает инстанс при логауте */
function _clearOnLogout(key: string | symbol, instance: IGggAuthenticator): void {
  // Weakly track — remove from map when invalidated
}

/**
 * Создаёт конфигурированную цепочку аутентификации.
 *
 * Партиционирование:
 *   accountId = null    → DefaultSession использует session.defaultSession (глобальная)
 *   accountId = "12345" → DefaultSession использует session.fromPartition('persist:poe-account-12345')
 *
 * Цепочка (одинаковая для всех аккаунтов):
 *   1. DefaultSession(accountId) — изолированная Chromium-партиция
 *   2. PoesessidHeader          — явный POESESSID в Cookie
 *   3. BrowserWindow            — тяжёлый CF-обход
 *
 * Multi-account:
 *   Account A → DefaultSession(partition="persist:poe-account-A")
 *   Account B → DefaultSession(partition="persist:poe-account-B")
 *   Cookies не пересекаются.
 */
export function createGggAuthenticator(poesessid?: string, accountId?: string | null): IGggAuthenticator {
  const session = new DefaultSessionAuthenticator(accountId);
  const poesessidAuth = new PoesessidAuthenticator(poesessid);
  const browserWindow = new BrowserWindowAuthenticator(poesessid);

  return new FallbackChainAuthenticator([session, poesessidAuth, browserWindow]);
}

/**
 * Возвращает изолированный authenticator для конкретного PoE-аккаунта.
 *
 * @param accountId — ID из таблицы poe_accounts (database).
 *   null = defaultSession (один аккаунт, без изоляции).
 */
export function getGggAuthenticator(poesessid?: string, accountId?: string | null): IGggAuthenticator {
  const key = accountId ?? DEFAULT_KEY;

  if (!_instances.has(key)) {
    const instance = createGggAuthenticator(poesessid, accountId);
    _instances.set(key, instance);
  }
  return _instances.get(key)!;
}

export function resetGggAuthenticator(accountId?: string | null): void {
  const key = accountId ?? DEFAULT_KEY;
  _instances.get(key)?.invalidate().catch(() => {});
  _instances.delete(key);
}

export function resetAllGggAuthenticators(): void {
  for (const [key, instance] of _instances) {
    instance.invalidate().catch(() => {});
    _instances.delete(key);
  }
}

/** Возвращает информацию о партициях всех активных аккаунтов */
export function getActivePartitions(): PartitionInfo[] {
  const parts: PartitionInfo[] = [];
  for (const instance of _instances.values()) {
    const info = instance.getPartitionInfo();
    if (info) parts.push(info);
  }
  return parts;
}

export function getPoesessidAuth(): PoesessidAuthenticator | null {
  for (const instance of _instances.values()) {
    if (instance instanceof FallbackChainAuthenticator) {
      const chainAuths = (instance as unknown as { chain: IGggAuthenticator[] }).chain;
      for (const a of chainAuths) {
        if (a instanceof PoesessidAuthenticator) return a;
      }
    }
  }
  return null;
}

export function getBrowserWindowAuth(): BrowserWindowAuthenticator | null {
  for (const instance of _instances.values()) {
    if (instance instanceof FallbackChainAuthenticator) {
      const chainAuths = (instance as unknown as { chain: IGggAuthenticator[] }).chain;
      for (const a of chainAuths) {
        if (a instanceof BrowserWindowAuthenticator) return a;
      }
    }
  }
  return null;
}

export { DefaultSessionAuthenticator, PoesessidAuthenticator, BrowserWindowAuthenticator, FallbackChainAuthenticator };
