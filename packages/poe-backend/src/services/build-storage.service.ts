import { createHash } from 'node:crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as buildRepo from '../repositories/build.repo.js';
import * as analysisRepo from '../repositories/analysis.repo.js';
import * as modifierRepo from '../repositories/modifier.repo.js';
import type { SaveBuildInput, SaveAnalysisInput, BuildListItem, BuildDetail, ModifierRecord } from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NodePgDatabase<Record<string, any>>;

export interface BuildStorageDeps {
  db: Db;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildsTable: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysesTable: any;
}

export function createBuildStorage(deps: BuildStorageDeps) {
  const { db, buildsTable, analysesTable } = deps;

  function hashBuild(input: SaveBuildInput): string {
    return createHash('sha256').update(input.rawPobXml).digest('hex').slice(0, 16);
  }

  return {
    async saveBuild(input: SaveBuildInput, userId: number) {
      const buildHash = hashBuild(input);
      const existing = await buildRepo.findByHash(db, buildsTable, buildHash);
      if ((existing as unknown[]).length > 0) return (existing as unknown as Array<{ id: number; buildHash: string }>)[0]!;

      const result = await buildRepo.insertBuild(db, buildsTable, {
        userId,
        buildHash,
        game: input.game,
        name: input.buildName,
        source: input.source,
        characterClass: input.characterClass,
        ascendancy: input.ascendancy,
        level: input.level,
        pobUrl: input.pobUrl,
        rawPobXml: input.rawPobXml,
        createdAt: new Date().toISOString(),
      });
      return (result as unknown as Array<{ id: number; buildHash: string }>)[0]!;
    },

    async saveAnalysis(buildHash: string, input: SaveAnalysisInput) {
      const resultJson = JSON.stringify(input.result);
      const scores = input.result.scores;

      await analysisRepo.insertAnalysis(db, analysesTable, {
        buildHash,
        game: 'poe1',
        league: input.league,
        patchVersion: input.patchVersion,
        analyzerVersion: input.result.metadata.analyzerVersion,
        analysisContextJson: null,
        resultJson,
        overallScore: scores.overall,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const builds = await buildRepo.findByHash(db, buildsTable, buildHash);
      if ((builds as unknown[]).length > 0) {
        const buildId = ((builds as unknown as Array<{ id: number }>)[0]!).id;
        const modifiers = input.modifiers.map((m) => ({
          buildId,
          statId: m.statId,
          source: m.source,
          type: m.type,
          value: m.value,
        }));
        await modifierRepo.insertModifiers(db, modifiers);
      }
    },

    async listBuilds(userId: number): Promise<BuildListItem[]> {
      const builds = await buildRepo.listByUser(db, buildsTable, userId, 50) as unknown as Array<{ id: number; buildHash: string; name: string | null; characterClass: string | null; ascendancy: string | null; level: number | null; pobUrl: string | null; game: string; createdAt: string }>;
      const result: BuildListItem[] = [];

      for (const bAny of builds) {
        const latest = await analysisRepo.findLatestByHash(db, analysesTable, bAny.buildHash) as unknown as Array<{ overallScore: number; createdAt: string }>;
        const analysis = latest[0];

        result.push({
          id: bAny.id,
          buildHash: bAny.buildHash,
          name: bAny.name,
          characterClass: bAny.characterClass,
          ascendancy: bAny.ascendancy,
          level: bAny.level,
          pobUrl: bAny.pobUrl,
          game: bAny.game,
          overallScore: analysis?.overallScore ?? null,
          lastAnalyzedAt: analysis?.createdAt ?? null,
          createdAt: bAny.createdAt,
        });
      }
      return result;
    },

    async getBuild(buildHash: string): Promise<BuildDetail | null> {
      const builds = await buildRepo.findByHash(db, buildsTable, buildHash) as unknown as Array<{ id: number; buildHash: string; name: string | null; characterClass: string | null; ascendancy: string | null; level: number | null; pobUrl: string | null; game: string; source: string; rawPobXml: string | null; createdAt: string }>;
      if (builds.length === 0) return null;
      const b = builds[0]!

      const analyses = await analysisRepo.findByBuildHash(db, analysesTable, buildHash) as unknown as Array<{ id: number; league: string | null; patchVersion: string | null; analyzerVersion: string | null; overallScore: number; createdAt: string }>;
      const bRow = b;

      return {
        ...bRow,
        overallScore: null,
        lastAnalyzedAt: null,
        analyses: analyses.map((a) => ({
          id: a.id,
          league: a.league,
          patchVersion: a.patchVersion,
          analyzerVersion: a.analyzerVersion,
          overallScore: a.overallScore,
          createdAt: a.createdAt,
        })),
      };
    },

    async deleteBuild(buildHash: string) {
      const builds = await buildRepo.findByHash(db, buildsTable, buildHash) as unknown as Array<{ id: number }>;
      if (builds.length > 0) {
        await modifierRepo.deleteModifiersForBuild(db, builds[0]!.id);
      }
      await analysisRepo.removeForBuild(db, analysesTable, buildHash);
      await buildRepo.removeBuild(db, buildsTable, buildHash);
    },
  };
}

export type BuildStorage = ReturnType<typeof createBuildStorage>;
