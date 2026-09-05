import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PartyCardCollapsedNameSlot } from '../PartyCardCollapsedNameSlot';

describe('PartyCardCollapsedNameSlot', () => {
    it('keeps the name centered while overlaying the actions menu', () => {
        const { container } = render(
            <PartyCardCollapsedNameSlot
                actionsMenu={<button type="button" aria-label="إجراءات إضافية" />}
            >
                <span>ليبليب</span>
            </PartyCardCollapsedNameSlot>,
        );

        expect(screen.getByText('ليبليب')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'إجراءات إضافية' })).toBeTruthy();
        expect(container.firstElementChild?.className).toContain('relative');
        expect(container.querySelector('[data-exec-interactive="true"]')?.className).toContain(
            'absolute',
        );
        expect(container.querySelector('[data-exec-interactive="true"]')?.className).toContain(
            'top-1/2',
        );
        expect(container.querySelector('[data-exec-interactive="true"]')?.className).toContain(
            '-translate-y-1/2',
        );
        expect(container.querySelector('.justify-center')).toBeTruthy();
        expect(container.innerHTML).not.toContain('justify-start');
    });
});
