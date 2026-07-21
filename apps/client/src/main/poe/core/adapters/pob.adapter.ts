import { parsePobPastebin, isPobPastebinUrl } from '../parsers/pob-xml.parser.js';
import type { PoBXmlDTO } from '../dto/pob-xml.dto.js';
import type { AdapterResult } from '@helper/shared';

export interface PoBImportOptions {
  timeout?: number;
}

const PASTEBIN_RAW_PREFIX = 'https://pastebin.com/raw/';

async function fetchPastebinContent(
  pastebinUrl: string,
  timeout: number,
): Promise<string> {
  const id = pastebinUrl.split('/').pop();
  const rawUrl = `${PASTEBIN_RAW_PREFIX}${id}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(rawUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from pastebin');
    }
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

export async function importFromPobUrl(
  url: string,
  options?: PoBImportOptions,
): Promise<AdapterResult<PoBXmlDTO>> {
  const timeout = options?.timeout ?? 15000;

  if (!isPobPastebinUrl(url)) {
    return {
      ok: false,
      error: `Not a valid PoB pastebin URL: ${url}`,
    };
  }

  try {
    const base64Content = await fetchPastebinContent(url, timeout);
    const dto = parsePobPastebin(base64Content);

    return {
      ok: true,
      data: dto,
      meta: {
        source: url,
        fetchedAt: Date.now(),
        cached: false,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: `Failed to import PoB build: ${message}` };
  }
}

export async function importFromPobXml(
  rawXml: string,
): Promise<AdapterResult<PoBXmlDTO>> {
  try {
    const { parsePobXml } = await import('../parsers/pob-xml.parser');
    const dto = parsePobXml(rawXml);

    return {
      ok: true,
      data: dto,
      meta: {
        source: 'raw-xml',
        fetchedAt: Date.now(),
        cached: false,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: `Failed to parse PoB XML: ${message}` };
  }
}
