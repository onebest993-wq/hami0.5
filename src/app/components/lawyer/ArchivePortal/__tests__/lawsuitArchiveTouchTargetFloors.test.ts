import { describe, expect, it } from 'vitest';
import {
    ARCHIVE_CHIP_BASE,
    ARCHIVE_ROYAL_GLASS_FAB,
    ARCHIVE_SEARCH_INPUT,
    ARCHIVE_SEGMENT_BTN_BASE,
} from '@/app/components/lawyer/ArchivePortal/archiveToolbarStyles';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** يقفل أهداف اللمس الحرجة في أرشيف الدعاوى — 44px للأزرار الأساسية */
describe('lawsuit archive touch target floors', () => {
    it('segment toolbar buttons meet 44px floor', () => {
        expect(ARCHIVE_SEGMENT_BTN_BASE).toContain('min-h-[44px]');
        expect(ARCHIVE_SEGMENT_BTN_BASE).toContain('touch-manipulation');
    });

    it('search field meets 44px floor', () => {
        expect(ARCHIVE_SEARCH_INPUT).toContain('min-h-[44px]');
    });

    it('add FAB meets 44px floor (3.5rem)', () => {
        expect(ARCHIVE_ROYAL_GLASS_FAB).toContain('min-h-[3.5rem]');
        expect(ARCHIVE_ROYAL_GLASS_FAB).toContain('touch-manipulation');
    });

    it('WorkspacePinButton default meets 44px floor', () => {
        const src = readFileSync(
            resolve(__dirname, '../../../../workspace/WorkspacePinButton.tsx'),
            'utf8',
        );
        expect(src).toContain('min-h-[44px] min-w-[44px] h-11 w-11');
        expect(src).toContain('touch-manipulation');
        expect(src).toContain("variant?: 'typed' | 'ghost'");
        expect(src).not.toContain('shrink-0 w-8 h-8 flex items-center justify-center border');
    });

    it('LawsuitArchiveCard pin and selection meet 44px floor', () => {
        const src = readFileSync(
            resolve(__dirname, '../components/LawsuitArchiveCard.tsx'),
            'utf8',
        );
        expect(src).toMatch(/min-h-\[44px\][\s\S]*min-w-\[44px\]/);
        expect(src).toContain('!min-w-[44px] !min-h-[44px] !w-11 !h-11');
    });

    it('CriminalArchiveCard pin meets 44px floor', () => {
        const src = readFileSync(
            resolve(__dirname, '../components/CriminalArchiveCard.tsx'),
            'utf8',
        );
        expect(src).toContain('!min-w-[44px] !min-h-[44px] !w-11 !h-11');
    });

    it('lifecycle icon-only segment meets 44px floor', () => {
        const src = readFileSync(
            resolve(__dirname, '../components/archiveLifecycleSegmentUi.tsx'),
            'utf8',
        );
        expect(src).toContain("iconOnly ? 'min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 px-0'");
        expect(src).not.toContain("iconOnly ? 'h-9 w-9 shrink-0 px-0'");
    });

    it('LawsuitArchiveChrome back control meets 44px floor', () => {
        const src = readFileSync(resolve(__dirname, '../LawsuitArchiveChrome.tsx'), 'utf8');
        expect(src).toContain('min-h-[44px]');
        expect(src).toContain('min-w-[44px]');
    });

    it('lawsuit archive empty/fallback spacers stay dense (not py-20)', () => {
        const chrome = readFileSync(resolve(__dirname, '../LawsuitArchiveChrome.tsx'), 'utf8');
        const grid = readFileSync(
            resolve(__dirname, '../components/LawsuitArchiveFileGrid.tsx'),
            'utf8',
        );
        expect(chrome).not.toContain('text-center py-20');
        expect(grid).toContain('text-center py-10 px-4');
        expect(grid).not.toContain('py-20 px-6');
    });

    it('shared trash bulk bar meets 44px floor', () => {
        const src = readFileSync(
            resolve(__dirname, '../components/ArchivePortalTrashBulkBar.tsx'),
            'utf8',
        );
        expect(src).toContain('min-h-[44px]');
        expect(src).toContain('touch-manipulation');
    });

    it('ARCHIVE_CHIP_BASE meets 44px floor for lawsuit/shared toolbar path', () => {
        expect(ARCHIVE_CHIP_BASE).toContain('min-h-[44px]');
        expect(ARCHIVE_CHIP_BASE).toContain('touch-manipulation');
    });

    it('LawsuitArchiveFileGrid lazy-loads CriminalArchiveCard and uses lite reference', () => {
        const grid = readFileSync(
            resolve(__dirname, '../components/LawsuitArchiveFileGrid.tsx'),
            'utf8',
        );
        expect(grid).toContain('LazyCriminalArchiveCard');
        expect(grid).toContain('criminalArchiveReferenceLite');
        expect(grid).toContain('LAWSUIT_VAULT_TEST_IDS.lawsuitFilePrefix');
        expect(grid).not.toContain('lawsuit-card');
        expect(grid).not.toMatch(/from ['"]\.\/CriminalArchiveCard['"]/);
        expect(grid).not.toMatch(/from ['"]\.\.\/criminalArchiveUtils['"]/);
    });
});
