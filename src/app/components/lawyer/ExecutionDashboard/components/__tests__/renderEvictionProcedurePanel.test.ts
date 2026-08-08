import { describe, expect, it, vi } from 'vitest';
import { renderEvictionProcedurePanel } from '../evictionProcedures/renderEvictionProcedurePanel';

describe('renderEvictionProcedurePanel', () => {
    it('returns null when row has no id', () => {
        expect(
            renderEvictionProcedurePanel({
                label: 'test',
                row: null,
                branch: 'Field Visit Date',
                executionId: 'ex-1',
                decisionRows: [],
                afterApproveDeps: {
                    decisionsStorageExecutionId: 'ex-1',
                    decisionRows: [],
                    fieldVisitDateDraft: '',
                    setFieldVisitDateDraft: vi.fn(),
                    showToast: vi.fn(),
                    dispatchDecisionsReload: vi.fn(),
                },
                openAppeals: vi.fn(),
            }),
        ).toBeNull();
    });
});
