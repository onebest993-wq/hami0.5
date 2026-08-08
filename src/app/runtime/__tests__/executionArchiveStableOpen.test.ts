import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('execution archive open — keep-alive sync', () => {
    it('MainView يركّب Entry sync + InstantChrome keep-alive بلا بوابة armed', () => {
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('ExecutionArchiveInstantChrome');
        expect(main).toContain('LawyerDashboardExecutionOverlayEntry');
        expect(main).not.toContain('LazyExecutionOverlayEntry');
        expect(main).toContain('executionArchiveHostMounted');
        expect(main).toContain('open={executionArchiveOpen}');
        expect(main).not.toContain('executionEntryArmed');
        expect(main).not.toContain('ensureExecutionArchiveOpenReady');
        expect(main).not.toContain('ARCHIVE_PORTAL_FALLBACK');
        expect(main).not.toContain('ExecutionArchiveTabLoading');
    });

    it('loadExecutionArchiveHubModule لا يحجب Portal على Surface/FileGrid', () => {
        const src = readFileSync(join(root, 'src/app/runtime/hubArchiveLoader.ts'), 'utf8');
        const fn = src.slice(src.indexOf('export function loadExecutionArchiveHubModule'));
        const body = fn.slice(0, fn.indexOf('export function prefetchLawsuitArchiveContent'));
        expect(body).toContain('prefetchExecutionArchiveContent');
        expect(body).toContain('return loadArchivePortalModule()');
        expect(body).not.toContain('Promise.all');
    });

    it('Chrome المضمّن ليس bg-black/90 وFileGrid sync', () => {
        const chrome = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx'),
            'utf8',
        );
        expect(chrome).toContain('bg-[#0B1021]');
        expect(chrome).not.toMatch(/embedded[\s\S]{0,120}bg-black\/90/);
        expect(chrome).toMatch(/import \{ ExecutionArchiveFileGrid \}/);
        expect(chrome).not.toContain('LazyExecutionArchiveFileGrid');
        expect(chrome).not.toContain('جاري تحميل بطاقات التنفيذ');
    });
});
