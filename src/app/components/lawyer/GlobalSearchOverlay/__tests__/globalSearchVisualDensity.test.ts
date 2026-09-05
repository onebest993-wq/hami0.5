import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const overlay = join(root, 'src/app/components/lawyer/GlobalSearchOverlay');

function read(rel: string): string {
    return readFileSync(join(overlay, rel), 'utf8');
}

describe('كثافة سطح البحث الشامل — خفيف احترافي', () => {
    it('الورقة المكتبية: 32rem و 0.75rem وظل خفيف وطلاء 12rem', () => {
        const sheet = read('overlayCss/gsSheet.css');
        expect(sheet).toContain('max-width: 32rem');
        expect(sheet).toContain('max-height: min(88dvh, 640px)');
        expect(sheet).toContain('border-radius: 0.75rem');
        expect(sheet).toContain('box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4)');
        expect(sheet).toContain('min-height: 12rem');
        expect(sheet).not.toContain('min-height: 13.5rem');
        expect(sheet).toContain('width: 1.75rem');
        expect(sheet).toContain('height: 0.15rem');
        expect(sheet).toContain('min-height: 44px');
        expect(sheet).not.toContain('1.65rem');
        expect(sheet).not.toContain('0 20px 48px');
        expect(sheet).not.toContain('0 12px 40px');
    });

    it('الكروم: عنوان 0.875rem، زوايا 0.75rem، نتائج 52px، دوّار CSS', () => {
        const chrome = read('overlayCss/gsChrome.css');
        expect(chrome).toContain('font-size: 0.875rem');
        expect(chrome).toContain('border-radius: 0.75rem');
        expect(chrome).toContain('contain-intrinsic-size: auto 52px');
        expect(chrome).toContain('.hami-gs-spinner');
        expect(chrome).toContain('@keyframes hami-gs-spin');
        expect(chrome).toContain('prefers-reduced-motion: reduce');
        expect(chrome).toContain("html[data-hami-lite='1'] .hami-gs-spinner");
        expect(chrome).toContain('min-height: 44px');
        expect(chrome).not.toContain('contain-intrinsic-size: auto 72px');
        expect(chrome).not.toContain('1.5rem');
        expect(chrome).not.toContain('rounded-2xl');
    });

    it('الرأس والنتائج والخطأ مضغوطة مع لمس 44px وحقل 16px', () => {
        const chromeClasses = read('searchInstantChromeClasses.ts');
        expect(chromeClasses).toContain('min-h-[44px]');
        expect(chromeClasses).toContain('text-[16px]');
        expect(chromeClasses).toContain('rounded-xl');
        expect(chromeClasses).toContain('mb-1');
        expect(chromeClasses).not.toContain('mb-1.5');
        expect(chromeClasses).not.toContain('rounded-full');

        const header = read('components/SearchHeader.tsx');
        expect(header).toContain('GS_SEARCH_INPUT_CLASS');
        expect(header).toContain('GS_TITLE_ROW_CLASS');
        expect(header).toContain('min-h-[44px]');
        expect(header).toContain('HomeXIcon size={16}');
        expect(header).toContain('HomeSearchIcon size={16}');
        expect(header).toContain('rounded-xl');
        expect(header).not.toContain('mb-1.5');
        expect(header).not.toContain('size={18}');
        expect(header).not.toContain('w-11 h-11 rounded-full');

        const row = read('components/ResultRow.tsx');
        expect(row).toContain('min-h-[44px]');
        expect(row).toContain('py-1.5 px-2');
        expect(row).toContain('text-[13px]');
        expect(row).toContain('text-[#E6C673]/85');
        expect(row).toContain('text-white/45');
        expect(row).not.toContain('text-[14px]');
        expect(row).not.toContain('text-amber-200');
        expect(row).not.toContain('text-rose-200');

        const body = read('components/ResultsBody.tsx');
        expect(body).toContain('space-y-2 pb-2.5 px-1');
        expect(body).not.toContain('space-y-3 pb-4');

        const recent = read('components/RecentSearchesPanel.tsx');
        expect(recent).toContain('px-3 py-2');
        expect(recent).toContain('min-h-[44px]');
        expect(recent).not.toContain('px-3.5 py-2.5');

        const error = read('GlobalSearchErrorBoundary.tsx');
        expect(error).toContain('rounded-xl');
        expect(error).toContain('min-h-[44px]');
        expect(error).toContain('p-4');
        expect(error).toContain('safe-area-inset-bottom');
        expect(error).not.toContain('rounded-t-2xl');
        expect(error).not.toContain('p-5');
    });

    it('المؤشر CSS بلا Loader2، والقشرة الفورية تطابق الرأس الحي', () => {
        const panel = read('components/SearchResultsPanel.tsx');
        expect(panel).toContain('hami-gs-spinner');
        expect(panel).not.toContain('Loader2');
        expect(panel).not.toContain('useReduceMotion');
        expect(panel).not.toContain('animate-spin');

        const instant = read('GlobalSearchInstantSheetChrome.tsx');
        expect(instant).toContain('GS_SEARCH_INPUT_CLASS');
        expect(instant).toContain('GS_TITLE_ROW_CLASS');
        expect(instant).toContain('HomeXIcon size={16}');
        expect(instant).toContain('HomeSearchIcon size={16}');
        expect(instant).not.toContain('mb-1.5');
        expect(instant).not.toContain('size={18}');
        expect(instant).not.toContain('w-11 h-11 rounded-full');

        const html = readFileSync(
            join(root, 'src/app/runtime/globalSearchInstantSheetHtml.ts'),
            'utf8',
        );
        expect(html).toContain('GS_SEARCH_INPUT_CLASS');
        expect(html).toContain('GS_TITLE_ROW_CLASS');
        expect(html).toContain('width="16"');
        expect(html).not.toContain('width="18"');
        expect(html).not.toContain('mb-1.5');
        expect(html).not.toContain('rounded-full');
    });
});
