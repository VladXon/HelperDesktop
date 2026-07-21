import { Router } from 'express';
import { getDb, schema } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { createBuildStorage, createCacheService } from '@helper/poe-backend';
import { eq, desc } from 'drizzle-orm';
import { compareBuilds } from '@helper/poe-backend/services';
import { HttpError } from '../middleware/error-handler.js';
import { log } from '../utils/logger.js';

export function createPoeBuildsRouter(): Router {
  const router = Router();
  const db = getDb();

  const buildStorage = createBuildStorage({
    db,
    buildsTable: schema.poeBuilds,
    analysesTable: schema.poeBuildAnalyses,
  });

  const cache = createCacheService({
    db,
    analysesTable: schema.poeBuildAnalyses,
  });

  router.use(requireAuth);

  router.post('/', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) throw new HttpError(401, 'unauthorized', 'Authentication required');

      const { pobUrl, rawPobXml, buildName, characterClass, ascendancy, level, game, source, analysis } = req.body;
      const build = await buildStorage.saveBuild({
        pobUrl, rawPobXml, buildName, characterClass, ascendancy: ascendancy ?? null, level, game: game ?? 'poe1', source: source ?? 'pob',
      }, user.id);

      if (analysis) {
        await buildStorage.saveAnalysis(build.buildHash, analysis);
      }

      log.info('poe_build_saved', { userId: user.id, buildHash: build.buildHash });
      res.status(201).json(build);
    } catch (err) { next(err); }
  });

  router.get('/', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) throw new HttpError(401, 'unauthorized', 'Authentication required');
      const builds = await buildStorage.listBuilds(user.id);
      res.json(builds);
    } catch (err) { next(err); }
  });

  router.get('/:hash', async (req, res, next) => {
    try {
      const build = await buildStorage.getBuild(req.params.hash!);
      if (!build) throw new HttpError(404, 'not_found', 'Build not found');
      res.json(build);
    } catch (err) { next(err); }
  });

  router.delete('/:hash', async (req, res, next) => {
    try {
      await buildStorage.deleteBuild(req.params.hash!);
      res.status(204).end();
    } catch (err) { next(err); }
  });

  router.post('/compare', async (req, res, next) => {
    try {
      const { hashA, hashB } = req.body;
      const [buildA, buildB] = await Promise.all([buildStorage.getBuild(hashA), buildStorage.getBuild(hashB)]);
      if (!buildA || !buildB) throw new HttpError(404, 'not_found', 'One or both builds not found');

      const latestA = buildA.analyses[0];
      const latestB = buildB.analyses[0];
      if (!latestA || !latestB) throw new HttpError(400, 'no_analysis', 'Both builds must have analyses');

      const rowsA = await db.select().from(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.id, latestA.id)).limit(1);
      const rowsB = await db.select().from(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.id, latestB.id)).limit(1);

      const resultA = JSON.parse(rowsA[0]?.resultJson ?? '{}');
      const resultB = JSON.parse(rowsB[0]?.resultJson ?? '{}');

      const comparison = compareBuilds(
        {
          hash: hashA, name: buildA.name, class: buildA.characterClass,
          overallScore: latestA.overallScore,
          offenseScore: resultA.scores?.offense ?? 0,
          defenseScore: resultA.scores?.defense ?? 0,
          life: resultA.facts?.defense?.life ?? 0,
          es: resultA.facts?.defense?.energyShield ?? 0,
          totalDps: resultA.facts?.offense?.totalDps ?? 0,
        },
        {
          hash: hashB, name: buildB.name, class: buildB.characterClass,
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

  return router;
}
