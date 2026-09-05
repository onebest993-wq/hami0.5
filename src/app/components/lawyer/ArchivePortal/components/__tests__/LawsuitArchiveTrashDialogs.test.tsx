import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LawsuitArchiveTrashDialogs } from '../LawsuitArchiveTrashDialogs';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/app/workspace/unpinWorkspaceEntity', () => ({
    unpinWorkspaceItem: vi.fn(),
}));

vi.mock('@/app/runtime/lawsuitVaultCommitHold', () => ({
    beginLawsuitVaultCommitHold: vi.fn(),
    endLawsuitVaultCommitHold: vi.fn(),
}));

vi.mock('@/app/runtime/lawsuitLifecycleE2eProbe', () => ({
    recordLawsuitLifecycleE2e: vi.fn(),
}));

vi.mock('@/app/runtime/nativeBackStack', () => ({
    registerNativeBackHandler: () => () => undefined,
}));

import { SmartToast } from '@/app/components/ui/SmartToast';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';

describe('LawsuitArchiveTrashDialogs — confirm move', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('closes after move returns true and unpins', async () => {
        const move = vi.fn(async () => true);
        const setTarget = vi.fn();
        render(
            <LawsuitArchiveTrashDialogs
                lawsuitTrashConfirmTarget={{ id: 'f1', caseNo: '1/2026' }}
                setLawsuitTrashConfirmTarget={setTarget}
                criminalDeleteTarget={null}
                setCriminalDeleteTarget={vi.fn()}
                permanentDeleteOpen={false}
                setPermanentDeleteOpen={vi.fn()}
                confirmPermanentDelete={vi.fn()}
                permanentIdsRef={{ current: [] }}
                onMoveLawsuitToTrash={move}
            />,
        );

        fireEvent.click(screen.getByTestId('lawsuit-trash-confirm-submit'));

        await waitFor(() => {
            expect(move).toHaveBeenCalledWith('f1');
            expect(setTarget).toHaveBeenCalledWith(null);
            expect(unpinWorkspaceItem).toHaveBeenCalledWith('f1', 'lawsuit');
        });
    });

    it('stays open with fail feedback when move returns false', async () => {
        const move = vi.fn(async () => false);
        const setTarget = vi.fn();
        render(
            <LawsuitArchiveTrashDialogs
                lawsuitTrashConfirmTarget={{ id: 'f2', caseNo: '2/2026' }}
                setLawsuitTrashConfirmTarget={setTarget}
                criminalDeleteTarget={null}
                setCriminalDeleteTarget={vi.fn()}
                permanentDeleteOpen={false}
                setPermanentDeleteOpen={vi.fn()}
                confirmPermanentDelete={vi.fn()}
                permanentIdsRef={{ current: [] }}
                onMoveLawsuitToTrash={move}
            />,
        );

        fireEvent.click(screen.getByTestId('lawsuit-trash-confirm-submit'));

        await waitFor(() => {
            expect(move).toHaveBeenCalledWith('f2');
            expect(SmartToast.error).toHaveBeenCalled();
            expect(
                screen.getByTestId('lawsuit-trash-confirm-dialog').getAttribute('data-lifecycle-commit'),
            ).toBe('fail');
        });
        expect(setTarget).not.toHaveBeenCalledWith(null);
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(screen.getByTestId('lawsuit-trash-confirm-submit').textContent).toContain(
            'إعادة المحاولة',
        );
    });
});
