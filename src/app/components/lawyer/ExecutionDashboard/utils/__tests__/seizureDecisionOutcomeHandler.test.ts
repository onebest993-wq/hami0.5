import { describe, expect, it, vi } from 'vitest';
import { handleSeizureDecisionOutcomeEvent } from '../seizureDecisionOutcomeHandler';
import { dispatchSeizureInlineFocus } from '@/app/domain/seizure/seizureOutcomeFocus';
import {
    getExecutorDecisionRowById,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';

vi.mock('@/app/domain/seizure/seizureOutcomeFocus', () => ({
    dispatchSeizureInlineFocus: vi.fn(),
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/executorSeizureDecisionQueue')>();
    return {
        ...actual,
        getExecutorDecisionRowById: vi.fn(),
        patchExecutorDecisionRow: vi.fn(),
        readSeizureRequestTarget: vi.fn(() => ''),
    };
});

function makeCtx(overrides: Record<string, unknown> = {}) {
    const executionDataRef = {
        current: {
            seizedMovables: [
                {
                    id: 'movable-1',
                    movableDescription: 'سيارة',
                    movableLocation: 'بغداد',
                    status: 'seized',
                },
            ],
            seizedProperties: [],
        },
    };
    return {
        executionDataId: 'exec-1',
        executionId: 'exec-1',
        decisionsStorageExecutionId: 'exec-1',
        nextTimelineId: () => 'tl-1',
        applyThirdPartySeizuresFromPatch: vi.fn(),
        executionDataRef,
        persistExecutionMergeRef: { current: vi.fn() },
        pushTimelineEventRef: { current: vi.fn() },
        seizureMatrixLedgerParamsRef: { current: null },
        focusSeizurePropertyInlineRef: { current: vi.fn() },
        focusSeizureMovableInlineRef: { current: vi.fn() },
        focusSeizureThirdPartyInlineRef: { current: vi.fn() },
        focusSeizureNoticeInlineRef: { current: vi.fn() },
        openSeizureRequestsTabRef: { current: vi.fn() },
        setShowCoerciveActionForm: vi.fn(),
        setSeizureDetailCompletion: vi.fn(),
        setShowUnifiedExecutionModal: vi.fn(),
        setUnifiedLedgerRevision: vi.fn(),
        showToast: vi.fn(),
        ...overrides,
    };
}

describe('handleSeizureDecisionOutcomeEvent (router)', () => {
    it('يوجّه موافقة طلب خبراء منقول إلى dispatchSeizureInlineFocus', () => {
        vi.mocked(getExecutorDecisionRowById).mockReturnValue({
            id: 'dec-movable-expert',
            seizureSubtype: 'movable_expert',
            seizurePayloadJson: JSON.stringify({ seizedMovableId: 'movable-1' }),
            requestKind: 'seizure',
        } as never);

        const ctx = makeCtx();
        const event = new CustomEvent('hami-execution-decision-outcome', {
            detail: {
                executionId: 'exec-1',
                decisionId: 'dec-movable-expert',
                requestKind: 'seizure',
                outcome: 'approved',
            },
        });

        handleSeizureDecisionOutcomeEvent(event, ctx as never);

        expect(dispatchSeizureInlineFocus).toHaveBeenCalledWith(
            expect.objectContaining({
                assetKind: 'movable',
                entityId: 'movable-1',
                step: 'experts',
                decisionId: 'dec-movable-expert',
            }),
        );
        expect(patchExecutorDecisionRow).not.toHaveBeenCalled();
    });

    it('يوجّه موافقة طلب خبراء عقار إلى dispatchSeizureInlineFocus', () => {
        const executionDataRef = {
            current: {
                seizedMovables: [],
                seizedProperties: [
                    {
                        id: 'property-1',
                        propertyNumber: '12',
                        propertyGender: 'دار',
                        status: 'seized',
                    },
                ],
            },
        };
        vi.mocked(getExecutorDecisionRowById).mockReturnValue({
            id: 'dec-property-expert',
            seizureSubtype: 'property_expert',
            seizurePayloadJson: JSON.stringify({ seizedPropertyId: 'property-1' }),
            requestKind: 'seizure',
        } as never);

        const ctx = makeCtx({ executionDataRef });
        const event = new CustomEvent('hami-execution-decision-outcome', {
            detail: {
                executionId: 'exec-1',
                decisionId: 'dec-property-expert',
                requestKind: 'seizure',
                outcome: 'approved',
            },
        });

        handleSeizureDecisionOutcomeEvent(event, ctx as never);

        expect(dispatchSeizureInlineFocus).toHaveBeenCalledWith(
            expect.objectContaining({
                assetKind: 'property',
                entityId: 'property-1',
                step: 'experts',
                decisionId: 'dec-property-expert',
            }),
        );
    });
});
