import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('phase-18 lawsuit ArchivePortal cold CPU cuts', () => {
    it('مسار الدعاوى لا يستورد useArchivePortalController / enrichment التنفيذ', () => {
        const lawsuit = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitSurface.tsx'),
            'utf8',
        );
        const dispatcher = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal.tsx'),
            'utf8',
        );
        const lawsuitHook = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/hooks/useLawsuitArchivePortalController.ts'),
            'utf8',
        );
        expect(lawsuit).toContain('useLawsuitArchivePortalController');
        expect(lawsuit).not.toContain('useArchivePortalController');
        expect(lawsuit).not.toContain('executionArchiveEnrichment');
        expect(dispatcher).toContain('ArchivePortalLawsuitSurface');
        expect(dispatcher).toContain('LazyArchivePortalExecutionSurface');
        expect(lawsuitHook).toContain('computeLawsuitArchiveEnrichedFiles');
        expect(lawsuitHook).not.toMatch(
            /import\s+.*executionArchiveFilterUtils|from\s+['\"]\.\.\/executionArchiveFilterUtils['\"]/,
        );
        expect(lawsuitHook).not.toMatch(/from\s+['\"]\.\.\/utils['\"]/);
        expect(lawsuitHook).toContain('criminalCardsReady');
    });

    it('WorkspacePinButton بلا fetch تشخيصي على كل بطاقة', () => {
        const src = readFileSync(join(root, 'src/app/workspace/WorkspacePinButton.tsx'), 'utf8');
        expect(src).not.toContain('127.0.0.1:7777');
        expect(src).not.toContain('nested-button-warning');
    });

    it('hubArchiveLoader يسخّن FileGrid عبر prefetchLawsuit فقط (بلا سحب من Portal notify)', () => {
        const src = readFileSync(join(root, 'src/app/runtime/hubArchiveLoader.ts'), 'utf8');
        expect(src).toContain('LawsuitArchiveFileGrid');
        expect(src).toContain('cachedArchivePortal = mod.ArchivePortal');
        expect(src).toContain('notifyArchivePortalListeners');
        expect(src).toContain('ensureLawsuitFileGridPromise');
        expect(src).toContain('getLawsuitFileGridReady');
        expect(src).not.toMatch(
            /notifyArchivePortalListeners\(\);\s*[\s\S]{0,120}ensureLawsuitFileGridPromise/,
        );
        expect(src).toMatch(
            /import\(\s*['\"]@\/app\/components\/lawyer\/ArchivePortal\/components\/LawsuitArchiveFileGrid['\"]/,
        );
    });

    it('UnifiedDossierCard يلغي spring الدخول (initial=false)', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/UnifiedDossierCard.tsx'),
            'utf8',
        );
        expect(src).toContain('initial={false}');
        expect(src).toContain('useReduceMotion');
    });
});
