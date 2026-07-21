import { randomBytes } from 'node:crypto';
import { config } from '../../../config.js';
import { getDb, schema } from '../../../db/index.js';
import { eq } from 'drizzle-orm';
import { log } from '../../../utils/logger.js';
import { HttpError } from '../../../middleware/error-handler.js';
import { encryptToken, decryptToken } from '@helper/poe-backend/crypto';

const AUTH_URL = 'https://www.pathofexile.com/oauth/authorize';
const TOKEN_URL = 'https://www.pathofexile.com/oauth/token';
const API_BASE = 'https://www.pathofexile.com/api';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface PoEProfile {
  uuid: string;
  name: string;
}

export function createAuthorizationUrl(): { authUrl: string; state: string } {
  const { poeClientId, poeRedirectUri } = config;

  if (!poeClientId || !poeRedirectUri) {
    throw new HttpError(500, 'config_error', 'PoE OAuth is not configured');
  }

  const state = randomBytes(32).toString('hex');
  const params = new URLSearchParams({
    client_id: poeClientId,
    redirect_uri: poeRedirectUri,
    response_type: 'code',
    scope: 'account:profile account:characters account:stashes',
    state,
  });

  return { authUrl: `${AUTH_URL}?${params.toString()}`, state };
}

export async function handleCallback(code: string, state: string, userId: number): Promise<{ accountName: string }> {
  const { poeClientId, poeClientSecret, poeRedirectUri } = config;

  if (!poeClientId || !poeClientSecret || !poeRedirectUri) {
    throw new HttpError(500, 'config_error', 'PoE OAuth is not configured');
  }

  const db = getDb();

  const stateRows = await db.select().from(schema.poeOauthStates).where(eq(schema.poeOauthStates.state, state)).limit(1);
  if (stateRows.length === 0) throw new HttpError(400, 'invalid_state', 'Invalid OAuth state');

  const now = Math.floor(Date.now() / 1000);
  const stateRow = stateRows[0]!;
  if (stateRow.expiresAt < now) {
    await db.delete(schema.poeOauthStates).where(eq(schema.poeOauthStates.state, state));
    throw new HttpError(400, 'state_expired', 'OAuth state has expired');
  }

  await db.delete(schema.poeOauthStates).where(eq(schema.poeOauthStates.state, state));

  const tokenBody = new URLSearchParams({
    client_id: poeClientId,
    client_secret: poeClientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: poeRedirectUri,
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString(),
  });

  if (!tokenRes.ok) {
    log.info('poe_oauth_token_failed', { status: tokenRes.status });
    throw new HttpError(502, 'oauth_error', 'Failed to exchange OAuth code');
  }

  const tokens: TokenResponse = await tokenRes.json() as TokenResponse;

  const profileRes = await fetch(`${API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    log.info('poe_profile_fetch_failed', { status: profileRes.status });
    throw new HttpError(502, 'profile_error', 'Failed to fetch PoE profile');
  }

  const profile: PoEProfile = await profileRes.json() as PoEProfile;

  const encryptedAccess = encryptToken(tokens.access_token);
  const encryptedRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
  const expiresAt = tokens.expires_in ? String(Date.now() + tokens.expires_in * 1000) : null;

  const existing = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.poeAccountId, profile.uuid)).limit(1);

  if (existing.length > 0) {
    await db.update(schema.poeAccounts)
      .set({
        accountName: profile.name,
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        scopes: tokens.scope,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.poeAccounts.poeAccountId, profile.uuid));
  } else {
    await db.insert(schema.poeAccounts).values({
      userId,
      poeAccountId: profile.uuid,
      accountName: profile.name,
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh,
      tokenExpiresAt: expiresAt,
      scopes: tokens.scope,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  log.info('poe_oauth_connected', { userId, accountName: profile.name });
  return { accountName: profile.name };
}

export async function refreshToken(poeAccountId: string): Promise<string> {
  const { poeClientId, poeClientSecret } = config;
  const db = getDb();

  const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.poeAccountId, poeAccountId)).limit(1);
  if (accounts.length === 0) throw new HttpError(404, 'not_found', 'PoE account not found');

  const account = accounts[0]!;
  if (!account.refreshTokenEncrypted) throw new HttpError(400, 'no_refresh', 'No refresh token available');

  const decryptedRefresh = decryptToken(account.refreshTokenEncrypted);

  const body = new URLSearchParams({
    client_id: poeClientId,
    client_secret: poeClientSecret,
    grant_type: 'refresh_token',
    refresh_token: decryptedRefresh,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) throw new HttpError(502, 'refresh_failed', 'Token refresh failed');

  const tokens: TokenResponse = await res.json() as TokenResponse;

  const encryptedAccess = encryptToken(tokens.access_token);
  const encryptedRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : account.refreshTokenEncrypted;
  const expiresAt = tokens.expires_in ? String(Date.now() + tokens.expires_in * 1000) : String(Date.now() + 3600_000);

  await db.update(schema.poeAccounts)
    .set({
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh,
      tokenExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.poeAccounts.poeAccountId, poeAccountId));

  return tokens.access_token;
}

export async function getCharacters(poeAccountId: string) {
  const accessToken = await getAccessToken(poeAccountId);
  const res = await fetch(`${API_BASE}/character`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new HttpError(502, 'characters_failed', 'Failed to fetch characters');
  return res.json() as Promise<{ characters: Array<{ name: string; league: string; class: string; level: number }> }>;
}

export interface GggCharacterDetail {
  character: {
    name: string;
    league: string;
    classId: number;
    ascendancyClass: number;
    class: string;
    level: number;
    experience: number;
  };
  items: Array<{
    id: string;
    name: string;
    typeLine: string;
    inventoryId: string;
    socketedItems?: Array<{
      id: string;
      typeLine: string;
      properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>;
      requirements?: Array<{ name: string; values: Array<[string, number]>; displayMode: number }>;
      explicitMods?: string[];
      frameType: number;
      socket?: number;
    }>;
    properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>;
    requirements?: Array<{ name: string; values: Array<[string, number]>; displayMode: number }>;
    explicitMods?: string[];
    implicitMods?: string[];
    craftedMods?: string[];
    enchantMods?: string[];
    frameType: number;
    sockets?: Array<{ group: number; attr: string; sColour: string }>;
    socket?: number;
  }>;
  jewels?: Array<unknown>;
}

export async function getCharacterDetail(poeAccountId: string, characterName: string): Promise<GggCharacterDetail> {
  const accessToken = await getAccessToken(poeAccountId);
  const res = await fetch(`${API_BASE}/character/window?character=${encodeURIComponent(characterName)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    log.info('poe_character_detail_failed', { characterName, status: res.status });
    throw new HttpError(502, 'character_detail_failed', `Failed to fetch character detail for ${characterName}`);
  }
  return res.json() as Promise<GggCharacterDetail>;
}

export async function getConnectionStatus(userId: number): Promise<{
  connected: boolean;
  accountName: string | null;
  tokenValid: boolean;
  expiresAt: string | null;
  scopes: string | null;
}> {
  const db = getDb();
  const accounts = await db.select().from(schema.poeAccounts)
    .where(eq(schema.poeAccounts.userId, userId))
    .limit(1);

  if (accounts.length === 0) {
    return { connected: false, accountName: null, tokenValid: false, expiresAt: null, scopes: null };
  }

  const account = accounts[0]!;
  const tokenValid = account.tokenExpiresAt
    ? Date.now() < Number(account.tokenExpiresAt)
    : true;

  return {
    connected: true,
    accountName: account.accountName,
    tokenValid,
    expiresAt: account.tokenExpiresAt,
    scopes: account.scopes,
  };
}

async function getAccessToken(poeAccountId: string): Promise<string> {
  const db = getDb();
  const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.poeAccountId, poeAccountId)).limit(1);
  if (accounts.length === 0) throw new HttpError(404, 'not_found', 'PoE account not found');

  const account = accounts[0]!;
  if (account.tokenExpiresAt) {
    const expiresAt = Number(account.tokenExpiresAt);
    if (Date.now() > expiresAt - 60_000) {
      return refreshToken(poeAccountId);
    }
  }

  try {
    return decryptToken(account.accessTokenEncrypted);
  } catch {
    log.info('poe_token_decrypt_failed', { poeAccountId });
    throw new HttpError(500, 'decrypt_failed', 'Failed to decrypt PoE access token');
  }
}
