import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionCard } from '@/app/components/lawyer/TransactionsThreading/TransactionCard';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';

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
        useWorkspaceStore.getState().clearPins();
    });

    it('يبني اسماً وصولياً واضحاً لزر فتح المعاملة', () => {
        render(<TransactionCard transaction={transaction} onPress={vi.fn()} />);

        expect(
            screen.getByRole('button', {
                name: 'فتح المعاملة معاملة تجريبية، الموكل سارة أحمد، الدائرة دائرة التسجيل العقاري، الحالة نشطة',
            }),
        ).toBeInTheDocument();
    });

    it('يفتح التفاصيل عند النقر على البطاقة', () => {
        const onPress = vi.fn();
        render(<TransactionCard transaction={transaction} onPress={onPress} />);

        fireEvent.click(screen.getByTestId('transactions-card-tx-1'));
        expect(onPress).toHaveBeenCalledWith(transaction);
    });

    it('يثبّت المعاملة دون فتح التفاصيل عند نقر زر التثبيت', () => {
        const onPress = vi.fn();
        render(<TransactionCard transaction={transaction} onPress={onPress} />);

        const pin = screen.getByTestId('workspace-pin-threading-tx-1');
        fireEvent.click(pin);

        expect(onPress).not.toHaveBeenCalled();
        expect(useWorkspaceStore.getState().isPinned('tx-1', 'threading')).toBe(true);
        expect(pin).toHaveAttribute('aria-pressed', 'true');
    });

    it('لا يغلف زر التثبيت داخل button متداخل', () => {
        const { container } = render(<TransactionCard transaction={transaction} onPress={vi.fn()} />);
        const pin = screen.getByTestId('workspace-pin-threading-tx-1');
        expect(pin.tagName).toBe('BUTTON');
        expect(pin.closest('button') === pin).toBe(true);
        expect(container.querySelector('button button')).toBeNull();
    });
});
