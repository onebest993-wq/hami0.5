/**
 * تكافؤ ترويسات النشر بين Vercel وNetlify.
 *
 * انحراف الملفّين سبق أن كسر ماسح المستندات في الإنتاج: `saveScannedImageToVault`
 * ينفّذ fetch على عنوان data:، وكان vercel.json يحجب data: في connect-src
 * بينما public/_headers يسمح به — فيمرّ الاختبار محلياً ويفشل على المنصّة وحدها.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const repoRoot = process.cwd();

type HeaderMap = Record<string, string>;

function readVercelGlobalHeaders(): HeaderMap {
    const config = JSON.parse(readFileSync(resolve(repoRoot, 'vercel.json'), 'utf8')) as {
        headers?: { source: string; headers: { key: string; value: string }[] }[];
    };
    const globalBlock = config.headers?.find((entry) => entry.source === '/(.*)');
    if (!globalBlock) throw new Error('vercel.json: missing the global header block');
    return Object.fromEntries(globalBlock.headers.map(({ key, value }) => [key.toLowerCase(), value.trim()]));
}

function readVercelHqGlobalHeaders(): HeaderMap {
    const config = JSON.parse(readFileSync(resolve(repoRoot, 'vercel-hq.json'), 'utf8')) as {
        headers?: { source: string; headers: { key: string; value: string }[] }[];
    };
    const globalBlock = config.headers?.find((entry) => entry.source === '/(.*)');
    if (!globalBlock) throw new Error('vercel-hq.json: missing the global header block');
    return Object.fromEntries(globalBlock.headers.map(({ key, value }) => [key.toLowerCase(), value.trim()]));
}

function readNetlifyGlobalHeaders(): HeaderMap {
    const raw = readFileSync(resolve(repoRoot, 'public/_headers'), 'utf8');
    const result: HeaderMap = {};
    let inGlobalBlock = false;

    for (const line of raw.split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        if (!line.startsWith(' ') && !line.startsWith('\t')) {
            inGlobalBlock = line.trim() === '/*';
            continue;
        }
        if (!inGlobalBlock) continue;
        const separator = line.indexOf(':');
        if (separator === -1) continue;
        result[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
    }

    if (!Object.keys(result).length) throw new Error('public/_headers: missing global "/*" header block');
    return result;
}

function parseCspDirectives(csp: string): Record<string, string[]> {
    return Object.fromEntries(
        csp
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
                const [name, ...sources] = part.split(/\s+/);
                return [name.toLowerCase(), sources];
            }),
    );
}

describe('deploy header parity', () => {
    const vercel = readVercelGlobalHeaders();
    const vercelHq = readVercelHqGlobalHeaders();
    const netlify = readNetlifyGlobalHeaders();

    it('defines the same security headers on both platforms', () => {
        expect(Object.keys(vercel).sort()).toEqual(Object.keys(netlify).sort());
    });

    it('keeps headquarters host headers identical to the lawyer host', () => {
        expect(vercelHq).toEqual(vercel);
    });

    it.each([
        'content-security-policy',
        'permissions-policy',
        'strict-transport-security',
        'x-frame-options',
        'referrer-policy',
        'cross-origin-opener-policy',
        'cross-origin-resource-policy',
        'x-content-type-options',
    ])('gives %s an identical value on both platforms', (header) => {
        expect(vercel[header]).toBeDefined();
        expect(vercel[header]).toBe(netlify[header]);
    });

    describe('CSP covers what the app actually does', () => {
        const directives = parseCspDirectives(vercel['content-security-policy'] ?? '');

        // ماسح المستندات يمرّر لقطة الكاميرا كعنوان data: إلى fetch.
        it('allows data: and blob: in connect-src', () => {
            expect(directives['connect-src']).toEqual(expect.arrayContaining(['data:', 'blob:']));
        });

        it('keeps script execution locked to first-party code', () => {
            expect(directives['script-src']).not.toContain("'unsafe-inline'");
            expect(directives['script-src']).not.toContain("'unsafe-eval'");
            expect(directives['script-src-attr']).toEqual(["'none'"]);
        });

        it('blocks framing and plugin content', () => {
            expect(directives['frame-ancestors']).toEqual(["'none'"]);
            expect(directives['object-src']).toEqual(["'none'"]);
        });
    });

    // WebAuthn يشغّل قفل التطبيق والتحقّق من الإعدادات الحسّاسة ومسح البيانات.
    it('grants WebAuthn to first-party code in Permissions-Policy', () => {
        for (const feature of ['publickey-credentials-get', 'publickey-credentials-create']) {
            expect(vercel['permissions-policy']).toContain(`${feature}=(self)`);
        }
    });

    it('grants microphone and camera to first-party code for voice notes and scanner', () => {
        expect(vercel['permissions-policy']).toContain('microphone=(self)');
        expect(vercel['permissions-policy']).toContain('camera=(self)');
        expect(vercel['permissions-policy']).not.toContain('microphone=()');
    });
});
