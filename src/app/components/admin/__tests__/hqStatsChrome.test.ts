import { describe, expect, it } from 'vitest';
import {
    hqAccountsSummary,
    hqCourtsSummary,
    hqForumSummary,
    hqHealthSummary,
    hqQueueSummary,
    hqVerificationSummary,
} from '../hqStatsChrome';

describe('hqStatsChrome summaries', () => {
    it('يلخّص الأقسام بأرقام قابلة للمسح دون تفاصيل حساسة', () => {
        expect(hqQueueSummary(0)).toBe('لا إجراء معلّق');
        expect(hqQueueSummary(4)).toBe('4 يحتاج إجراء');
        expect(hqAccountsSummary({ usersTotal: 4, usersFrozen: 0, usersLocked: 0, contentGaps: [] })).toBe(
            '4 حساب · 0 مجمّد · 0 مقفل',
        );
        expect(
            hqAccountsSummary({
                usersTotal: 4,
                usersFrozen: 0,
                usersLocked: 0,
                contentGaps: ['usersFrozen'],
            }),
        ).toBe('4 حساب · — مجمّد · 0 مقفل');
        expect(
            hqAccountsSummary({
                usersTotal: 0,
                usersFrozen: 0,
                usersLocked: 0,
                contentGaps: ['usersTotal'],
            }),
        ).toBe('— حساب · 0 مجمّد · 0 مقفل');
        expect(hqVerificationSummary({ pendingVerification: 0, verificationApproved: 6, contentGaps: [] })).toBe(
            '0 معلّق · 6 معتمد',
        );
        expect(
            hqVerificationSummary({
                pendingVerification: 0,
                verificationApproved: 6,
                contentGaps: ['pendingVerification'],
            }),
        ).toBe('— معلّق · — معتمد');
        expect(hqForumSummary(0, 2)).toBe('0 منشور · 2 بلاغ');
        expect(hqForumSummary('—', '—')).toBe('— منشور · — بلاغ');
        expect(hqQueueSummary('—')).toBe('العدّ غير مكتمل');
        expect(hqCourtsSummary(3, 8)).toBe('3 محكمة · 8 دعوى');
        expect(hqHealthSummary({ db: true, kvOk: true, system: 'connected', sessionRequired: false })).toBe(
            'تعمل · يعمل · متصل',
        );
        expect(hqHealthSummary({ db: false, kvOk: false, system: 'down', sessionRequired: false })).toBe(
            'متوقفة · متوقف · منقطع',
        );
        expect(hqHealthSummary({ db: false, kvOk: false, system: 'down', sessionRequired: true })).toBe(
            'بلا جلسة · لم تُفحص الخدمات',
        );
    });
});
