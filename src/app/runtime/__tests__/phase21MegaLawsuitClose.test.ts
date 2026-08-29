import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('mega-close: lawsuit virtualize + InstantShell bridge', () => {
    it('ArchiveVirtualGrid يستخدم useVirtualizer + getScrollElement (لا window فقط)', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/ArchiveVirtualGrid.tsx'),
            'utf8',
        );
        expect(src).toContain('useVirtualizer');
        expect(src).toContain('getScrollElement');
        expect(src).toContain('ResizeObserver');
        expect(src).toContain('clientWidth');
        expect(src).toContain('lastMeasuredArchiveHostWidth');
        expect(src).toContain('readArchiveGridWidthGuess');
        expect(src).not.toContain('containerWidth <= 0');
        expect(src).not.toContain('useWindowVirtualizer');
    });

    it('LawsuitArchiveFileGrid يمرّر الشبكة عبر ArchiveVirtualGrid', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx'),
            'utf8',
        );
        expect(src).toContain('ArchiveVirtualGrid');
        expect(src).toContain('getArchiveScrollElement');
        expect(src).toContain('lawsuit-archive-grid');
        expect(src).not.toContain("from 'motion/react'");
    });

    it('Host يرفع search/viewMode + scrollParent إلى InstantShell والبوابة', () => {
        const host = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ArchivePortalHost.tsx'),
            'utf8',
        );
        expect(host).toContain('onScrollParentRef');
        expect(host).toContain('archiveScrollParent');
        expect(host).toContain('dossierSearchQuery');
        expect(host).toContain('dossierViewMode');
        expect(host).toContain('onDossierSearchQueryChange');
    });

    it('InstantShell يقبل أدوات البحث/العرض المتحكم بها وscroll ref', () => {
        const shell = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('onScrollParentRef');
        expect(shell).toContain('onSearchQueryChange');
        expect(shell).toContain('onViewModeChange');
        expect(shell).toContain('searchQuery?: string');
        expect(shell).not.toContain('searchOpen');
    });

    it('ExecutionArchiveFileGrid يمرّر getArchiveScrollElement', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid.tsx'),
            'utf8',
        );
        expect(src).toContain('getArchiveScrollElement');
        expect(src).toContain('getScrollElement={getArchiveScrollElement}');
    });
});
