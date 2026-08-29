import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('profileChrome layout architecture', () => {
    const css = readFileSync(resolve(__dirname, '../profileChrome.css'), 'utf8');
    const chromeHeader = readFileSync(
        resolve(__dirname, '../components/ProfileChromeHeader.tsx'),
        'utf8',
    );

    it('الجذر يطبّق safe-area ومتغيّر ارتفاع الكروم دون marginTop px ثابت', () => {
        expect(css).toContain(
            '--profile-safe-top: var(--hami-lawyer-header-safe-top, env(safe-area-inset-top, 0px))',
        );
        expect(css).toContain('--profile-chrome-header-height');
        expect(css).toContain('padding-top: var(--profile-safe-top)');
        expect(css).not.toMatch(/margin-top:\s*\d+px/);
    });

    it('صف الكروم داخل الشجرة وليس fixed فوق الصورة', () => {
        expect(css).toContain('.hami-profile-chrome-header');
        expect(css).not.toContain('.hami-profile-edit-chrome-host');
        expect(chromeHeader).not.toContain('createPortal');
        expect(chromeHeader).not.toContain('position: fixed');
        expect(chromeHeader).toContain('data-profile-chrome-header');
    });

    it('زر العودة في طرف الكروم المقابل للهوية وليس فوق الصورة', () => {
        expect(chromeHeader).toContain('lawyer-profile-chrome-end');
        const endSlotIdx = chromeHeader.indexOf('hami-profile-chrome-header__slot--end');
        const backJsxIdx = chromeHeader.indexOf('<ProfileBackButton');
        expect(endSlotIdx).toBeGreaterThan(-1);
        expect(backJsxIdx).toBeGreaterThan(endSlotIdx);
        expect(css).toContain('.hami-profile-chrome-header__slot--end');
        expect(css).toMatch(/__slot--end\s*\{[^}]*gap:/);
    });

    it('أثناء التحرير يُخفى الرجوع حتى لا يلاصق زر الحفظ', () => {
        expect(chromeHeader).toContain('!showEditChrome && showBack && onBack');
        const editBarIdx = chromeHeader.indexOf('lawyer-profile-edit-bar');
        const backGateIdx = chromeHeader.indexOf('!showEditChrome && showBack');
        expect(editBarIdx).toBeGreaterThan(-1);
        expect(backGateIdx).toBeGreaterThan(editBarIdx);
    });

    it('خلفية الجذر تملأ إطار العرض — لا ثقب أسود تحت المحتوى القصير', () => {
        expect(css).toContain('min-height: max(100%, 100dvh)');
    });

    it('عمود الصفحة — عرض كامل على الهاتف بهامش واحد (520px سقف)', () => {
        expect(css).toContain('--profile-page-max-width: min(100%, 32.5rem)');
        expect(css).toContain('--profile-page-gutter-start');
        expect(css).toContain('.hami-profile-page-column');
        expect(css).toContain('padding-inline: var(--profile-page-gutter-start) var(--profile-page-gutter-end)');
    });

    it('وضع التحرير لا يُقلّص الهيرو تحت شريط الإجراءات', () => {
        const editBlock = css.slice(
            css.indexOf('[data-lawyer-profile-root][data-profile-editing'),
        );
        expect(editBlock).toContain('.hami-profile-hero-wrap');
        expect(editBlock).toContain('padding-top: 0.5rem');
        expect(editBlock).not.toMatch(/padding-top:\s*1\.25rem/);
        expect(css).not.toContain('.hami-header-profile-avatar-warming');
    });
});
