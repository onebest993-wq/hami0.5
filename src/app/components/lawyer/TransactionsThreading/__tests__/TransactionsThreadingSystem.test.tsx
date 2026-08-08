import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';

const refreshTransactions = vi.fn(async () => undefined);
const setUserId = vi.fn(async () => undefined);
const mockTransactions: Transaction[] = [
    {
        id: 'tx-known',
        title: 'معروفة',
        clientName: 'موكل',
        targetDepartment: 'دائرة',
        status: TransactionStatus.Active,
        agreedFees: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    },
];

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    useTransactionsThreadingStore: Object.assign(
        (selector: (s: unknown) => unknown) =>
            selector({
                refreshTransactions,
                setUserId,
                transactions: mockTransactions,
            }),
        {
            getState: () => ({ transactions: mockTransactions }),
        },
    ),
    ensureTransactionsUserBound: vi.fn(),
}));

const smartToastWarning = vi.fn();
vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { warning: (...args: unknown[]) => smartToastWarning(...args) },
}));

vi.mock('@/app/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));
vi.mock('@/app/utils/bodyScrollLock', () => ({ useBodyScrollLock: () => undefined }));
vi.mock('@/app/components/lawyer/TransactionsThreading/hooks/useTransactionsEscapeStack', () => ({
    useTransactionsEscapeStack: () => undefined,
}));
vi.mock('@/app/components/lawyer/TransactionsThreading/hooks/useTransactionsOpenInteractionGuard', () => ({
    useTransactionsOpenInteractionGuard: () => true,
}));
vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...rest }: React.ComponentProps<'div'>) => <div {...rest}>{children}</div>,
    },
}));

vi.mock('@/app/components/lawyer/TransactionsThreading/TransactionsListScreen', () => ({
    TransactionsListScreen: () => <div data-testid="transactions-list-screen">list</div>,
}));
vi.mock('@/app/components/lawyer/TransactionsThreading/TransactionDetailsScreen', () => ({
    TransactionDetailsScreen: () => <div data-testid="transactions-details-screen">details</div>,
}));

describe('TransactionsThreadingSystem', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعرض القائمة افتراضياً بعد التحميل', async () => {
        const { TransactionsThreadingSystem } = await import(
            '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem'
        );
        const { getByTestId } = render(
            <TransactionsThreadingSystem onBack={vi.fn()} userId="user-1" />,
        );
        await waitFor(() => {
            expect(getByTestId('transactions-list-screen')).toBeInTheDocument();
        });
        expect(setUserId).toHaveBeenCalledWith('user-1');
        expect(refreshTransactions).toHaveBeenCalled();
    });

    it('يفتح التفاصيل عند initialTransactionId صالح', async () => {
        const { TransactionsThreadingSystem } = await import(
            '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem'
        );
        const { getByTestId } = render(
            <TransactionsThreadingSystem
                onBack={vi.fn()}
                userId="user-1"
                initialTransactionId="tx-known"
            />,
        );
        await waitFor(() => {
            expect(getByTestId('transactions-details-screen')).toBeInTheDocument();
        });
        expect(smartToastWarning).not.toHaveBeenCalled();
    });

    it('يبقى في القائمة وينبه عند initialTransactionId غير موجود', async () => {
        const { TransactionsThreadingSystem } = await import(
            '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem'
        );
        const { getByTestId } = render(
            <TransactionsThreadingSystem
                onBack={vi.fn()}
                userId="user-1"
                initialTransactionId="tx-missing"
            />,
        );
        await waitFor(() => {
            expect(getByTestId('transactions-list-screen')).toBeInTheDocument();
        });
        expect(smartToastWarning).toHaveBeenCalledWith('تعذر فتح المعاملة المطلوبة');
    });

    it('لا يفتح التفاصيل عند تغيّر focusId أثناء بقاء hub مفتوحاً', async () => {
        const { TransactionsThreadingSystem } = await import(
            '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem'
        );
        const { getByTestId, rerender } = render(
            <TransactionsThreadingSystem onBack={vi.fn()} userId="user-1" />,
        );
        await waitFor(() => {
            expect(getByTestId('transactions-list-screen')).toBeInTheDocument();
        });

        rerender(
            <TransactionsThreadingSystem
                onBack={vi.fn()}
                userId="user-1"
                initialTransactionId="tx-known"
            />,
        );

        await waitFor(() => {
            expect(refreshTransactions).toHaveBeenCalled();
        });
        expect(getByTestId('transactions-list-screen')).toBeInTheDocument();
    });
});
