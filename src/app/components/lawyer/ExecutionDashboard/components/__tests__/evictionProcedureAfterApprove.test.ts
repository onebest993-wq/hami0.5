import { describe, expect, it, vi } from 'vitest';
import { buildEvictionAfterApproveContent } from '../evictionProcedureAfterApprove';

describe('buildEvictionAfterApproveContent', () => {
    const baseDeps = {
        decisionsStorageExecutionId: 'ex-1',
        decisionRows: [],
        fieldVisitDateDraft: '',
        setFieldVisitDateDraft: vi.fn(),
        showToast: vi.fn(),
        dispatchDecisionsReload: vi.fn(),
    };

    it('returns null when row has no id', () => {
        expect(buildEvictionAfterApproveContent({}, 'Field Visit Date', baseDeps)).toBeNull();
    });

    it('returns null when workflow is not approved-active', () => {
        expect(
            buildEvictionAfterApproveContent(
                { id: 'd1', executorOutcome: 'pending' },
                'Field Visit Date',
                baseDeps,
            ),
        ).toBeNull();
    });
});
