import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { AddAppointmentModal, AddDocumentModal } from './contentEntryModals';

describe('content entry modals', () => {
    it('prefills appointment date and submits a valid payload', async () => {
        const onAdd = vi.fn().mockResolvedValue(undefined);
        render(
            <AddAppointmentModal
                isOpen
                onClose={vi.fn()}
                onAdd={onAdd}
            />,
        );

        const purposeInput = screen.getByPlaceholderText('اكتب الغاية من الموعد...');
        fireEvent.change(purposeInput, { target: { value: 'جلسة مرافعة جديدة' } });

        const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement | null;
        expect(dateInput).not.toBeNull();
        expect(dateInput?.value).toBe(getLocalTodayYmd());

        fireEvent.click(screen.getByRole('button', { name: 'حفظ الموعد' }));

        await waitFor(() => {
            expect(onAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'جلسة مرافعة جديدة',
                    purpose: 'جلسة مرافعة جديدة',
                    date: getLocalTodayYmd(),
                }),
            );
        });
    });

    it('passes the actual selected file when saving a document', async () => {
        const onAdd = vi.fn().mockResolvedValue(undefined);
        render(
            <AddDocumentModal
                isOpen
                onClose={vi.fn()}
                onAdd={onAdd}
            />,
        );

        const file = new File(['file-body'], 'memorandum.pdf', { type: 'application/pdf' });
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
        expect(fileInput).not.toBeNull();
        fireEvent.change(fileInput!, { target: { files: [file] } });

        fireEvent.change(screen.getByPlaceholderText('مثال: عريضة، وكالة، وصل...'), {
            target: { value: 'عريضة' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'حفظ المستند' }));

        await waitFor(() => {
            expect(onAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'memorandum',
                    category: 'عريضة',
                    file,
                    fileName: 'memorandum.pdf',
                    fileType: 'application/pdf',
                }),
            );
        });
    });
});
