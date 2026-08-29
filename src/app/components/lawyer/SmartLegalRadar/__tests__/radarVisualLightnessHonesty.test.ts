import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'src/app/components/lawyer/SmartLegalRadar');

function src(...parts: string[]): string {
    return readFileSync(join(dir, ...parts), 'utf8');
}

describe('radar visual lightness honesty', () => {
    it('الهيدر بلا أيقونة تقويم — العنوان نص فقط', () => {
        const header = src('RadarHeader.tsx');
        expect(header).not.toContain('CalendarDays');
        expect(header).toContain('رادار المواعيد');
    });

    it('الحالة الفارغة بلا بئر أيقونة وبلا جملة إرشاد إضافية', () => {
        const empty = src('RadarEmptyState.tsx');
        expect(empty).not.toContain('CalendarDays');
        expect(empty).not.toContain('hami-radar-empty__icon');
        expect(empty).not.toContain('أضف موعداً من الشريط أدناه');
        expect(empty).toContain('لا توجد مواعيد لهذا اليوم');
    });

    it('نموذج الموعد سطح كحلي بلا فواصل وزر حفظ ذهبي', () => {
        const css = src('radarFormCritical.css');
        const actions = src('EventFormActions.tsx');
        expect(css).toMatch(/\.hami-radar-form-panel\s*\{[^}]*background-color:\s*#0a0f1c/s);
        expect(css).not.toContain('#f8f6f2');
        expect(css).toContain('.hami-radar-form-head');
        expect(css).toMatch(/\.hami-radar-form-head\s*\{[^}]*border-bottom:\s*0/s);
        expect(css).toMatch(/\.hami-radar-form-actions\s*\{[^}]*border-top:\s*0/s);
        expect(css).toMatch(/\.hami-radar-form-save\s*\{[^}]*background-color:\s*#e6c673/s);
        expect(css).not.toMatch(/\.hami-radar-form-save\s*\{[^}]*background-color:\s*#0a0f1c/s);
        expect(actions).not.toContain('font-bold');
        expect(actions).not.toContain('Trash2');
        expect(actions).toContain('RADAR_FORM_BTN_DANGER');
    });

    it('شريط الشهر بلا أيقونة وبلا فاصل صندوق زجاج', () => {
        const toolbar = src('RadarMonthToolbar.tsx');
        const nav = src('RadarMonthNav.tsx');
        const theme = src('radarTheme.ts');
        expect(toolbar).not.toContain('CalendarDays');
        expect(nav).not.toContain('hami-radar-month-nav__divider');
        expect(theme).toContain("'hami-radar-month-nav flex flex-col mb-2'");
    });

    it('CSS مقسوم: طبقة / كروم / بطاقات', () => {
        const barrel = src('radarTheme.css');
        expect(barrel).toContain("./radarCss/radarPage.css");
        expect(barrel).toContain("./radarCss/radarChrome.css");
        expect(barrel).toContain("./radarCss/radarCards.css");
        expect(src('radarCss/radarPage.css').split('\n').length).toBeLessThan(120);
        expect(src('radarCss/radarChrome.css').split('\n').length).toBeLessThan(240);
        expect(src('radarCss/radarCards.css').split('\n').length).toBeLessThan(160);
        expect(src('radarCss/radarCards.css')).not.toContain('#f59e0b');
        expect(src('radarCss/radarCards.css')).not.toContain('#a78bfa');
    });

    it('البطاقات والشرائح بلا آبار أيقونة أو قوس قزح نوع', () => {
        const chips = src('EventCardChips.tsx');
        const details = src('EventCardDetails.tsx');
        const types = src('radarEventTypeStyles.ts');
        const cell = src('CalendarGridDayCell.tsx');
        expect(chips).not.toContain("from '@/app/components/ui/icons/");
        expect(details).not.toContain("from '@/app/components/ui/icons/");
        expect(types).not.toContain('icon:');
        expect(types).not.toContain('bg:');
        expect(cell).not.toContain('radarCalendarDots');
        expect(cell).toContain('min-h-[44px]');
    });

    it('الموعد قابل للمسح: بطاقة زجاج ومرساة إضافة ذهبية', () => {
        const cards = src('radarCss/radarCards.css');
        const chrome = src('radarCss/radarChrome.css');
        expect(cards).toContain('border-radius: 0.85rem');
        expect(cards).toContain('border-inline-start: 3px solid');
        expect(chrome).toMatch(/\.hami-radar-add-btn\s*\{[^}]*background-color:\s*#e6c673/s);
        expect(chrome).toContain('color: #0a0f1c !important');
        expect(chrome).toContain('.hami-radar-week-strip__day--selected');
        expect(chrome).toContain('border-color: color-mix(in srgb, #e6c673 48%, transparent)');
    });
});
