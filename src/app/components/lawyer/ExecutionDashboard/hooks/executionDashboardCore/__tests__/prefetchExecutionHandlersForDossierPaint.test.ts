import { describe, expect, it, vi, beforeEach } from 'vitest';

const prefetchExecutionCoreHandlers = vi.hoisted(() => vi.fn());

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionCoreHandlersPrefetch', () => ({
    prefetchExecutionCoreHandlers: (...args: unknown[]) => prefetchExecutionCoreHandlers(...args),
}));

import {
    prefetchExecutionHandlersForOpenDossier,
    prefetchExecutionHandlersForOpenFollowup,
} from '../prefetchExecutionHandlersForDossierPaint';

describe('prefetchExecutionHandlersForDossierPaint', () => {
    beforeEach(() => {
        prefetchExecutionCoreHandlers.mockClear();
    });

    it('فتح إضبارة عادية يسخّن طلبات الحجز فقط', () => {
        prefetchExecutionHandlersForOpenDossier({ isEvictionExecutionModule: false });
        expect(prefetchExecutionCoreHandlers.mock.calls).toEqual([['seizure-requests']]);
    });

    it('فتح إضبارة إخلاء يسخّن الجبري دون سجل/محضر/لوحة إجراءات الميدان', () => {
        prefetchExecutionHandlersForOpenDossier({ isEvictionExecutionModule: true });
        expect(prefetchExecutionCoreHandlers.mock.calls.map((call) => call[0])).toEqual([
            'seizure-requests',
            'coercive',
            'coercive-eviction',
            'coercive-lifecycle',
        ]);
        expect(prefetchExecutionCoreHandlers.mock.calls.map((call) => call[0])).not.toContain(
            'followup-admin-special',
        );
        expect(prefetchExecutionCoreHandlers.mock.calls.map((call) => call[0])).not.toContain('seizure-log');
        expect(prefetchExecutionCoreHandlers.mock.calls.map((call) => call[0])).not.toContain(
            'dossier-support',
        );
    });

    it('فتح المحضر على تبويب الطلبات لا يسخّن جسور التبويبات الأخرى', () => {
        prefetchExecutionHandlersForOpenFollowup({
            isRepresentingDebtor: false,
            isEvictionExecutionModule: false,
            unifiedModalTab: 'seizure_requests',
        });
        expect(prefetchExecutionCoreHandlers.mock.calls.map((call) => call[0])).toEqual(['seizure-requests']);
    });

    it('نية تبويب الإدارة تسخّن جسر الإدارة الخاصة', () => {
        prefetchExecutionHandlersForOpenFollowup({
            isRepresentingDebtor: false,
            isEvictionExecutionModule: false,
            unifiedModalTab: 'admin',
        });
        expect(prefetchExecutionCoreHandlers.mock.calls.map((call) => call[0])).toEqual([
            'seizure-requests',
            'followup-admin-special',
        ]);
    });

    it('نية تبويب الطرف الآخر تسخّن جسر المدين عند التمثيل', () => {
        prefetchExecutionHandlersForOpenFollowup({
            isRepresentingDebtor: true,
            isEvictionExecutionModule: false,
            unifiedModalTab: 'other_party',
        });
        expect(prefetchExecutionCoreHandlers.mock.calls.map((call) => call[0])).toEqual([
            'followup-other-party-debtor',
        ]);
    });
});
