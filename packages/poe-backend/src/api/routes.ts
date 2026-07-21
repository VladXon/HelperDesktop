import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { BuildStorage } from '../services/build-storage.service.js';
import type { CacheService } from '../services/cache.service.js';
import { compareBuilds } from '../services/compare.service.js';
import * as accountRepo from '../repositories/account.repo.js';
import { encryptToken, decryptToken } from '../crypto/token-encryption.service.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NodePgDatabase<Record<string, any>>;

export interface PoeRoutesDeps {
  db: Db;
  buildStorage: BuildStorage;
  cache: CacheService;
  requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

export function createPoeRoutes(deps: PoeRoutesDeps): Router {
  const router = Router();
  const { buildStorage, cache, requireAuth } = deps;

  router.use(requireAuth);

  // ── Builds ──

  router.post('/builds', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) return res.status(401).json({ error: 'unauthorized' });

      const { pobUrl, rawPobXml, buildName, characterClass, ascendancy, level, game, source } = req.body;
      const build = await buildStorage.saveBuild({
        pobUrl, rawPobXml, buildName, characterClass, ascendancy: ascendancy ?? null, level, game: game ?? 'poe1', source: source ?? 'pob',
      }, user.id);

      if (req.body.analysis) {
        await buildStorage.saveAnalysis(build.buildHash, req.body.analysis);
      }

      res.status(201).json(build);
    } catch (err) { next(err); }
  });

  router.get('/builds', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      const builds = await buildStorage.listBuilds(user.id);
      res.json(builds);
    } catch (err) { next(err); }
  });

  router.get('/builds/:hash', async (req, res, next) => {
    try {
      const build = await buildStorage.getBuild(req.params.hash!);
      if (!build) return res.status(404).json({ error: 'not_found' });
      res.json(build);
    } catch (err) { next(err); }
  });

  router.delete('/builds/:hash', async (req, res, next) => {
    try {
      await buildStorage.deleteBuild(req.params.hash!);
      res.status(204).end();
    } catch (err) { next(err); }
  });

  router.post('/builds/compare', async (req, res, next) => {
    try {
      const { hashA, hashB } = req.body as { hashA: string; hashB: string };
      const [buildA, buildB] = await Promise.all([buildStorage.getBuild(hashA), buildStorage.getBuild(hashB)]);
      if (!buildA || !buildB) return res.status(404).json({ error: 'not_found' });

      const latestA = buildA.analyses[0];
      const latestB = buildB.analyses[0];
      if (!latestA || !latestB) return res.status(400).json({ error: 'both builds must have analyses' });

      const resultA = JSON.parse((buildA as { analyses: Array<{ resultJson?: string }> | undefined }).analyses?.[0]?.resultJson ?? '{}');
      const resultB = JSON.parse((buildB as { analyses: Array<{ resultJson?: string }> | undefined }).analyses?.[0]?.resultJson ?? '{}');

      const comparison = compareBuilds(
        {
          hash: hashA,
          name: buildA.name,
          class: buildA.characterClass,
          overallScore: latestA.overallScore,
          offenseScore: resultA.scores?.offense ?? 0,
          defenseScore: resultA.scores?.defense ?? 0,
          life: resultA.facts?.defense?.life ?? 0,
          es: resultA.facts?.defense?.energyShield ?? 0,
          totalDps: resultA.facts?.offense?.totalDps ?? 0,
        },
        {
          hash: hashB,
          name: buildB.name,
          class: buildB.characterClass,
          overallScore: latestB.overallScore,
          offenseScore: resultB.scores?.offense ?? 0,
          defenseScore: resultB.scores?.defense ?? 0,
          life: resultB.facts?.defense?.life ?? 0,
          es: resultB.facts?.defense?.energyShield ?? 0,
          totalDps: resultB.facts?.offense?.totalDps ?? 0,
        },
      );

      res.json(comparison);
    } catch (err) { next(err); }
  });

  // ── Cache ──

  router.get('/cache/:pobUrl', async (req, res, next) => {
    try {
      const cached = await cache.getCachedAnalysis(req.params.pobUrl!);
      if (!cached) return res.status(404).json({ error: 'not_cached' });
      res.json(cached);
    } catch (err) { next(err); }
  });

  // ── PoE Accounts ──

  router.get('/accounts', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      const accounts = await accountRepo.listAccountsByUser(deps.db, user.id);
      res.json(accounts.map((a) => ({
        id: (a as { id: number }).id,
        accountName: (a as { accountName: string }).accountName,
        connected: true,
      })));
    } catch (err) { next(err); }
  });

  router.delete('/accounts/:id', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      const accounts = await accountRepo.listAccountsByUser(deps.db, user.id);
      const account = accounts.find((a) => String((a as { id: number }).id) === req.params.id);
      if (!account) return res.status(404).json({ error: 'not_found' });
      await accountRepo.deleteAccount(deps.db, (account as { poeAccountId: string }).poeAccountId);
      res.status(204).end();
    } catch (err) { next(err); }
  });

  return router;
}
