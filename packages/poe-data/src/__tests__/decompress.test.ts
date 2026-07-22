import { describe, it, expect } from 'vitest';
import { deflateSync } from 'node:zlib';
import { decodePobCompressedData } from '../pob/utils/decompress.js';

describe('decodePobCompressedData', () => {
  const testXml = '<PathOfBuilding><Build className="Juggernaut" level="90" /></PathOfBuilding>';

  it('decodes zlib-compressed base64url data (pobb.in format)', () => {
    const compressed = deflateSync(Buffer.from(testXml, 'utf-8'));
    const base64url = compressed
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = decodePobCompressedData(base64url, { format: 'zlib' });
    expect(result).toBe(testXml);
  });

  it('decodes raw deflate base64 data (pastebin format)', () => {
    const { deflateRawSync } = require('node:zlib');
    const compressed = deflateRawSync(Buffer.from(testXml, 'utf-8'));
    const base64 = compressed.toString('base64');

    const result = decodePobCompressedData(base64, { format: 'raw' });
    expect(result).toBe(testXml);
  });

  it('auto-detects zlib format (pobb.in)', () => {
    const compressed = deflateSync(Buffer.from(testXml, 'utf-8'));
    const base64url = compressed
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = decodePobCompressedData(base64url);
    expect(result).toBe(testXml);
  });

  it('auto-detects raw deflate format (pastebin)', () => {
    const { deflateRawSync } = require('node:zlib');
    const compressed = deflateRawSync(Buffer.from(testXml, 'utf-8'));
    const base64 = compressed.toString('base64');

    const result = decodePobCompressedData(base64);
    expect(result).toBe(testXml);
  });

  it('handles padding in base64url', () => {
    const compressed = deflateSync(Buffer.from('test', 'utf-8'));
    const base64url = compressed
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = decodePobCompressedData(base64url, { format: 'zlib' });
    expect(result).toBe('test');
  });

  it('throws on invalid data', () => {
    expect(() => decodePobCompressedData('not-valid-data')).toThrow();
  });
});
