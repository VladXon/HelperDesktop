import { ipcMain, shell, session as electronSession } from 'electron';
import { createPoeAccountService } from '../services/poe/poe-account.service.js';
import { createPoeTradeService } from '../services/poe/poe-trade.service.js';
import { createPoeImportService } from '../services/poe/poe-import.service.js';
import { createPoeAnalysisService } from '../services/poe/poe-analysis.service.js';
import { convertCharacterToBuild, fetchPassiveSkills } from '../services/poe/poe-character.service.js';
import type { GggCharacterDetail } from '../services/poe/poe-character.service.js';
import { createModDB } from '@helper/poe-engine';
import type { ModDB } from '@helper/poe-engine';
import * as backend from '../services/poe/backend-client.js';
import { createElectronGggProvider } from '../services/poe/electron-ggg-provider.js';
import {
  getGggAuthenticator,
  getPoesessidAuth,
  getBrowserWindowAuth,
} from '../services/poe/auth/factory.js';
import { isNewAuthEnabled } from '../services/poe/auth/feature-flag.js';
import type { IGggAuthenticator, AuthAttemptLog } from '../services/poe/auth/authenticator.js';

let _poeInitialized = false;
let _modDb: ModDB | null = null;
let _newAuth: IGggAuthenticator | null = null;

function getModDb(): ModDB {
  if (!_modDb) _modDb = createModDB();
  return _modDb;
}

function getNewAuth(): IGggAuthenticator {
  if (!_newAuth) _newAuth = getGggAuthenticator();
  return _newAuth;
}

/** Устанавливает POESESSID во все authenticators + в default Chromium session */
async function setNewAuthPoesessid(poesessid: string): Promise<void> {
  const poeAuth = getPoesessidAuth();
  const bwAuth = getBrowserWindowAuth();
  if (poeAuth) poeAuth.setPoesessid(poesessid);
  if (bwAuth) bwAuth.setPoesessid(poesessid);
  await electronSession.defaultSession.cookies.set({
    url: 'https://www.pathofexile.com',
    name: 'POESESSID',
    value: poesessid,
    domain: '.pathofexile.com',
    path: '/',
    secure: true,
    sameSite: 'lax',
    httpOnly: true,
  });
}

export function registerPoeIpc(): void {
  if (_poeInitialized) return;
  _poeInitialized = true;

  const account = createPoeAccountService();
  const trade = createPoeTradeService();
  const importService = createPoeImportService();
  const analysis = createPoeAnalysisService(getModDb());
  const gggProvider = createElectronGggProvider();

  // ── NEW: Unified auth (feature-flagged) ────────────────────────
  if (isNewAuthEnabled()) {
    console.log('[auth:migration] new IGggAuthenticator chain active');

    ipcMain.handle('poe:auth-validate', async (_e, poesessid?: string) => {
      const auth = getNewAuth();
      if (poesessid) await setNewAuthPoesessid(poesessid);
      const vr = await auth.validate();
      return {
        valid: vr.valid,
        accountName: vr.accountName ?? null,
        errorCategory: vr.errorCategory,
        errorMessage: vr.errorMessage,
      };
    });

    ipcMain.handle('poe:auth-status', async () => {
      const auth = getNewAuth();
      const vr = await auth.validate();
      const logs = auth.getAttemptLogs();
      return {
        valid: vr.valid,
        accountName: vr.accountName ?? null,
        lastAttempt: logs[logs.length - 1] ?? null,
        attemptCount: logs.length,
      };
    });

    ipcMain.handle('poe:auth-logs', async () => {
      return getNewAuth().getAttemptLogs();
    });

    ipcMain.handle('poe:auth-clear', async () => {
      await getNewAuth().invalidate();
      return { cleared: true };
    });

    ipcMain.handle('poe:auth-set-poesessid', async (_e, poesessid: string) => {
      await setNewAuthPoesessid(poesessid);
      return { ok: true };
    });
  }

  // ── Session management ─────────────────────────────────────────
  // OLD: delegated to account service (legacy, kept when feature flag off)
  if (!isNewAuthEnabled()) {
    ipcMain.handle('poe:set-session', async (_e, poesessid: string) => {
      const { valid, accountName } = await account.validateSession(poesessid);
      if (valid) {
        await account.writeSession({ poesessid, accountName: accountName ?? null, validatedAt: Date.now() });
        return { valid: true, accountName };
      }
      return { valid: false };
    });

    ipcMain.handle('poe:get-session', () => account.getSession());
    ipcMain.handle('poe:clear-session', () => account.clearSession());
  } else {
    // NEW AUTH: session handlers use unified authenticator
    ipcMain.handle('poe:set-session', async (_e, poesessid: string) => {
      await setNewAuthPoesessid(poesessid);
      const vr = await getNewAuth().validate();
      return { valid: vr.valid, accountName: vr.accountName ?? null };
    });

    ipcMain.handle('poe:get-session', async () => {
      const vr = await getNewAuth().validate();
      const hasPoesessid = !!getPoesessidAuth()?.getPoesessid();
      return {
        configured: vr.valid || hasPoesessid,
        valid: vr.valid,
        accountName: vr.accountName ?? null,
      };
    });

    ipcMain.handle('poe:clear-session', async () => {
      await getNewAuth().invalidate();
      return { cleared: true };
    });
  }

  // ── Trade / data ────────────────────────────────────────────────
  ipcMain.handle('poe:get-leagues', () => trade.getLeagues());
  ipcMain.handle('poe:fetch-exchange-rate', (_e, league: string, have: string, want: string) =>
    trade.fetchExchangeRate(league, have, want),
  );
  ipcMain.handle('poe:search-items', (_e, league: string, query: Record<string, unknown>) =>
    trade.searchItems(league, query),
  );
  ipcMain.handle('poe:fetch-exchange-history', () => trade.fetchExchangeHistory());

  // ── Characters / stash ──────────────────────────────────────────
  if (!isNewAuthEnabled()) {
    ipcMain.handle('poe:fetch-characters', () => account.fetchCharacters());
    ipcMain.handle('poe:fetch-stash-items', (_e, league: string, tabIndex: number) =>
      account.fetchStashItems(league, tabIndex),
    );
  } else {
    ipcMain.handle('poe:fetch-characters', async () => {
      const auth = getNewAuth();
      const valid = await auth.validate();
      if (!valid.valid) throw new Error('Session expired or not configured');

      // TODO: integrate trade service with new auth — for now, fall back to account service
      const ses = await account.getSessionId();
      if (!ses) throw new Error('Cannot read POESESSID from legacy storage');
      return account.fetchCharacters();
    });

    ipcMain.handle('poe:fetch-stash-items', async (_e, league: string, tabIndex: number) => {
      const auth = getNewAuth();
      const valid = await auth.validate();
      if (!valid.valid) throw new Error('Session expired or not configured');

      const ses = await account.getSessionId();
      if (!ses) throw new Error('Cannot read POESESSID from legacy storage');
      return account.fetchStashItems(league, tabIndex);
    });
  }

  // ── PoB import ──────────────────────────────────────────────────
  ipcMain.handle('poe:import-url', async (_e, url: string) => {
    const result = await importService.importFromUrl(url);
    return {
      dto: result.dto,
      modifierCount: result.modifiers.length,
      buildSummary: {
        name: result.dto.build.className,
        ascendancy: result.dto.build.ascendClassName,
        level: result.dto.build.level,
      },
    };
  });

  ipcMain.handle('poe:import-xml', async (_e, rawXml: string) => {
    const result = await importService.importFromXml(rawXml);
    return {
      dto: result.dto,
      modifierCount: result.modifiers.length,
      buildSummary: {
        name: result.dto.build.className,
        ascendancy: result.dto.build.ascendClassName,
        level: result.dto.build.level,
      },
    };
  });

  // ── Build analysis ──────────────────────────────────────────────
  ipcMain.handle('poe:analyze', async (_e, urlOrXml: string, isUrl?: boolean) => {
    const importResult = isUrl
      ? await importService.importFromUrl(urlOrXml)
      : await importService.importFromXml(urlOrXml);

    const analysisResult = await analysis.analyze({
      build: importResult.build,
      modifiers: importResult.modifiers,
    });

    return {
      import: {
        buildSummary: {
          name: importResult.dto.build.className,
          ascendancy: importResult.dto.build.ascendClassName,
          level: importResult.dto.build.level,
        },
        modifierCount: importResult.modifiers.length,
      },
      analysis: {
        offense: analysisResult.legacy.facts.offense,
        defense: analysisResult.legacy.facts.defense,
        scaling: analysisResult.legacy.facts.scaling,
        problems: analysisResult.legacy.insights.problems.map((p) => ({
          severity: p.severity,
          message: p.message,
          category: p.category,
        })),
        recommendations: analysisResult.legacy.insights.recommendations.map((r) => ({
          itemSlot: r.itemSlot,
          upgradePriority: r.upgradePriority,
          targetStats: r.targetStats,
          estimatedBudgetLow: r.estimatedBudgetLow,
          estimatedBudgetHigh: r.estimatedBudgetHigh,
          improvementPercent: r.improvementPercent,
        })),
        scores: analysisResult.legacy.scores,
        metadata: analysisResult.legacy.metadata,
      },
      explanation: analysisResult.explanation
        ? { summary: analysisResult.explanation.summary }
        : null,
    };
  });

  // ── Backend persistence ─────────────────────────────────────────
  ipcMain.handle('poe:save-build', async (_e, data) => backend.saveBuild(data));
  ipcMain.handle('poe:list-builds', async () => backend.listBuilds());
  ipcMain.handle('poe:delete-build', async (_e, buildHash: string) => backend.deleteBuild(buildHash));
  ipcMain.handle('poe:compare-builds', async (_e, hashA: string, hashB: string) =>
    backend.compareBuilds(hashA, hashB),
  );

  // ── PoE OAuth ───────────────────────────────────────────────────
  ipcMain.handle('poe:get-accounts', async () => backend.getAccounts());
  ipcMain.handle('poe:disconnect-account', async (_e, id: number) => backend.disconnectAccount(id));

  ipcMain.handle('poe:get-auth-url', async () => {
    const result = await backend.getAuthUrl() as unknown as Record<string, unknown>;
    if (!result || result.mode === 'session') {
      throw Object.assign(
        new Error('Server is in session mode — use PoE session login'),
        { code: 'session_mode' },
      );
    }
    const authUrl = result.authUrl as string | undefined;
    const state = result.state as string | undefined;
    if (!authUrl || !state) throw new Error('Failed to get OAuth URL');
    shell.openExternal(authUrl);
    return { authUrl, state };
  });

  ipcMain.handle('poe:complete-oauth', async (_e, code: string, state: string) =>
    backend.completeOAuth(code, state),
  );

  ipcMain.handle('poe:get-oauth-status', async () => backend.getOAuthStatus());
  ipcMain.handle('poe:fetch-oauth-characters', async () => {
    const poesessid = getPoesessidAuth()?.getPoesessid();
    const accountName = poesessid ? await getPoesessidAuth()!.getAccountName() : null;
    if (!poesessid || !accountName) return { characters: [] };
    const chars = await gggProvider.getCharacters(poesessid, accountName);
    return { characters: chars };
  });
  ipcMain.handle('poe:fetch-character-detail', async (_e, name: string) =>
    backend.getCharacterDetail(name),
  );

  // ── Session connect (backend) ───────────────────────────────────
  // OLD: validates via electron-ggg-provider's BrowserWindow
  if (!isNewAuthEnabled()) {
    ipcMain.handle('poe:connect-session', async (_e, poeSessionId: string) => {
      const accountName = await gggProvider.getAccountName(poeSessionId);
      return backend.connectSession(poeSessionId, accountName);
    });
  } else {
    // NEW AUTH: validates via fallback chain (session → poesessid → browserwindow)
    ipcMain.handle('poe:connect-session', async (_e, poeSessionId: string) => {
      await setNewAuthPoesessid(poeSessionId);
      const vr = await getNewAuth().validate();
      if (!vr.valid) {
        throw Object.assign(
          new Error(vr.errorMessage ?? 'PoE session expired — reconnect your Path of Exile account'),
          { code: vr.errorCategory ?? 'session_expired' },
        );
      }
      return backend.connectSession(poeSessionId, vr.accountName ?? undefined);
    });
  }

  // ── Analyze character ───────────────────────────────────────────
  ipcMain.handle('poe:analyze-character', async (_e, characterName: string) => {
    const poesessid = getPoesessidAuth()?.getPoesessid();
    const accountName = poesessid ? await getPoesessidAuth()!.getAccountName() : null;

    const [detail, passiveTreeSnapshot] = await Promise.all([
      poesessid && accountName
        ? gggProvider.getCharacterDetail(poesessid, characterName, accountName).catch((err: Error) => {
            console.warn('[poe:analyze] character detail fetch failed:', err.message);
            return null;
          })
        : Promise.resolve(null),
      poesessid && accountName
        ? fetchPassiveSkills(accountName, characterName, poesessid).catch((err: Error) => {
            console.warn('[poe:analyze] passive tree fetch failed:', err.message);
            return null;
          })
        : Promise.resolve(null),
    ]);

    if (!detail) {
      return {
        import: {
          buildSummary: { name: characterName, ascendancy: null, level: 0 },
          modifierCount: 0,
        },
        analysis: {
          offense: {
            mainSkill: { name: '—', hitRate: 0, averageHit: 0, penetration: 0 },
            totalDps: 0, bossDps: 0, uberDps: 0,
            damageBreakdown: { physical: 0, fire: 0, cold: 0, lightning: 0, chaos: 0 },
            penetration: 0, resistanceReduction: 0,
            critChance: 0, critMultiplier: 0, attackSpeed: 0,
            isDotBuild: false, dotDps: 0, witherStacks: 0, shockEffect: 0,
          },
          defense: {
            life: 0, energyShield: 0, combinedPool: 0,
            resistances: {
              fire: { uncapped: 0, capped: 0, overcap: 0 },
              cold: { uncapped: 0, capped: 0, overcap: 0 },
              lightning: { uncapped: 0, capped: 0, overcap: 0 },
              chaos: { uncapped: 0, capped: 0, overcap: 0 },
            },
            maxResistances: { fire: 0, cold: 0, lightning: 0 },
            armour: 0, physicalReduction: 0, evasion: 0, evadeChance: 0,
            block: { attack: 0, spell: 0 },
            spellSuppression: 0,
            ehp: { physicalMaxHit: 0, elementalMaxHit: 0, chaosMaxHit: 0 },
            ailmentImmunity: {},
          },
          scaling: {
            primaryScalar: '—', secondaryScalars: [],
            diminishingReturns: [], gemLevelImpact: 0, criticalScalingEfficiency: 0,
          },
          problems: [], recommendations: [],
          scores: { overall: 0, offense: 0, defense: 0, sustain: 0, mapping: 0, bossing: 0, leagueStart: 0, scaling: 0 },
          metadata: { analyzerVersion: '', calculationVersion: '', patchVersion: '', analyzedAt: 0, buildHash: '' },
        },
        explanation: null,
        passiveTree: passiveTreeSnapshot,
      };
    }

    const gggDetail = detail as unknown as GggCharacterDetail;
    const { build, modifiers, passiveTree } = convertCharacterToBuild(gggDetail);

    if (passiveTreeSnapshot) {
      build.passiveTree = passiveTreeSnapshot;
    }

    const analysisResult = await analysis.analyze({ build, modifiers });

    return {
      import: {
        buildSummary: {
          name: gggDetail.character.name ?? characterName,
          ascendancy: build.character.ascendancy,
          level: build.character.level,
        },
        modifierCount: modifiers.length,
      },
      analysis: {
        offense: analysisResult.legacy.facts.offense,
        defense: analysisResult.legacy.facts.defense,
        scaling: analysisResult.legacy.facts.scaling,
        problems: analysisResult.legacy.insights.problems.map((p) => ({
          severity: p.severity, message: p.message, category: p.category,
        })),
        recommendations: analysisResult.legacy.insights.recommendations.map((r) => ({
          itemSlot: r.itemSlot, upgradePriority: r.upgradePriority,
          targetStats: r.targetStats, estimatedBudgetLow: r.estimatedBudgetLow,
          estimatedBudgetHigh: r.estimatedBudgetHigh, improvementPercent: r.improvementPercent,
        })),
        scores: analysisResult.legacy.scores,
        metadata: analysisResult.legacy.metadata,
      },
      explanation: analysisResult.explanation
        ? { summary: analysisResult.explanation.summary }
        : null,
      passiveTree,
    };
  });

  // ── Character API ───────────────────────────────────────────────
  ipcMain.handle('poe:list-characters', async () => backend.listCharacters());
  ipcMain.handle('poe:sync-characters', async () => backend.syncCharacters());
  ipcMain.handle('poe:get-character', async (_e, id: number) => backend.getCharacter(id));
  ipcMain.handle('poe:refresh-character', async (_e, id: number) => backend.refreshCharacter(id));
}
