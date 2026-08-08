import { describe, expect, it, vi } from 'vitest';
import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import { handleOpenSeizureCompletionEvent } from '@/app/components/lawyer/ExecutionDashboard/utils/openSeizureCompletionHandler';
import { getExecutorDecisionRowById } from '@/app/utils/executorSeizureDecisionQueue';

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    getExecutorDecisionRowById: vi.fn(() => ({
        seizureSubtype: 'property',
        title: 'عقار تجريبي',
    })),
    patchExecutorDecisionRow: vi.fn(),
}));

describe('handleOpenSeizureCompletionEvent', () => {
    it('ignores events for other executions', () => {
        const focus = vi.fn();
        const ctx = {
            executionDataId: 'ex-1',
            executionId: 'ex-1',
            executionDataRef: { current: null as ExecutionFile | null },
            persistExecutionMergeRef: { current: vi.fn() },
            pushTimelineEventRef: { current: vi.fn() },
            nextTimelineId: () => 'tl-1',
            focusSeizurePropertyInlineRef: { current: focus },
            focusSeizureMovableInlineRef: { current: vi.fn() },
            focusSeizureThirdPartyInlineRef: { current: vi.fn() },
            focusSeizureNoticeInlineRef: { current: vi.fn() },
            seizedAssetsSnapshotRef: { current: [] as SeizedAsset[] },
            setSeizedAssets: vi.fn(),
            setSeizureDetailCompletion: vi.fn(),
            setShowCoerciveActionForm: vi.fn(),
        };

        handleOpenSeizureCompletionEvent(
            new CustomEvent('hami-open-seizure-completion', {
                detail: { executionId: 'ex-2', decisionId: 'dec-1' },
            }),
            ctx
        );

        expect(focus).not.toHaveBeenCalled();
    });

    it('focuses property inline for property subtype', () => {
        const focus = vi.fn();
        const ctx = {
            executionDataId: 'ex-1',
            executionId: 'ex-1',
            executionDataRef: { current: null as ExecutionFile | null },
            persistExecutionMergeRef: { current: vi.fn() },
            pushTimelineEventRef: { current: vi.fn() },
            nextTimelineId: () => 'tl-1',
            focusSeizurePropertyInlineRef: { current: focus },
            focusSeizureMovableInlineRef: { current: vi.fn() },
            focusSeizureThirdPartyInlineRef: { current: vi.fn() },
            focusSeizureNoticeInlineRef: { current: vi.fn() },
            seizedAssetsSnapshotRef: { current: [] as SeizedAsset[] },
            setSeizedAssets: vi.fn(),
            setSeizureDetailCompletion: vi.fn(),
            setShowCoerciveActionForm: vi.fn(),
        };

        handleOpenSeizureCompletionEvent(
            new CustomEvent('hami-open-seizure-completion', {
                detail: { executionId: 'ex-1', decisionId: 'dec-9' },
            }),
            ctx
        );

        expect(focus).toHaveBeenCalledWith('dec-9', 'عقار تجريبي');
    });

    it('opens coercive salary form after salary approval completion', () => {
        vi.mocked(getExecutorDecisionRowById).mockReturnValueOnce({
            seizureSubtype: 'salary',
            title: 'طلب حجز راتب',
        } as any);

        const setShowCoerciveActionForm = vi.fn();
        const setSeizureDetailCompletion = vi.fn();
        const ctx = {
            executionDataId: 'ex-1',
            executionId: 'ex-1',
            executionDataRef: { current: null as ExecutionFile | null },
            persistExecutionMergeRef: { current: vi.fn() },
            pushTimelineEventRef: { current: vi.fn() },
            nextTimelineId: () => 'tl-1',
            focusSeizurePropertyInlineRef: { current: vi.fn() },
            focusSeizureMovableInlineRef: { current: vi.fn() },
            focusSeizureThirdPartyInlineRef: { current: vi.fn() },
            focusSeizureNoticeInlineRef: { current: vi.fn() },
            seizedAssetsSnapshotRef: { current: [] as SeizedAsset[] },
            setSeizedAssets: vi.fn(),
            setSeizureDetailCompletion,
            setShowCoerciveActionForm,
        };

        handleOpenSeizureCompletionEvent(
            new CustomEvent('hami-open-seizure-completion', {
                detail: { executionId: 'ex-1', decisionId: 'dec-salary' },
            }),
            ctx
        );

        expect(setSeizureDetailCompletion).toHaveBeenCalledWith(
            expect.objectContaining({
                decisionRowId: 'dec-salary',
                actionType: 'salary',
            }),
        );
        expect(setShowCoerciveActionForm).toHaveBeenCalledWith('salary');
    });
});
