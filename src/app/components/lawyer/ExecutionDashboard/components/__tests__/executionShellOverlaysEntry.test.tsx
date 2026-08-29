import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../executionDashboardShellOverlaysLazy', () => ({
    LazyExecutionDashboardShellOverlays: Object.assign(
        () => {
            throw new Promise<void>(() => undefined);
        },
        { isPreloaded: () => false },
    ),
}));

import { ExecutionShellOverlaysEntry } from '../ExecutionShellOverlaysEntry';

describe('ExecutionShellOverlaysEntry', () => {
    it('does not render when the barrel is closed', () => {
        render(
            <ExecutionShellOverlaysEntry
                open={false}
                showUnifiedExecutionModal={false}
                scope={{}}
                followupSnapshot={{}}
            />,
        );
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('shows a working notes instant while the barrel is cold', () => {
        const onCloseNotesModal = vi.fn();
        render(
            <ExecutionShellOverlaysEntry
                open
                showUnifiedExecutionModal={false}
                scope={{ showNotesModal: true, onCloseNotesModal }}
                followupSnapshot={{}}
            />,
        );
        expect(screen.getByRole('dialog', { name: 'سجل الملاحظات والمهام' })).toBeTruthy();
        fireEvent.click(screen.getByTestId('execution-notes-instant-close'));
        expect(onCloseNotesModal).toHaveBeenCalledTimes(1);
    });
});
