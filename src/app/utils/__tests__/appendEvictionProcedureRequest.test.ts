import { describe, expect, it, vi } from 'vitest';
import { appendEvictionProcedureRequest } from '../appendEvictionProcedureRequest';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionEvictionActionIds';

vi.mock('@/app/utils/executionDomainIsolation', () => ({
    gateExecutorRequestPersist: vi.fn(() => ({ allowed: true })),
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/executorSeizureDecisionQueue')>();
    return {
        ...actual,
        hasBlockingEvictionProcedureDuplicate: vi.fn(() => false),
    };
});

describe('appendEvictionProcedureRequest', () => {
    it('creates executor request when unlocked', () => {
        const appendEvictionExecutorRequest = vi.fn(() => true);
        const showToast = vi.fn();

        appendEvictionProcedureRequest(
            {
                locked: false,
                decisionsStorageExecutionId: 'exec-1',
                executionData: {
                    id: 'child-1',
                    parentDossierId: 'exec-1',
                    claimType: 'أثاث زوجية',
                },
                appendEvictionExecutorRequest,
                showToast,
            },
            {
                actionId: EVICTION_TIMELINE_ACTION_IDS.MARITAL_FURNITURE_DELIVERY,
                title: 'طلب',
                description: 'وصف',
            },
        );

        expect(appendEvictionExecutorRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-1',
                title: 'طلب',
                body: 'وصف',
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: 'marital_furniture_delivery',
                executionData: expect.objectContaining({ claimType: 'أثاث زوجية' }),
            }),
        );
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('تم إنشاء الطلب'),
            'info',
            { decisionsLink: true },
        );
    });

    it('does not throw when appendEvictionExecutorRequest is missing', () => {
        const showToast = vi.fn();

        expect(() =>
            appendEvictionProcedureRequest(
                {
                    locked: false,
                    decisionsStorageExecutionId: 'exec-1',
                    appendEvictionExecutorRequest: undefined as never,
                    showToast,
                },
                {
                    actionId: EVICTION_TIMELINE_ACTION_IDS.MARITAL_FURNITURE_DELIVERY,
                    title: 'طلب',
                    description: 'وصف',
                },
            ),
        ).not.toThrow();

        expect(showToast).toHaveBeenCalledWith(
            'تعذر إرسال الطلب — الأدوات لم تكتمل التحميل بعد.',
            'warning',
        );
    });

    it('shows domain gate reason instead of duplicate when persist is blocked', async () => {
        const { gateExecutorRequestPersist } = await import('@/app/utils/executionDomainIsolation');
        vi.mocked(gateExecutorRequestPersist).mockReturnValueOnce({
            allowed: false,
            reasonAr: 'إجراءات ميدانية غير مسموحة لهذا النوع من المطالبة',
        });
        const appendEvictionExecutorRequest = vi.fn(() => false);
        const showToast = vi.fn();

        appendEvictionProcedureRequest(
            {
                locked: false,
                decisionsStorageExecutionId: 'exec-mf',
                appendEvictionExecutorRequest,
                showToast,
            },
            {
                actionId: EVICTION_TIMELINE_ACTION_IDS.MARITAL_FURNITURE_DELIVERY,
                title: 'طلب',
                description: 'وصف',
            },
        );

        expect(appendEvictionExecutorRequest).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            'إجراءات ميدانية غير مسموحة لهذا النوع من المطالبة',
            'warning',
        );
    });
});
