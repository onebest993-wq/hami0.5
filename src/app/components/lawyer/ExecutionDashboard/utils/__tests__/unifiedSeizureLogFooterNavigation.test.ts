import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearAllSeizureInlineFocusSessionsForTests,
    readSeizureInlineFocusSession,
    writeSeizureInlineFocusSession,
} from '@/app/domain/seizure/seizureInlineFocusSession';
import {
    dispatchUnifiedSeizureLogFooterAction,
    UNIFIED_SEIZURE_LOG_FOOTER_ACTION_EVENT,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation';
import { SEIZURE_CLOSE_UNIFIED_LOG_EVENT } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';

describe('seizureInlineFocusSession', () => {
    beforeEach(() => {
        clearAllSeizureInlineFocusSessionsForTests();
    });

    it('stores and reads pending inline focus by execution id', () => {
        writeSeizureInlineFocusSession('property', 'exec-1', 'dec-1', 'عقار');
        expect(readSeizureInlineFocusSession('property', 'exec-1')).toEqual({
            executionId: 'exec-1',
            decisionId: 'dec-1',
            subject: 'عقار',
        });
    });
});

describe('unifiedSeizureLogFooterNavigation', () => {
    beforeEach(() => {
        clearAllSeizureInlineFocusSessionsForTests();
    });

    it('dispatches footer action event with normalized detail', () => {
        const spy = vi.fn();
        window.addEventListener(UNIFIED_SEIZURE_LOG_FOOTER_ACTION_EVENT, spy);
        dispatchUnifiedSeizureLogFooterAction({
            executionId: 'exec-1',
            decisionId: 'dec-1',
            kind: 'third_party',
            subject: 'حجز لدى الغير',
        });
        window.removeEventListener(UNIFIED_SEIZURE_LOG_FOOTER_ACTION_EVENT, spy);
        expect(spy).toHaveBeenCalledTimes(1);
        const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
        expect(detail).toMatchObject({
            executionId: 'exec-1',
            decisionId: 'dec-1',
            kind: 'third_party',
            subject: 'حجز لدى الغير',
        });
    });

    it('closes unified log when bridge handles property navigation', async () => {
        const { runUnifiedSeizureLogFooterNavigation } = await import(
            '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation'
        );
        const closeSpy = vi.fn();
        window.addEventListener(SEIZURE_CLOSE_UNIFIED_LOG_EVENT, closeSpy);
        runUnifiedSeizureLogFooterNavigation({
            executionId: 'exec-2',
            decisionId: 'dec-2',
            kind: 'property',
            subject: 'عقار',
        });
        window.removeEventListener(SEIZURE_CLOSE_UNIFIED_LOG_EVENT, closeSpy);
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(readSeizureInlineFocusSession('property', 'exec-2')?.decisionId).toBe('dec-2');
    });
});
