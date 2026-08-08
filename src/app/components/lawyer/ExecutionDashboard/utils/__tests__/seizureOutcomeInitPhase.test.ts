import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleSeizureOutcomeInitPhase } from '../seizureOutcomeInitPhase';
import { SEIZURE_INLINE_FOCUS_EVENT } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';

describe('handleSeizureOutcomeInitPhase — عقار ومنقول', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('يفتح المتابعة ويركّز inline عند موافقة حجز عقار', () => {
        const focusProperty = vi.fn();
        const persist = vi.fn();
        const eventSpy = vi.fn();
        window.addEventListener(SEIZURE_INLINE_FOCUS_EVENT.property, eventSpy);

        const ctx = {
            executionDataRef: { current: { seizedProperties: [] } },
            persistExecutionMergeRef: { current: persist },
            applyThirdPartySeizuresFromPatch: vi.fn(),
            focusSeizurePropertyInlineRef: { current: focusProperty },
            focusSeizureMovableInlineRef: { current: vi.fn() },
            focusSeizureThirdPartyInlineRef: { current: vi.fn() },
            focusSeizureNoticeInlineRef: { current: vi.fn() },
            openFollowupModalPersisted: undefined,
            openSeizureRequestsTabRef: { current: vi.fn() },
            setShowUnifiedExecutionModal: vi.fn(),
            setShowCoerciveActionForm: vi.fn(),
            setSeizureDetailCompletion: vi.fn(),
        };

        const handled = handleSeizureOutcomeInitPhase(ctx as never, {
            decisionId: 'dec-prop',
            decisionRow: { title: 'طلب حجز عقار', seizureSubtype: 'property' },
            resolved: { subtype: 'property' },
            requestKind: 'seizure',
            savedAtEarly: '',
            seizureTarget: '',
            dispatchId: 'exec-1',
            myId: 'exec-1',
        } as never);

        expect(handled).toBe(true);
        expect(persist).toHaveBeenCalled();
        expect(focusProperty).toHaveBeenCalledWith('dec-prop', 'طلب حجز عقار');
        expect(eventSpy).toHaveBeenCalled();

        window.removeEventListener(SEIZURE_INLINE_FOCUS_EVENT.property, eventSpy);
    });

    it('يفتح المتابعة ويركّز inline عند موافقة حجز منقول', () => {
        const focusMovable = vi.fn();
        const persist = vi.fn();
        const eventSpy = vi.fn();
        window.addEventListener(SEIZURE_INLINE_FOCUS_EVENT.movable, eventSpy);

        const ctx = {
            executionDataRef: { current: { seizedMovables: [] } },
            persistExecutionMergeRef: { current: persist },
            applyThirdPartySeizuresFromPatch: vi.fn(),
            focusSeizurePropertyInlineRef: { current: vi.fn() },
            focusSeizureMovableInlineRef: { current: focusMovable },
            focusSeizureThirdPartyInlineRef: { current: vi.fn() },
            focusSeizureNoticeInlineRef: { current: vi.fn() },
            openFollowupModalPersisted: undefined,
            openSeizureRequestsTabRef: { current: vi.fn() },
            setShowUnifiedExecutionModal: vi.fn(),
            setShowCoerciveActionForm: vi.fn(),
            setSeizureDetailCompletion: vi.fn(),
        };

        const handled = handleSeizureOutcomeInitPhase(ctx as never, {
            decisionId: 'dec-mov',
            decisionRow: { title: 'طلب حجز مال منقول', seizureSubtype: 'movable_auction' },
            resolved: { subtype: 'movable_auction' },
            requestKind: 'seizure',
            savedAtEarly: '',
            seizureTarget: '',
            dispatchId: 'exec-1',
            myId: 'exec-1',
        } as never);

        expect(handled).toBe(true);
        expect(persist).toHaveBeenCalled();
        expect(focusMovable).toHaveBeenCalledWith('dec-mov', 'طلب حجز مال منقول');
        expect(eventSpy).toHaveBeenCalled();

        window.removeEventListener(SEIZURE_INLINE_FOCUS_EVENT.movable, eventSpy);
    });

    it('يفتح المتابعة ويركّز inline عند موافقة حجز لدى الغير', () => {
        const focusThirdParty = vi.fn();
        const persist = vi.fn();
        const eventSpy = vi.fn();
        window.addEventListener(SEIZURE_INLINE_FOCUS_EVENT.thirdParty, eventSpy);

        const ctx = {
            executionDataRef: { current: { thirdPartySeizures: [] } },
            persistExecutionMergeRef: { current: persist },
            applyThirdPartySeizuresFromPatch: vi.fn(),
            focusSeizurePropertyInlineRef: { current: vi.fn() },
            focusSeizureMovableInlineRef: { current: vi.fn() },
            focusSeizureThirdPartyInlineRef: { current: focusThirdParty },
            focusSeizureNoticeInlineRef: { current: vi.fn() },
            openFollowupModalPersisted: undefined,
            openSeizureRequestsTabRef: { current: vi.fn() },
            setShowUnifiedExecutionModal: vi.fn(),
            setShowCoerciveActionForm: vi.fn(),
            setSeizureDetailCompletion: vi.fn(),
        };

        const handled = handleSeizureOutcomeInitPhase(ctx as never, {
            decisionId: 'dec-tp',
            decisionRow: { title: 'حجز لدى الغير', seizureSubtype: 'third_party' },
            resolved: { subtype: 'third_party' },
            requestKind: 'seizure',
            savedAtEarly: '',
            seizureTarget: '',
            dispatchId: 'exec-1',
            myId: 'exec-1',
        } as never);

        expect(handled).toBe(true);
        expect(persist).toHaveBeenCalled();
        expect(focusThirdParty).toHaveBeenCalledWith('dec-tp', 'حجز لدى الغير');
        expect(eventSpy).toHaveBeenCalled();

        window.removeEventListener(SEIZURE_INLINE_FOCUS_EVENT.thirdParty, eventSpy);
    });
});
