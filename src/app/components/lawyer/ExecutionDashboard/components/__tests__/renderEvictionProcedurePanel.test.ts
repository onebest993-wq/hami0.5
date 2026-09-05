import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
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

    it('يعرض اختصار قرار المنفذ بدل رفض/موافقة عند التعليق', () => {
        const row = {
            id: 'ev_1',
            executorOutcome: 'pending',
            evictionProcedureBranch: 'Field Visit Date',
        };
        const node = renderEvictionProcedurePanel({
            label: 'طلب الكشف',
            row,
            branch: 'Field Visit Date',
            executionId: 'ex-1',
            decisionRows: [row],
            afterApproveDeps: {
                decisionsStorageExecutionId: 'ex-1',
                decisionRows: [row],
                fieldVisitDateDraft: '',
                setFieldVisitDateDraft: vi.fn(),
                showToast: vi.fn(),
                dispatchDecisionsReload: vi.fn(),
            },
            openAppeals: vi.fn(),
        });
        const { getByTestId, queryByRole } = render(node as React.ReactElement);
        expect(getByTestId('seizure-executor-decision-shortcut')).toBeInTheDocument();
        expect(queryByRole('button', { name: 'رفض' })).toBeNull();
        expect(queryByRole('button', { name: 'موافقة' })).toBeNull();
    });
});
