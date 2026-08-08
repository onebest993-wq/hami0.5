/**
 * Phase-4 security guards — CSP/header SoT sync + CSRF client cookie policy + artifacts.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getProductionSecurityHeaders } from '@/app/api/security/wifeSecurityHeaders';
import { applyCsrfTokenToDocument, CSRF_COOKIE_NAME } from '@/app/security/csrfSession';
import {
  buildCsrfClearCookie,
  buildCsrfSetCookie,
  CSRF_COOKIE_NAME as SERVER_CSRF_COOKIE_NAME,
} from '@/app/api/security/csrfCookie';

const root = process.cwd();

function parseNetlifyHeadersBlock(fileText: string): Record<string, string> {
  const lines = fileText.split(/\r?\n/);
  const out: Record<string, string> = {};
  let inStar = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line || line.startsWith('#')) continue;
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      inStar = line.trim() === '/*';
      continue;
    }
    if (!inStar) continue;
    const trimmed = line.trim();
    const idx = trimmed.indexOf(':');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

describe('phase-4 security header source-of-truth sync', () => {
  it('production headers match vercel.json and public/_headers', () => {
    const expected = getProductionSecurityHeaders();

    const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
      headers: Array<{ headers: Array<{ key: string; value: string }> }>;
    };
    const vercelMap = Object.fromEntries(
      vercel.headers[0].headers.map((h) => [h.key, h.value] as const),
    );

    const headersMap = parseNetlifyHeadersBlock(
      fs.readFileSync(path.join(root, 'public/_headers'), 'utf8'),
    );

    for (const [key, value] of Object.entries(expected)) {
      expect(vercelMap[key], `vercel missing/mismatch: ${key}`).toBe(value);
      expect(headersMap[key], `_headers missing/mismatch: ${key}`).toBe(value);
    }
  });
});

describe('phase-4 CSRF cookie builders', () => {
  it('server cookie builders share cookie name with client constant', () => {
    expect(SERVER_CSRF_COOKIE_NAME).toBe(CSRF_COOKIE_NAME);
    expect(buildCsrfSetCookie('Abcdefghijklmnop1234', true)).toContain('HttpOnly');
    expect(buildCsrfSetCookie('Abcdefghijklmnop1234', true)).toContain('Secure');
    expect(buildCsrfClearCookie(false)).toContain('Max-Age=0');
    expect(buildCsrfClearCookie(false)).not.toContain('Secure');
  });
});

describe('phase-4 CSRF client cookie policy', () => {
  it('applyCsrfTokenToDocument does not write a readable document.cookie', () => {
    document.head.innerHTML = '';
    document.cookie = '';
    applyCsrfTokenToDocument('ServerIssuedCsrfTokenValue123456');
    expect(document.cookie.includes(CSRF_COOKIE_NAME)).toBe(false);
    const meta = document.querySelector('meta[name="x-csrf-token"]');
    expect(meta?.getAttribute('content')).toBe('ServerIssuedCsrfTokenValue123456');
  });
});
