import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DocumentsTabView } from '../DocumentsTabView';

vi.mock('@/app/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));

const refreshTransactionData = vi.fn().mockResolvedValue(undefined);
const addDocument = vi.fn().mockResolvedValue(undefined);
const deleteDocument = vi.fn().mockResolvedValue(undefined);

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    useTransactionsThreadingStore: (selector: (state: unknown) => unknown) =>
        selector({
            refreshTransactionData,
            documentsByTransactionId: {},
            addDocument,
            deleteDocument,
        }),
}));

describe('DocumentsTabView', () => {
    it('يفتح ورقة إضافة المرفق داخل hub', () => {
        render(
            <DocumentsTabView
                transaction={{
                    id: 'tx-1',
                    title: 'معاملة',
                    clientName: 'موكل',
                    department: 'دائرة',
                    targetDepartment: 'دائرة',
                    status: 'active',
                    agreedFees: 0,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /إضافة مرفق/i }));

        const sheet = screen.getByTestId('transactions-add-document-sheet');
        expect(sheet).toHaveAttribute('data-state', 'open');
        expect(screen.getByText('وصف المستمسك وعائديته')).toBeInTheDocument();
    });
});
