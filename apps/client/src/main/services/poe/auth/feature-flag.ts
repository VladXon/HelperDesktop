/**
 * Auth migration bridge — feature flag to switch between old and new auth system.
 *
 * Set HELPER_USE_NEW_AUTH=0 to fall back to old auth paths (electron-ggg-provider,
 * poe-account.service). Default is new auth (IGggAuthenticator chain).
 */

const USE_NEW_AUTH = process.env.HELPER_USE_NEW_AUTH !== '0';

export function isNewAuthEnabled(): boolean {
  return USE_NEW_AUTH;
}
