import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TransactionsHubDialog } from '@/app/components/lawyer/TransactionsThreading/TransactionsHubDialog';

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

describe('TransactionsHubDialog — تركيز خفيف', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('يغلق بـ Escape ويستعيد التركيز السابق', async () => {
        const onOpenChange = vi.fn();
        const trigger = document.createElement('button');
        trigger.textContent = 'فتح';
        document.body.appendChild(trigger);
        trigger.focus();

        render(
            <TransactionsHubDialog open onOpenChange={onOpenChange} ariaLabel="حوار اختبار" testId="tx-dlg">
                <button type="button">إجراء</button>
            </TransactionsHubDialog>,
        );

        expect(screen.getByTestId('tx-dlg')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('ينقل التركيز إلى عنصر داخل الحوار عند الفتح', async () => {
        render(
            <TransactionsHubDialog open onOpenChange={vi.fn()} ariaLabel="حوار" testId="tx-dlg-focus">
                <button type="button">أول زر</button>
                <button type="button">ثاني زر</button>
            </TransactionsHubDialog>,
        );

        await waitFor(() => {
            expect(document.activeElement?.textContent).toBe('أول زر');
        });
    });
});
