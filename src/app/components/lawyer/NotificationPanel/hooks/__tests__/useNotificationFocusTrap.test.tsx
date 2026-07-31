import React, { useRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SmartDialogContainer } from '@/app/components/ui/SmartDialogContainer';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { useNotificationFocusTrap } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationFocusTrap';

function Harness() {
    const panelRef = useRef<HTMLDivElement>(null);
    const { onKeyDownCapture } = useNotificationFocusTrap(true, panelRef, () => undefined);

    return (
        <>
            <div ref={panelRef} onKeyDownCapture={onKeyDownCapture}>
                <button type="button">إغلاق</button>
            </div>
            <SmartDialogContainer />
        </>
    );
}

describe('useNotificationFocusTrap', () => {
    it('يسمح بالتركيز والكتابة داخل SmartDialog prompt portal', async () => {
        render(<Harness />);

        let promptPromise: Promise<string | null>;
        await act(async () => {
            promptPromise = SmartDialog.prompt('أدخل رقم هاتف الموكل', '', {
                title: 'مراسلة الموكل',
                confirmText: 'إرسال',
            });
        });

        const input = await screen.findByRole('textbox');
        await act(async () => {
            input.focus();
        });
        await waitFor(() => expect(document.activeElement).toBe(input));

        await act(async () => {
            fireEvent.change(input, { target: { value: '+9647800000000' } });
        });
        expect(input).toHaveValue('+9647800000000');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
        });

        await expect(promptPromise).resolves.toBe('+9647800000000');
    });
});
