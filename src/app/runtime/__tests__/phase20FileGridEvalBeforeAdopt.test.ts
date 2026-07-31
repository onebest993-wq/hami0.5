import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('phase-20 FileGrid eval during InstantShell before portal adopt', () => {
    it('hubArchiveLoader يفصل FileGrid عن تبنّي Portal (prefetchLawsuit فقط)', () => {
        const src = readFileSync(join(root, 'src/app/runtime/hubArchiveLoader.ts'), 'utf8');
        expect(src).toContain('export function getLawsuitFileGridReady');
        expect(src).toContain('export function subscribeLawsuitFileGridReady');
        expect(src).toContain('function ensureLawsuitFileGridPromise');
        expect(src).toContain('prefetchLawsuitArchiveContent');
        expect(src).toMatch(
            /export function prefetchLawsuitArchiveContent[\s\S]{0,200}ensureLawsuitFileGridPromise/,
        );
        // لا سحب FileGrid من ensureArchivePortalPromise
        expect(src).not.toMatch(
            /notifyArchivePortalListeners\(\);\s*[\s\S]{0,120}ensureLawsuitFileGridPromise/,
        );
        expect(src).not.toMatch(
            /await import\(\s*['\"]@\/app\/components\/lawyer\/ArchivePortal\/components\/ArchivePortalFileGrid['\"]/,
        );
    });

    it('ArchivePortalHost يؤجّل children حتى Component && lawsuitFileGridReady', () => {
        const host = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ArchivePortalHost.tsx'),
            'utf8',
        );
        expect(host).toContain('getLawsuitFileGridReady');
        expect(host).toContain('subscribeLawsuitFileGridReady');
        expect(host).toContain('prefetchLawsuitArchiveContent');
        expect(host).toContain('lawsuitFileGridReady');
        expect(host).toMatch(/Component && lawsuitFileGridReady \?/);
        expect(host).toMatch(/if \(type === 'lawsuits'\)[\s\S]{0,120}prefetchLawsuitArchiveContent/);
    });

    it('InstantShell يستدعي prefetchLawsuitArchiveContent عند التركيب', () => {
        const shell = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('prefetchLawsuitArchiveContent');
        expect(shell).toMatch(
            /useEffect\(\(\) => \{\s*prefetchLawsuitArchiveContent\(\);\s*\}, \[\]\)/,
        );
    });
});
