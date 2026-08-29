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

        fireEvent.mouseDown(screen.getByRole('button', { name: 'إجراءات إضافية' }));
        const edit = await screen.findByRole('button', { name: 'تعديل بيانات المدين' });
        fireEvent.click(edit);

        expect(onEditParty).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'تعديل بيانات المدين' })).toBeNull();
    });
});
