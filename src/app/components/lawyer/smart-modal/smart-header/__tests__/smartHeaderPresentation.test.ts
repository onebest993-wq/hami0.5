import { describe, expect, it } from 'vitest';
import {
    caseNoTextDir,
    displayCaseNo,
    displayMetaField,
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

    it('uses RTL for Arabic case numbers and LTR for digit-led numbers', () => {
        expect(caseNoTextDir('الأحوال')).toBe('rtl');
        expect(caseNoTextDir('12/ش/2026')).toBe('rtl');
        expect(caseNoTextDir('88/2026')).toBe('ltr');
        expect(caseNoTextDir('')).toBe('rtl');
    });
});
