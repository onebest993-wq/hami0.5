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

    it('يفرغ لقطة الرجوع عند إزالة تبويب المرفقات', () => {
        const onDocumentsEscapeSnapshotChange = vi.fn();
        const { unmount } = render(
            <DocumentsTabView
                transaction={{
                    id: 'tx-1',
                    title: 'معاملة',
                    clientName: 'موكل',
                    department: 'دائرة',
                    targetDepartment: 'دائرة',
                    status: 'active',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                }}
                onDocumentsEscapeSnapshotChange={onDocumentsEscapeSnapshotChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /إضافة مرفق/i }));
        expect(onDocumentsEscapeSnapshotChange).toHaveBeenCalledWith({
            addDocumentSheetOpen: true,
            deleteDocumentOpen: false,
        });

        unmount();
        expect(onDocumentsEscapeSnapshotChange).toHaveBeenLastCalledWith({
            addDocumentSheetOpen: false,
            deleteDocumentOpen: false,
        });
    });
});
