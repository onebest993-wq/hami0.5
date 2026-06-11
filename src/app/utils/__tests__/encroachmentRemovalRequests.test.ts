import { describe, expect, it } from 'vitest';
import {
    ENCROACHMENT_DEFAULT_SURVEYOR_ENTITY,
    ENCROACHMENT_MACHINERY_REQUEST_TITLE,
    ENCROACHMENT_SURVEYOR_REQUEST_TITLE,
    parseEncroachmentExpenseAmount,
} from '../encroachmentRemovalRequests';

describe('encroachmentRemovalRequests', () => {
    it('parses Arabic and western digit expense amounts', () => {
        expect(parseEncroachmentExpenseAmount('150,000')).toBe(150000);
        expect(parseEncroachmentExpenseAmount('٠')).toBe(0);
        expect(parseEncroachmentExpenseAmount('50000')).toBe(50000);
    });

    it('exposes stable request titles and default surveyor entity', () => {
        expect(ENCROACHMENT_SURVEYOR_REQUEST_TITLE).toBe('طلب انتداب خبير مساح');
        expect(ENCROACHMENT_MACHINERY_REQUEST_TITLE).toBe('طلب إذن إدخال آليات وعمال للإزالة');
        expect(ENCROACHMENT_DEFAULT_SURVEYOR_ENTITY).toBe('مديرية التسجيل العقاري');
    });
});
