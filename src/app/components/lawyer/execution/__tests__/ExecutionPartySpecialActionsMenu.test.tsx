import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionPartySpecialActionsMenu } from '../ExecutionPartySpecialActionsMenu';

describe('ExecutionPartySpecialActionsMenu', () => {
    it('opens from the trigger click and fires the edit action once', async () => {
        const onEditParty = vi.fn();

        render(
            <ExecutionPartySpecialActionsMenu
                variant="debtor"
                editPartyLabel="تعديل بيانات المدين"
                onEditParty={onEditParty}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'إجراءات إضافية' }));
        const edit = await screen.findByRole('button', { name: 'تعديل بيانات المدين' });
        fireEvent.click(edit);

        expect(onEditParty).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'تعديل بيانات المدين' })).toBeNull();
    });

    it('keeps heir-substitution menu items at a 44px touch target', async () => {
        const onReportDebtorDeath = vi.fn();
        render(
            <ExecutionPartySpecialActionsMenu
                variant="debtor"
                debtorDeathEntryLabel="طلب إحلال ورثة محل المدين المتوفي"
                onReportDebtorDeath={onReportDebtorDeath}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'إجراءات إضافية' }));
        const item = await screen.findByRole('button', {
            name: 'طلب إحلال ورثة محل المدين المتوفي',
        });
        expect(item.className).toMatch(/min-h-\[44px\]/);
        fireEvent.click(item);
        expect(onReportDebtorDeath).toHaveBeenCalledTimes(1);
    });

    it('offers add-custom-signal and commits a trimmed label', async () => {
        const onAddCustomSignal = vi.fn();
        render(
            <ExecutionPartySpecialActionsMenu
                variant="debtor"
                onReportDebtorDeath={() => {}}
                onAddCustomSignal={onAddCustomSignal}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'إجراءات إضافية' }));
        fireEvent.click(await screen.findByTestId('party-add-custom-signal'));
        const input = await screen.findByPlaceholderText('مثال: مراجعة غداً');
        fireEvent.change(input, { target: { value: '  إشارة اختبار  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'إضافة' }));

        expect(onAddCustomSignal).toHaveBeenCalledTimes(1);
        expect(onAddCustomSignal).toHaveBeenCalledWith('إشارة اختبار');
    });
});
