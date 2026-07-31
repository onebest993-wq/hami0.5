import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell', () => ({
    EXEC_OVERLAY_LAZY_FALLBACK: <div>lazy fallback</div>,
    LazyDossierMetaEditSection: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={() =>
                (props.setShowEditDossierMetaModal as ((open: boolean) => void) | undefined)?.(
                    false,
                )
            }
        >
            close dossier meta
        </button>
    ),
    LazyPartyEditModal: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={() =>
                (props.setEditPartyTarget as ((target: unknown | null) => void) | undefined)?.(
                    null,
                )
            }
        >
            close party edit
        </button>
    ),
    LazyExecutionHeirsQuickViewModal: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={() =>
                (props.setHeirsQuickView as ((view: unknown | null) => void) | undefined)?.(null)
            }
        >
            close heirs quick view
        </button>
    ),
    LazyExecutionTrashModal: (props: Record<string, unknown>) => (
        <button type="button" onClick={props.onClose as (() => void) | undefined}>
            close trash
        </button>
    ),
    LazyPermanentDeleteConfirmDialog: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={() =>
                (props.setPermanentDeleteTimelineId as ((id: string | null) => void) | undefined)?.(
                    null,
                )
            }
        >
            close permanent delete
        </button>
    ),
    LazyTimelineEditModal: (props: Record<string, unknown>) => (
        <button type="button" onClick={props.onClose as (() => void) | undefined}>
            close timeline edit
        </button>
    ),
}));

import { ExecutionDashboardEditOverlays } from '../ExecutionDashboardEditOverlays';

function createBaseProps(overrides: Record<string, unknown> = {}) {
    return {
        showExecutionTrashModal: false,
        trashedTimelineEvents: [],
        trashedCaseNotes: [],
        trashedCaseTasks: [],
        setShowExecutionTrashModal: vi.fn(),
        restoreTimelineEventFromTrash: vi.fn(),
        setPermanentDeleteTimelineId: vi.fn(),
        restoreCaseNoteFromTrash: vi.fn(),
        permanentlyDeleteCaseNote: vi.fn(),
        restoreCaseTaskFromTrash: vi.fn(),
        permanentlyDeleteCaseTask: vi.fn(),
        timelineEditDraft: null,
        setTimelineEditDraft: vi.fn(),
        saveTimelineEditDraft: vi.fn(),
        moveTimelineEventToTrash: vi.fn(),
        showEditDossierMetaModal: false,
        dossierMetaDraft: {},
        isEvictionExecutionModule: false,
        setShowEditDossierMetaModal: vi.fn(),
        setDossierMetaDraft: vi.fn(),
        saveDossierMetaDraft: vi.fn(),
        editPartyTarget: null,
        setEditPartyTarget: vi.fn(),
        partyEditDraft: {},
        setPartyEditDraft: vi.fn(),
        partyEditHeirDeleteConfirmIdx: null,
        setPartyEditHeirDeleteConfirmIdx: vi.fn(),
        savePartyEditDraft: vi.fn(),
        togglePartyEditHeirClient: vi.fn(),
        removeHeirFromPartyEditDraftAtIndex: vi.fn(),
        decisionsStorageExecutionId: 'ex-1',
        heirsQuickView: null,
        setHeirsQuickView: vi.fn(),
        X: () => null,
        permanentDeleteTimelineId: null,
        permanentlyDeleteTimelineEvent: vi.fn(),
        onCloseExecutionTrashModal: vi.fn(),
        onCloseTimelineEditModal: vi.fn(),
        onCloseEditDossierMetaModal: vi.fn(),
        onCloseEditPartyModal: vi.fn(),
        onCloseHeirsQuickViewModal: vi.fn(),
        onClosePermanentDeleteTimelineConfirm: vi.fn(),
        ...overrides,
    };
}

describe('ExecutionDashboardEditOverlays', () => {
    it('does not render when all edit overlays are closed', () => {
        render(<ExecutionDashboardEditOverlays {...createBaseProps()} />);

        expect(screen.queryByRole('button', { name: 'close trash' })).toBeNull();
    });

    it('uses explicit close callbacks across edit overlay modals', () => {
        const onCloseExecutionTrashModal = vi.fn();
        const onCloseTimelineEditModal = vi.fn();
        const onCloseEditDossierMetaModal = vi.fn();
        const onCloseEditPartyModal = vi.fn();
        const onCloseHeirsQuickViewModal = vi.fn();
        const onClosePermanentDeleteTimelineConfirm = vi.fn();

        render(
            <ExecutionDashboardEditOverlays
                {...createBaseProps({
                    showExecutionTrashModal: true,
                    timelineEditDraft: { id: 't-1' },
                    showEditDossierMetaModal: true,
                    editPartyTarget: { id: 'p-1' },
                    heirsQuickView: { id: 'h-1' },
                    permanentDeleteTimelineId: 't-1',
                    onCloseExecutionTrashModal,
                    onCloseTimelineEditModal,
                    onCloseEditDossierMetaModal,
                    onCloseEditPartyModal,
                    onCloseHeirsQuickViewModal,
                    onClosePermanentDeleteTimelineConfirm,
                })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'close trash' }));
        fireEvent.click(screen.getByRole('button', { name: 'close timeline edit' }));
        fireEvent.click(screen.getByRole('button', { name: 'close dossier meta' }));
        fireEvent.click(screen.getByRole('button', { name: 'close party edit' }));
        fireEvent.click(screen.getByRole('button', { name: 'close heirs quick view' }));
        fireEvent.click(screen.getByRole('button', { name: 'close permanent delete' }));

        expect(onCloseExecutionTrashModal).toHaveBeenCalledTimes(1);
        expect(onCloseTimelineEditModal).toHaveBeenCalledTimes(1);
        expect(onCloseEditDossierMetaModal).toHaveBeenCalledTimes(1);
        expect(onCloseEditPartyModal).toHaveBeenCalledTimes(1);
        expect(onCloseHeirsQuickViewModal).toHaveBeenCalledTimes(1);
        expect(onClosePermanentDeleteTimelineConfirm).toHaveBeenCalledTimes(1);
    });
});
