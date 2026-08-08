import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransactionCard } from '@/app/components/lawyer/TransactionsThreading/TransactionCard';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';

const setTransactionArchived = vi.fn(async () => undefined);
const setTransactionDeleted = vi.fn(async () => undefined);

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    useTransactionsThreadingStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({
            setTransactionArchived,
            setTransactionDeleted,
        }),
}));

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: vi.fn(async () => true),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const transaction: Transaction = {
    id: 'tx-1',
    title: 'معاملة تجريبية',
    clientName: 'سارة أحمد',
    targetDepartment: 'دائرة التسجيل العقاري',
    status: TransactionStatus.Active,
    agreedFees: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TransactionCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useWorkspaceStore.getState().clearPins();
    });

    it('يبني اسماً وصولياً واضحاً لزر فتح المعاملة', () => {
        render(<TransactionCard transaction={transaction} listFilter="all" onPress={vi.fn()} />);

        expect(
            screen.getByRole('button', {
                name: 'فتح المعاملة معاملة تجريبية، الموكل سارة أحمد، الجهة دائرة التسجيل العقاري، الحالة نشطة',
            }),
        ).toBeInTheDocument();
    });

    it('يفتح التفاصيل عند النقر على البطاقة', () => {
        const onPress = vi.fn();
        render(<TransactionCard transaction={transaction} listFilter="all" onPress={onPress} />);

        fireEvent.click(screen.getByTestId('transactions-card-tx-1'));
        expect(onPress).toHaveBeenCalledWith(transaction);
    });

    it('لا يفتح التفاصيل عند pressDisabled', () => {
        const onPress = vi.fn();
        render(
            <TransactionCard transaction={transaction} listFilter="all" onPress={onPress} pressDisabled />,
        );

        fireEvent.click(screen.getByTestId('transactions-card-tx-1'));
        expect(onPress).not.toHaveBeenCalled();
    });

    it('يثبّت المعاملة دون فتح التفاصيل عند نقر زر التثبيت', () => {
        const onPress = vi.fn();
        render(<TransactionCard transaction={transaction} listFilter="all" onPress={onPress} />);

        const pin = screen.getByTestId('workspace-pin-threading-tx-1');
        fireEvent.click(pin);

        expect(onPress).not.toHaveBeenCalled();
        expect(useWorkspaceStore.getState().isPinned('tx-1', 'threading')).toBe(true);
        expect(pin).toHaveAttribute('aria-pressed', 'true');
    });

    it('لا يغلف زر التثبيت داخل button متداخل', () => {
        const { container } = render(<TransactionCard transaction={transaction} listFilter="all" onPress={vi.fn()} />);
        const pin = screen.getByTestId('workspace-pin-threading-tx-1');
        expect(pin.tagName).toBe('BUTTON');
        expect(pin.closest('button') === pin).toBe(true);
        expect(container.querySelector('button button')).toBeNull();
    });

    it('ينقل المعاملة إلى الأرشيف عند النقر على أرشفة', async () => {
        render(<TransactionCard transaction={transaction} listFilter="all" onPress={vi.fn()} />);

        fireEvent.click(screen.getByTestId('transactions-archive-tx-1'));

        await waitFor(() => {
            expect(setTransactionArchived).toHaveBeenCalledWith('tx-1', true);
        });
        expect(SmartToast.success).toHaveBeenCalledWith('نُقلت المعاملة إلى الأرشيف');
    });

    it('ينقل المعاملة إلى المحذوفات بعد التأكيد', async () => {
        render(<TransactionCard transaction={transaction} listFilter="all" onPress={vi.fn()} />);

        fireEvent.click(screen.getByTestId('transactions-delete-tx-1'));

        await waitFor(() => {
            expect(SmartDialog.confirm).toHaveBeenCalled();
            expect(setTransactionDeleted).toHaveBeenCalledWith('tx-1', true);
        });
        expect(SmartToast.success).toHaveBeenCalledWith('نُقلت المعاملة إلى المحذوفات');
    });

    it('يستعيد المعاملة من الأرشيف', async () => {
        render(<TransactionCard transaction={transaction} listFilter="archived" onPress={vi.fn()} />);

        fireEvent.click(screen.getByTestId('transactions-restore-archive-tx-1'));

        await waitFor(() => {
            expect(setTransactionArchived).toHaveBeenCalledWith('tx-1', false);
        });
        expect(SmartToast.success).toHaveBeenCalledWith('أُعيدت المعاملة من الأرشيف');
    });

    it('يستعيد المعاملة من المحذوفات', async () => {
        render(<TransactionCard transaction={transaction} listFilter="deleted" onPress={vi.fn()} />);

        fireEvent.click(screen.getByTestId('transactions-restore-trash-tx-1'));

        await waitFor(() => {
            expect(setTransactionDeleted).toHaveBeenCalledWith('tx-1', false);
        });
        expect(SmartToast.success).toHaveBeenCalledWith('أُعيدت المعاملة من المحذوفات');
    });
});
