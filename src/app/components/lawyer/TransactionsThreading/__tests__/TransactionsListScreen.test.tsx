import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import { TransactionsListScreen } from '@/app/components/lawyer/TransactionsThreading/TransactionsListScreen';

const mockTransactions: Transaction[] = [
    {
        id: 'tx-a',
        title: 'معاملة نشطة',
        clientName: 'سارة',
        targetDepartment: 'دائرة A',
        status: TransactionStatus.Active,
        agreedFees: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
        id: 'tx-b',
        title: 'معاملة مكتملة',
        clientName: 'محمد',
        targetDepartment: 'دائرة B',
        status: TransactionStatus.Completed,
        agreedFees: 0,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
    },
];

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    useTransactionsThreadingStore: (selector: (s: { transactions: Transaction[] }) => unknown) =>
        selector({ transactions: mockTransactions }),
}));

vi.mock('@/app/components/lawyer/TransactionsThreading/AddTransactionBottomSheet', () => ({
    AddTransactionBottomSheet: ({ open }: { open: boolean }) =>
        open ? <div data-testid="transactions-add-sheet">sheet</div> : null,
}));

vi.mock('@/app/components/lawyer/TransactionsThreading/TransactionCard', () => ({
    TransactionCard: ({
        transaction,
        onPress,
    }: {
        transaction: Transaction;
        onPress: (tx: Transaction) => void;
    }) => (
        <button type="button" data-testid={`tx-card-${transaction.id}`} onClick={() => onPress(transaction)}>
            {transaction.title}
        </button>
    ),
}));

vi.mock('@/app/components/lawyer/TransactionsThreading/transactionsGlassTheme', () => ({
    GLASS_CHIP: 'chip',
    GLASS_CHIP_ACTIVE: 'chip-active',
    GLASS_FIELD: 'field',
    TxGlassEmpty: ({ testId }: { testId?: string }) => <div data-testid={testId}>empty</div>,
    TxGlassFab: ({ testId, onClick }: { testId?: string; onClick: () => void }) => (
        <button type="button" data-testid={testId} onClick={onClick}>
            fab
        </button>
    ),
    TxGlassHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TxGlassPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TxHeaderRow: ({ title, onBack, backTestId }: { title: string; onBack?: () => void; backTestId?: string }) => (
        <div>
            <span>{title}</span>
            {onBack ? (
                <button type="button" data-testid={backTestId} onClick={onBack}>
                    back
                </button>
            ) : null}
        </div>
    ),
}));

describe('TransactionsListScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعرض القائمة والبحث والفلاتر', () => {
        render(<TransactionsListScreen />);
        expect(screen.getByTestId('transactions-list-screen')).toBeInTheDocument();
        expect(screen.getByTestId('transactions-search')).toBeInTheDocument();
        expect(screen.getByTestId('transactions-add-fab')).toBeInTheDocument();
        expect(screen.getByTestId('tx-card-tx-a')).toBeInTheDocument();
        expect(screen.getByTestId('tx-card-tx-b')).toBeInTheDocument();
    });

    it('يفلتر بالبحث', () => {
        render(<TransactionsListScreen />);
        fireEvent.change(screen.getByTestId('transactions-search'), { target: { value: 'سارة' } });
        expect(screen.getByText('معاملة نشطة')).toBeInTheDocument();
        expect(screen.queryByText('معاملة مكتملة')).not.toBeInTheDocument();
    });

    it('يفلتر بالحالة', () => {
        render(<TransactionsListScreen />);
        fireEvent.click(screen.getByRole('button', { name: 'مكتملة' }));
        expect(screen.queryByText('معاملة نشطة')).not.toBeInTheDocument();
        expect(screen.getByText('معاملة مكتملة')).toBeInTheDocument();
    });

    it('يفتح ورقة الإضافة من FAB', () => {
        render(<TransactionsListScreen />);
        fireEvent.click(screen.getByTestId('transactions-add-fab'));
        expect(screen.getByTestId('transactions-add-sheet')).toBeInTheDocument();
    });

    it('يستدعي onOpenDetails عند اختيار معاملة', () => {
        const onOpenDetails = vi.fn();
        render(<TransactionsListScreen onOpenDetails={onOpenDetails} />);
        fireEvent.click(screen.getByTestId('tx-card-tx-a'));
        expect(onOpenDetails).toHaveBeenCalledWith(mockTransactions[0]);
    });
});
