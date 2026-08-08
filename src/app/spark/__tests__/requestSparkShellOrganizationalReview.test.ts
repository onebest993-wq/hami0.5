import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    requestSparkShellOrganizationalReview,
    resetSparkShellReviewRuntimeForTests,
} from '@/app/spark/audit/requestSparkShellOrganizationalReview';

vi.mock('@/app/spark/audit/sparkAuditConfig', () => ({
    isSparkTextAuditEnabled: vi.fn(() => true),
}));

vi.mock('@/app/spark/audit/sparkTextAuditService', () => ({
    requestSparkTextAudit: vi.fn(),
}));

describe('requestSparkShellOrganizationalReview', () => {
    beforeEach(async () => {
        resetSparkShellReviewRuntimeForTests();
        const { requestSparkTextAudit } = await import('@/app/spark/audit/sparkTextAuditService');
        vi.mocked(requestSparkTextAudit).mockReset();
    });

    it('يرفض نصاً قصيراً', async () => {
        const outcome = await requestSparkShellOrganizationalReview({
            dossierKey: 'lawsuit:1',
            text: 'قصير',
            fieldType: 'note',
        });

        expect(outcome.ok).toBe(false);
        if (!outcome.ok) expect(outcome.reason).toBe('short');
    });

    it('يطبّق تبريداً لكل إضبارة', async () => {
        const { requestSparkTextAudit } = await import('@/app/spark/audit/sparkTextAuditService');
        vi.mocked(requestSparkTextAudit).mockResolvedValue({
            present: ['سجل'],
            missing: [],
            summary: 'يبدو مكتملاً',
        });

        const params = {
            dossierKey: 'lawsuit:1',
            text: 'نص طويل بما يكفي لاختبار المراجعة التنظيمية عند الطلب',
            fieldType: 'note' as const,
        };

        const first = await requestSparkShellOrganizationalReview(params);
        const second = await requestSparkShellOrganizationalReview(params);

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(false);
        if (!second.ok) expect(second.reason).toBe('cooldown');
    });
});
