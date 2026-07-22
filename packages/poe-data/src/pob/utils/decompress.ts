import { inflateSync, inflateRawSync } from 'node:zlib';

export type DecompressFormat = 'auto' | 'zlib' | 'raw';

export interface DecompressOptions {
  format?: DecompressFormat;
  encoding?: BufferEncoding;
}

/**
 * Decode base64url-encoded + zlib-compressed PoB data.
 *
 * Format differences:
 * - pobb.in/{id}/raw → base64url (RFC 4648 §5, with - and _) + zlib (inflateSync)
 * - pastebin (raw PoB export) → base64 standard (with + and /) + raw deflate (inflateRawSync)
 *
 * @param data - base64url or base64-encoded compressed data
 * @param options.format - 'zlib' for pobb.in, 'raw' for pastebin, 'auto' to auto-detect
 * @returns decoded UTF-8 string (PoB XML)
 */
export function decodePobCompressedData(data: string, options?: DecompressOptions): string {
  const format = options?.format ?? 'auto';
  const encoding = options?.encoding ?? 'utf-8';

  const normalized = data.trim();

  if (format === 'zlib') {
    const buf = base64UrlToBuffer(normalized);
    return inflateSync(buf).toString(encoding);
  }

  if (format === 'raw') {
    const buf = Buffer.from(normalized, 'base64');
    return inflateRawSync(buf).toString(encoding);
  }

  // auto-detect: try zlib first (pobb.in), fall back to raw deflate (pastebin)
  try {
    const buf = base64UrlToBuffer(normalized);
    return inflateSync(buf).toString(encoding);
  } catch {
    // zlib failed — try raw deflate (pastebin format)
    const buf = Buffer.from(normalized, 'base64');
    return inflateRawSync(buf).toString(encoding);
  }
}

/**
 * Convert base64url (RFC 4648 §5) to standard base64, then to Buffer.
 * base64url uses - and _ instead of + and /, and omits padding.
 */
function base64UrlToBuffer(data: string): Buffer {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padLen = (4 - (base64.length % 4)) % 4;
  if (padLen > 0) {
    base64 += '='.repeat(padLen);
  }
  return Buffer.from(base64, 'base64');
}
