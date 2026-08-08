import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { useExecutionSectionConfirm } from '../useExecutionSectionConfirm';

function ConfirmProbe() {
    const { confirm, dialog } = useExecutionSectionConfirm();
    const [result, setResult] = useState<string>('pending');

    return (
        <>
            {dialog}
            <button
                type="button"
                onClick={async () => {
                    const ok = await confirm('هل تريد المتابعة؟');
                    setResult(ok ? 'yes' : 'no');
                }}
            >
                ask
            </button>
            <span data-testid="result">{result}</span>
        </>
    );
}

describe('useExecutionSectionConfirm', () => {
    it('resolves true when user confirms', async () => {
        render(<ConfirmProbe />);
        fireEvent.click(screen.getByRole('button', { name: 'ask' }));
        fireEvent.click(await screen.findByRole('button', { name: 'تأكيد' }));
        await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('yes'));
    });

    it('resolves false when user cancels', async () => {
        render(<ConfirmProbe />);
        fireEvent.click(screen.getByRole('button', { name: 'ask' }));
        fireEvent.click(await screen.findByRole('button', { name: 'إلغاء' }));
        await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('no'));
    });
});
