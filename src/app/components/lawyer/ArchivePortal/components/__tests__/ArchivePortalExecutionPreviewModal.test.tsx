import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ArchivePortalExecutionPreviewModal } from '../ArchivePortalExecutionPreviewModal';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/capacitorAppLifecycle';
import type { LooseArchiveFile } from '../../types';

const file = {
    id: 'exec-preview-1',
    fileNumber: '501',
    fileYear: '2026',
    directorate: 'مديرية',
    status: 'active',
    debtors: [{ name: 'مدين' }],
    creditors: [{ name: 'دائن' }],
} as LooseArchiveFile;

describe('ArchivePortalExecutionPreviewModal', () => {
    afterEach(() => {
        resetNativeBackHandlersForTests();
    });

    it('Escape يغلق المعاينة ولا يتركها مفتوحة', () => {
        const onClose = vi.fn();
        render(
            <ArchivePortalExecutionPreviewModal
                file={file}
                onClose={onClose}
                onOpenFull={vi.fn()}
            />,
        );

        expect(screen.getByTestId('execution-archive-preview-dialog')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape', bubbles: true, cancelable: true });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('زر الرجوع الأصلي يغلق المعاينة', () => {
        const onClose = vi.fn();
        render(
            <ArchivePortalExecutionPreviewModal
                file={file}
                onClose={onClose}
                onOpenFull={vi.fn()}
            />,
        );

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('لا يغلق المعاينة من نقرة الخلفية في نفس دورة الفتح', () => {
        const onClose = vi.fn();
        render(
            <ArchivePortalExecutionPreviewModal
                file={file}
                onClose={onClose}
                onOpenFull={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('presentation'));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByTestId('execution-archive-preview-dialog')).toBeInTheDocument();
    });
});
