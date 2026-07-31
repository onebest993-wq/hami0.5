import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionPartyCardFrame } from '../ExecutionPartyCardFrame';

describe('ExecutionPartyCardFrame', () => {
    it('does not toggle when clicking an interactive child control', () => {
        const onToggle = vi.fn();

        render(
            <ExecutionPartyCardFrame
                variant="debtor"
                roleLabel="المدين"
                isOpen={false}
                onToggle={onToggle}
                expandAriaLabel="توسيع بيانات المدين"
            >
                <button type="button">إجراء داخلي</button>
            </ExecutionPartyCardFrame>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'إجراء داخلي' }));

        expect(onToggle).not.toHaveBeenCalled();
    });
});
