import { ipcMain, shell } from 'electron';
import { createPoeAccountService } from '../services/poe/poe-account.service.js';
import { createPoeTradeService } from '../services/poe/poe-trade.service.js';
import { createPoeImportService } from '../services/poe/poe-import.service.js';
import { createPoeAnalysisService } from '../services/poe/poe-analysis.service.js';
import { convertCharacterToBuild } from '../services/poe/poe-character.service.js';
import { createModDB } from '@helper/poe-engine';
import type { ModDB } from '@helper/poe-engine';
import * as backend from '../services/poe/backend-client.js';

let _poeInitialized = false;
let _modDb: ModDB | null = null;

function getModDb(): ModDB {
  if (!_modDb) _modDb = createModDB();
  return _modDb;
}

export function registerPoeIpc(): void {
  if (_poeInitialized) return;
  _poeInitialized = true;

  const account = createPoeAccountService();
  const trade = createPoeTradeService();
  const importService = createPoeImportService();
  const analysis = createPoeAnalysisService(getModDb());

  // ── Session management (delegated to account service) ──
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

  // ── Trade / data (delegated to trade service) ──
  ipcMain.handle('poe:get-leagues', () => trade.getLeagues());
  ipcMain.handle('poe:fetch-exchange-rate', (_e, league: string, have: string, want: string) =>
    trade.fetchExchangeRate(league, have, want),
  );
  ipcMain.handle('poe:search-items', (_e, league: string, query: Record<string, unknown>) =>
    trade.searchItems(league, query),
  );
  ipcMain.handle('poe:fetch-exchange-history', () => trade.fetchExchangeHistory());

  // ── Characters / stash (delegated to account service) ──
  ipcMain.handle('poe:fetch-characters', () => account.fetchCharacters());
  ipcMain.handle('poe:fetch-stash-items', (_e, league: string, tabIndex: number) =>
    account.fetchStashItems(league, tabIndex),
  );

  // ── NEW: PoB import ──
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

  // ── NEW: Build analysis ──
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
        ? {
            summary: analysisResult.explanation.summary,
          }
        : null,
    };
  });

  // ── Phase 10: Backend persistence ──
  ipcMain.handle('poe:save-build', async (_e, data) => {
    return backend.saveBuild(data);
  });

  ipcMain.handle('poe:list-builds', async () => {
    return backend.listBuilds();
  });

  ipcMain.handle('poe:delete-build', async (_e, buildHash: string) => {
    return backend.deleteBuild(buildHash);
  });

  ipcMain.handle('poe:compare-builds', async (_e, hashA: string, hashB: string) => {
    return backend.compareBuilds(hashA, hashB);
  });

  // ── Phase 10: PoE OAuth ──
  ipcMain.handle('poe:get-accounts', async () => {
    return backend.getAccounts();
  });

  ipcMain.handle('poe:disconnect-account', async (_e, id: number) => {
    return backend.disconnectAccount(id);
  });

  ipcMain.handle('poe:get-auth-url', async () => {
    const { authUrl, state } = await backend.getAuthUrl();
    shell.openExternal(authUrl);
    return { authUrl, state };
  });

  ipcMain.handle('poe:complete-oauth', async (_e, code: string, state: string) => {
    return backend.completeOAuth(code, state);
  });

  ipcMain.handle('poe:get-oauth-status', async () => {
    return backend.getOAuthStatus();
  });

  ipcMain.handle('poe:fetch-oauth-characters', async () => {
    return backend.fetchOAuthCharacters();
  });

  ipcMain.handle('poe:fetch-character-detail', async (_e, name: string) => {
    return backend.getCharacterDetail(name);
  });

  ipcMain.handle('poe:connect-session', async (_e, poeSessionId: string) => {
    return backend.connectSession(poeSessionId);
  });

  ipcMain.handle('poe:analyze-character', async (_e, characterName: string) => {
    const detail = await backend.getCharacterDetail(characterName);
    const { build, modifiers, passiveTree } = convertCharacterToBuild(detail as any);

    const analysisResult = await analysis.analyze({
      build,
      modifiers,
    });

    return {
      import: {
        buildSummary: {
          name: (detail as any).character?.name ?? characterName,
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
      passiveTree,
    };
  });
}
