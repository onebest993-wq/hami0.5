/**
 * Phase-4 security guards — CSP SoT sync + CSRF client cookie policy + artifacts.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildContentSecurityPolicy } from '@/app/api/security/contentSecurityPolicy';
import { applyCsrfTokenToDocument, CSRF_COOKIE_NAME } from '@/app/security/csrfSession';

const root = process.cwd();

describe('phase-4 CSP source-of-truth sync', () => {
    it('production CSP matches vercel.json and public/_headers', () => {
        const expected = buildContentSecurityPolicy('production');

        const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
            headers: Array<{ headers: Array<{ key: string; value: string }> }>;
        };
        const vercelCsp = vercel.headers
            .flatMap((h) => h.headers)
            .find((h) => h.key === 'Content-Security-Policy')?.value;
        expect(vercelCsp).toBe(expected);

        const headersFile = fs.readFileSync(path.join(root, 'public/_headers'), 'utf8');
        const headersLine = headersFile
            .split(/\r?\n/)
            .map((l) => l.trim())
            .find((l) => l.startsWith('Content-Security-Policy:'));
        expect(headersLine).toBeTruthy();
        const headersCsp = headersLine!.replace(/^Content-Security-Policy:\s*/, '').trim();
        expect(headersCsp).toBe(expected);
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

describe('phase-4 progress artifact', () => {
    it('exists', () => {
        const p = path.join(root, '.cursor/phase-4-progress.json');
        expect(fs.existsSync(p)).toBe(true);
    });
});
