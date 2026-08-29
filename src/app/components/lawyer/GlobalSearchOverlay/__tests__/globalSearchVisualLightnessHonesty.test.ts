import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'src/app/components/lawyer/GlobalSearchOverlay');

function src(...parts: string[]): string {
    return readFileSync(join(dir, ...parts), 'utf8');
}

describe('global search visual lightness honesty', () => {
    it('الثيم كحلي/ذهب بلا قوس قزح تصنيفات وبلا آبار أيقونة', () => {
        const constants = src('constants.ts');
        const results = src('components/ResultsBody.tsx');
        const row = src('components/ResultRow.tsx');
        expect(constants).not.toContain('CATEGORY_META');
        expect(constants).not.toContain('lucideIcons');
        expect(constants).not.toContain('lucide-react');
        expect(results).toContain('hami-gs-section-label');
        expect(results).not.toContain('CATEGORY_META');
        expect(results).not.toContain('style={{ color');
        expect(row).not.toContain("from '@/app/components/ui/icons/Archive'");
        expect(row).not.toContain("from '@/app/components/ui/icons/Trash2'");
        expect(row).toContain('min-h-[44px]');
        expect(row).toContain('line-clamp-1');
    });

    it('الرأس حقل مسطح 44px بلا فاصل زخرفي وبلا صندوق 52px', () => {
        const header = src('components/SearchHeader.tsx');
        const chrome = src('GlobalSearchOverlayDialogChrome.tsx');
        const cover = src('GlobalSearchInstantPaintCover.tsx');
        const css = [src('overlayCss/gsChrome.css'), src('globalSearchOverlay.css')].join('\n');
        expect(header).toContain('min-h-[44px]');
        expect(header).not.toContain('min-h-[52px]');
        expect(header).toContain('homeStemIcons');
        expect(chrome).not.toContain('hami-gs-divider');
        expect(cover).not.toContain('hami-gs-divider');
        expect(css).not.toContain('.hami-gs-divider');
        expect(src('overlayCss/gsChrome.css')).toContain('#e6c673');
        expect(src('overlayCss/gsLayer.css')).toContain('#0a0f1c');
    });

    it('CSS مقسوم: طبقة / ورقة / كروم', () => {
        const barrel = src('globalSearchOverlay.css');
        expect(barrel).toContain("./overlayCss/gsLayer.css");
        expect(barrel).toContain("./overlayCss/gsSheet.css");
        expect(barrel).toContain("./overlayCss/gsChrome.css");
        expect(src('overlayCss/gsLayer.css').split('\n').length).toBeLessThan(160);
        expect(src('overlayCss/gsSheet.css').split('\n').length).toBeLessThan(180);
        expect(src('overlayCss/gsChrome.css').split('\n').length).toBeLessThan(280);
    });

    it('الخامل يعرض تلميحاً عربياً قصيراً دون أيقونات', () => {
        const idle = src('components/SearchIdlePanel.tsx');
        expect(idle).toContain('data-testid="global-search-idle-hint"');
        expect(idle).toContain('اكتب للبحث في الملفات والمواعيد والملاحظات');
        expect(idle).not.toContain('lucide-react');
        expect(src('overlayCss/gsChrome.css')).toContain('.hami-gs-idle-hint');
    });

    it('الطبقة والقشرة يشاركان إطاراً واحداً', () => {
        expect(src('GlobalSearchOverlayStaticShell.tsx')).toContain('GlobalSearchOverlayLayerFrame');
        expect(src('GlobalSearchInstantPaintCover.tsx')).toContain('GlobalSearchOverlayLayerFrame');
        expect(src('GlobalSearchInstantPaintCover.tsx')).toContain('GlobalSearchInstantSheetChrome');
        expect(src('GlobalSearchOverlayLayerFrame.tsx')).not.toContain('min-h-[44px]');
        expect(src('GlobalSearchOverlayLayerFrame.tsx')).toContain('resolveGlobalSearchSheetKeyboardStyle');
    });
});
