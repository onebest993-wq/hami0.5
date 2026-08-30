import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ArchivePortalConfirmDialog } from '../ArchivePortalConfirmDialog';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/capacitorAppLifecycle';

describe('ArchivePortalConfirmDialog', () => {
    afterEach(() => {
        resetNativeBackHandlersForTests();
    });

    it('Escape يلغي الحوار ولا يتركه مفتوحاً', () => {
        const onCancel = vi.fn();
        render(
            <ArchivePortalConfirmDialog
                open
                title="تأكيد"
                titleId="confirm-title"
                testId="confirm-dialog"
                confirmLabel="تأكيد"
                onCancel={onCancel}
                onConfirm={vi.fn()}
            >
                <p>نص</p>
            </ArchivePortalConfirmDialog>,
        );

        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape', bubbles: true, cancelable: true });
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('زر الرجوع الأصلي يلغي الحوار', () => {
        const onCancel = vi.fn();
        render(
            <ArchivePortalConfirmDialog
                open
                title="تأكيد"
                titleId="confirm-title"
                confirmLabel="تأكيد"
                onCancel={onCancel}
                onConfirm={vi.fn()}
            >
                <p>نص</p>
            </ArchivePortalConfirmDialog>,
        );

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('لا يلغي الحوار من نقرة الخلفية في نفس دورة الفتح', () => {
        const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1_000);
        const onCancel = vi.fn();
        try {
            render(
                <ArchivePortalConfirmDialog
                    open
                    title="تأكيد"
                    titleId="confirm-title"
                    testId="confirm-dialog"
                    confirmLabel="تأكيد"
                    onCancel={onCancel}
                    onConfirm={vi.fn()}
                >
                    <p>نص</p>
                </ArchivePortalConfirmDialog>,
            );

            fireEvent.click(screen.getByRole('presentation'));
            expect(onCancel).not.toHaveBeenCalled();
            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        } finally {
            nowSpy.mockRestore();
        }
    });
});
