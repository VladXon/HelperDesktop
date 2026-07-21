import type { PoeLeagueRecord } from '@helper/shared';
import type { AdapterResult } from '@helper/shared';

export interface LeagueLoaderResult {
  leagues: PoeLeagueRecord[];
  source: string;
  fetchedAt: number;
}

const DEFAULT_LEAGUES: PoeLeagueRecord[] = [
  {
    game: 'poe1',
    leagueId: 'Standard',
    leagueName: 'Standard',
    isCurrent: true,
    isHardcore: false,
    isSsf: false,
    startDate: 0,
    endDate: null,
    version: '3.25',
  },
  {
    game: 'poe1',
    leagueId: 'Hardcore',
    leagueName: 'Hardcore',
    isCurrent: false,
    isHardcore: true,
    isSsf: false,
    startDate: 0,
    endDate: null,
    version: '3.25',
  },
];

export async function loadLeagues(): Promise<AdapterResult<LeagueLoaderResult>> {
  return {
    ok: true,
    data: { leagues: DEFAULT_LEAGUES, source: 'builtin', fetchedAt: Date.now() },
    meta: { source: 'builtin', fetchedAt: Date.now(), cached: false },
  };
}
