import { describe, expect, it, vi, beforeEach } from 'vitest';
import { submitOtherPartyFollowupAction } from '../submitOtherPartyFollowupAction';

vi.mock('@/app/utils/specialFollowupDecisionQueue', () => ({
    appendSpecialFollowupRequest: vi.fn(() => 'special_followup_test'),
}));

describe('submitOtherPartyFollowupAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('persists log and returns decision metadata for creditor agent', () => {
        const persistExecutionMerge = vi.fn(() => true);
        const showToast = vi.fn();

        const result = submitOtherPartyFollowupAction({
            date: '2026-08-03',
            content: 'طلب تجريبي',
            decisionsStorageExecutionId: 'ex-1',
            existingLog: [],
            persistExecutionMerge,
            isRepresentingDebtor: false,
            showToast,
        });

        expect(result).toEqual({
            ok: true,
            decisionId: 'special_followup_test',
            logEntryId: expect.any(String),
        });
        expect(persistExecutionMerge).toHaveBeenCalledWith({
            other_party_actions_log: [
                expect.objectContaining({
                    content: 'طلب تجريبي',
                    date: '2026-08-03',
                    decisionRowId: 'special_followup_test',
                    outcome: 'pending',
                }),
            ],
        });
        expect(showToast).toHaveBeenCalledWith('تم حفظ التحرك في السجل.', 'success', undefined);
    });

    it('logs debtor-side action without executor decision card', () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();

        const result = submitOtherPartyFollowupAction({
            date: '2026-08-03',
            content: 'تحرك المدين',
            decisionsStorageExecutionId: 'ex-1',
            existingLog: [],
            persistExecutionMerge,
            isRepresentingDebtor: true,
            showToast,
        });

        expect(result).toEqual({ ok: true });
        expect(persistExecutionMerge).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('تم تسجيل التحرك في السجل الزمني.', 'success');
    });
});
