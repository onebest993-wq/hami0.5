import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    consumeOpenTransactionsAddSheet,
    consumePendingProcedureGuide,
    encodeProcedureGuideData,
    isProcedureGuidePost,
    markOpenTransactionsAddSheet,
    OPEN_TRANSACTIONS_HUB_EVENT,
    parseProcedureGuideDataLine,
    PROCEDURE_GUIDE_ACTION_MARKER,
    PROCEDURE_GUIDE_TAG,
    requestOpenTransactionsHub,
    stashPendingProcedureGuide,
    stripProcedureGuideMachineLines,
    subscribeOpenTransactionsHub,
} from '@/app/services/transactions/procedureGuideNavigation';

describe('procedureGuideNavigation', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    it('يتعرّف على منشور الدليل بالوسم أو العلامة', () => {
        expect(isProcedureGuidePost({ tags: [PROCEDURE_GUIDE_TAG], content: 'x' })).toBe(true);
        expect(isProcedureGuidePost({ tags: [], content: PROCEDURE_GUIDE_ACTION_MARKER })).toBe(true);
        expect(isProcedureGuidePost({ tags: ['#معاملات'], content: 'عادي' })).toBe(false);
    });

    it('يفك بيانات الدليل ويخفي أسطر الآلة', () => {
        const guide = {
            v: 1 as const,
            titleHint: 'دليل',
            steps: [{ id: '1', title: 'تقديم', parentTaskId: null, notes: '' }],
            documents: [{ title: 'هوية', ownerTag: 'للموكل' as const }],
        };
        const content = `نص ظاهر\n${PROCEDURE_GUIDE_ACTION_MARKER}\n${encodeProcedureGuideData(guide)}`;
        expect(parseProcedureGuideDataLine(content)?.steps[0]?.title).toBe('تقديم');
        expect(stripProcedureGuideMachineLines(content)).toBe('نص ظاهر');
    });

    it('يخزّن الدليل ويفتح نموذج الإضافة عند الطلب', () => {
        const handler = vi.fn();
        const unsub = subscribeOpenTransactionsHub(handler);
        requestOpenTransactionsHub({
            openAddSheet: true,
            guide: {
                v: 1,
                steps: [{ id: 'a', title: 'أ', parentTaskId: null }],
                documents: [{ title: 'سند', ownerTag: 'للدائرة' }],
            },
        });
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0]?.[0]?.openAddSheet).toBe(true);
        expect(consumeOpenTransactionsAddSheet()).toBe(true);
        expect(consumePendingProcedureGuide()?.documents[0]?.title).toBe('سند');
        unsub();
        expect(OPEN_TRANSACTIONS_HUB_EVENT).toBe('hami:open-transactions-hub');
    });

    it('mark/consume لورقة الإضافة', () => {
        markOpenTransactionsAddSheet();
        expect(consumeOpenTransactionsAddSheet()).toBe(true);
        expect(consumeOpenTransactionsAddSheet()).toBe(false);
        stashPendingProcedureGuide(null);
    });
});
