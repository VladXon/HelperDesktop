import type { HttpClient } from '@helper/poe-data';
import {
  FetchHttpClient,
  importFromPobUrl,
  importFromPobXml,
  convertPobDto,
  parsePobXml,
} from '@helper/poe-data';
import type { PoBXmlDTO } from '@helper/poe-data';
import type { Modifier, ModDB } from '@helper/poe-engine';
import type { Build, AnalysisResult } from '@helper/shared';
import { fromPob, resolveBuildStats } from '@helper/poe-data';

export interface PoBImportResult {
  dto: PoBXmlDTO;
  modifiers: Modifier[];
  build: Build;
}

export interface PoeImportService {
  importFromUrl(url: string): Promise<PoBImportResult>;
  importFromXml(rawXml: string): Promise<PoBImportResult>;
}

export function createPoeImportService(httpClient?: HttpClient): PoeImportService {
  const client = httpClient ?? new FetchHttpClient();

  return {
    async importFromUrl(url: string): Promise<PoBImportResult> {
      const result = await importFromPobUrl(url, client);
      if (!result.ok) throw new Error(result.error);
      const dto = result.data;
      const modifiers = convertPobDto(dto);
      const build = fromPob(dto);
      return { dto, modifiers, build };
    },

    async importFromXml(rawXml: string): Promise<PoBImportResult> {
      const dto = parsePobXml(rawXml);
      const modifiers = convertPobDto(dto);
      const build = fromPob(dto);
      return { dto, modifiers, build };
    },
  };
}
