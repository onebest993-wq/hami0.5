import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExecutionSmartCard from '../ExecutionSmartCard';

const baseFile = {
    id: 'exec-1',
    fileNumber: '501',
    fileYear: '2026',
    directorate: 'مديرية',
    status: 'active',
    debtors: [{ name: 'مدين' }],
    creditors: [{ name: 'دائن' }],
} as const;

describe('ExecutionSmartCard toolbar', () => {
    it('fires archive and trash handlers on click without pointerdown swallowing', () => {
        const onRequestArchive = vi.fn();
        const onRequestMoveToTrash = vi.fn();

        render(
            <ExecutionSmartCard
                file={baseFile}
                variant="active"
                onOpen={vi.fn()}
                onPreview={vi.fn()}
                onRequestArchive={onRequestArchive}
                onRequestMoveToTrash={onRequestMoveToTrash}
            />,
        );

        const tile = screen.getByTestId('execution-archive-card');
        expect(tile).toHaveAttribute('data-execution-id', 'exec-1');
        expect(screen.getByTestId('execution-archive-card-open')).toBeTruthy();
        const archiveBtn = screen.getByTestId('execution-smart-card-archive');
        const trashBtn = screen.getByTestId('execution-smart-card-trash');

        fireEvent.pointerDown(archiveBtn);
        fireEvent.click(archiveBtn);
        expect(onRequestArchive).toHaveBeenCalledTimes(1);

        fireEvent.pointerDown(trashBtn);
        fireEvent.click(trashBtn);
        expect(onRequestMoveToTrash).toHaveBeenCalledTimes(1);
    });

    it('does not open dossier when toolbar buttons are clicked', () => {
        const onOpen = vi.fn();

        render(
            <ExecutionSmartCard
                file={baseFile}
                variant="active"
                onOpen={onOpen}
                onPreview={vi.fn()}
                onRequestArchive={vi.fn()}
                onRequestMoveToTrash={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('execution-smart-card-archive'));
        fireEvent.click(screen.getByTestId('execution-smart-card-trash'));

        expect(onOpen).not.toHaveBeenCalled();
    });
});
