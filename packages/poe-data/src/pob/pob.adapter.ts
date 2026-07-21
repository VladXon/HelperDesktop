import type { HttpClient } from '../http/http-client.js';
import { parsePobXml, parsePobPastebin, isPobPastebinUrl, isPobbUrl, extractPobbId, isPoBUrl } from './pob-xml.parser.js';
import type { PoBXmlDTO } from './pob-xml.dto.js';
import type { AdapterResult } from '@helper/shared';

export interface PoBImportOptions {
  timeout?: number;
}

const PASTEBIN_RAW_PREFIX = 'https://pastebin.com/raw/';
const POBB_RAW_SUFFIX = '/raw';

async function importFromPastebin(url: string, httpClient: HttpClient, timeout: number): Promise<AdapterResult<PoBXmlDTO>> {
  const id = url.split('/').pop();
  const rawUrl = `${PASTEBIN_RAW_PREFIX}${id}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let base64Content: string;
  try {
    base64Content = await httpClient.get<string>(rawUrl, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!base64Content || base64Content.trim().length === 0) {
    return { ok: false, error: 'Empty response from pastebin' };
  }

  const dto = parsePobPastebin(base64Content.trim());
  return {
    ok: true,
    data: dto,
    meta: { source: url, fetchedAt: Date.now(), cached: false },
  };
}

async function importFromPobb(url: string, httpClient: HttpClient, timeout: number): Promise<AdapterResult<PoBXmlDTO>> {
  const id = extractPobbId(url);
  if (!id) return { ok: false, error: `Could not extract build ID from: ${url}` };

  const rawUrl = `${url.replace(/\/$/, '')}${POBB_RAW_SUFFIX}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let xmlContent: string;
  try {
    xmlContent = await httpClient.get<string>(rawUrl, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!xmlContent || xmlContent.trim().length === 0) {
    return { ok: false, error: 'Empty response from pobb.in' };
  }

  const dto = parsePobXml(xmlContent.trim());
  return {
    ok: true,
    data: dto,
    meta: { source: url, fetchedAt: Date.now(), cached: false },
  };
}

export async function importFromPobUrl(
  url: string,
  httpClient: HttpClient,
  options?: PoBImportOptions,
): Promise<AdapterResult<PoBXmlDTO>> {
  const timeout = options?.timeout ?? 15000;

  if (!isPoBUrl(url)) {
    return {
      ok: false,
      error: `Not a valid PoB URL: ${url}`,
    };
  }

  try {
    if (isPobPastebinUrl(url)) {
      return importFromPastebin(url, httpClient, timeout);
    }
    if (isPobbUrl(url)) {
      return importFromPobb(url, httpClient, timeout);
    }
    return { ok: false, error: `Unsupported PoB URL format: ${url}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: `Failed to import PoB build: ${message}` };
  }
}

export async function importFromPobXml(
  rawXml: string,
): Promise<AdapterResult<PoBXmlDTO>> {
  try {
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
