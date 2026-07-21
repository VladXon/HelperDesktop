import type { PoeLeagueRecord, ExternalLeagueDTO } from '@helper/shared';

export function normalizeLeague(raw: ExternalLeagueDTO): PoeLeagueRecord {
  return {
    game: raw.game ?? 'poe1',
    leagueId: raw.leagueId ?? '',
    leagueName: raw.leagueName ?? '',
    isCurrent: raw.isCurrent ?? false,
    isHardcore: raw.isHardcore ?? false,
    isSsf: raw.isSsf ?? false,
    startDate: raw.startDate ?? 0,
    endDate: raw.endDate ?? null,
    version: '',
  };
}

export function normalizeLeagues(rawLeagues: ExternalLeagueDTO[]): PoeLeagueRecord[] {
  return rawLeagues
    .filter((raw) => (raw.leagueId ?? '').trim().length > 0)
    .map(normalizeLeague);
}
