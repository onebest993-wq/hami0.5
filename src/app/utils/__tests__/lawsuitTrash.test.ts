import { describe, expect, it } from 'vitest';
import {
    LAWSUIT_TRASH_RETENTION_MS,
    isLawsuitInTrash,
    isLawsuitArchived,
    lawsuitTrashDaysRemaining,
} from '../lawsuitTrash';

describe('lawsuitTrash', () => {
    it('detects trash and archived status', () => {
        expect(isLawsuitInTrash({ status: 'deleted' })).toBe(true);
        expect(isLawsuitArchived({ status: 'archived' })).toBe(true);
        expect(isLawsuitInTrash({ status: 'active' })).toBe(false);
    });

    it('computes days remaining in trash', () => {
        const deletedAt = Date.now() - 2 * 24 * 60 * 60 * 1000;
        const days = lawsuitTrashDaysRemaining({ status: 'deleted', deletedAt });
        expect(days).toBeGreaterThan(27);
        expect(days).toBeLessThanOrEqual(28);
    });

    it('يعرض صفراً بعد انتهاء مدة الاحتفاظ (بدون تنظيف تلقائي في الإنتاج)', () => {
        const expired = {
            status: 'deleted',
            deletedAt: Date.now() - LAWSUIT_TRASH_RETENTION_MS - 1000,
        };
        expect(lawsuitTrashDaysRemaining(expired)).toBe(0);
    });
});
