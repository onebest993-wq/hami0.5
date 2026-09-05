import { describe, expect, it } from 'vitest';
import {
    caseNoTextDir,
    displayCaseNo,
    displayMetaField,
    paintCaseNo,
} from '@/app/components/lawyer/smart-modal/smart-header/smartHeaderPresentation';

describe('displayMetaField / displayCaseNo', () => {
    it('maps empty and dash placeholders to غير محدد', () => {
        expect(displayMetaField('')).toBe('غير محدد');
        expect(displayMetaField('   ')).toBe('غير محدد');
        expect(displayMetaField('—')).toBe('غير محدد');
        expect(displayMetaField(null)).toBe('غير محدد');
        expect(displayCaseNo('')).toBe('غير محدد');
    });

    it('keeps real court or party names including بابل', () => {
        expect(displayMetaField('بابل')).toBe('بابل');
        expect(displayCaseNo('12/ش/2026')).toBe('12/ش/2026');
    });

    it('paints Iraqi pleading numbers as number/letter/year', () => {
        expect(paintCaseNo('22/ب/2026')).toBe('22/ب/2026');
        expect(paintCaseNo('2026/س/33')).toBe('33/س/2026');
        expect(paintCaseNo('س/33/2024')).toBe('33/س/2024');
        expect(paintCaseNo('33/س/2024')).toBe('33/س/2024');
        expect(paintCaseNo('س/2026/55')).toBe('55/س/2026');
        expect(paintCaseNo('2026/55/س')).toBe('55/س/2026');
    });

    it('uses LTR for Iraqi pleading numbers so digits stay first', () => {
        expect(caseNoTextDir('الأحوال')).toBe('rtl');
        expect(caseNoTextDir('12/ش/2026')).toBe('ltr');
        expect(caseNoTextDir('88/2026')).toBe('ltr');
        expect(caseNoTextDir('')).toBe('rtl');
    });
});
