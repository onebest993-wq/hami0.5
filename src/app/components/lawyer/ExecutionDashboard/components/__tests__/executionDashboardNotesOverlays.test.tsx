import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const lazyNotesAndAppointmentModalProps = vi.fn();

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell', () => ({
    EXEC_OVERLAY_LAZY_FALLBACK: <div>lazy fallback</div>,
    LazyExecutionNotesAndAppointmentModals: (props: Record<string, unknown>) => {
        lazyNotesAndAppointmentModalProps(props);
        return (
            <div>
                <button
                    type="button"
                    onClick={props.onCloseNotesModal as (() => void) | undefined}
                >
                    close notes
                </button>
                <button
                    type="button"
                    onClick={props.onCloseAppointmentModal as (() => void) | undefined}
                >
                    close appointment
                </button>
            </div>
        );
    },
}));

import { ExecutionDashboardNotesOverlays } from '../ExecutionDashboardNotesOverlays';

function createBaseProps(overrides: Record<string, unknown> = {}) {
    return {
        showNotesModal: false,
        showAppointmentModal: false,
        setShowNotesModal: vi.fn(),
        setShowAppointmentModal: vi.fn(),
        onCloseNotesModal: vi.fn(),
        onCloseAppointmentModal: vi.fn(),
        savedNotesSplit: { notes: [], doneTasks: [] },
        caseTasksPending: [],
        timelineEvents: [],
        noteTitle: '',
        setNoteTitle: vi.fn(),
        noteBody: '',
        setNoteBody: vi.fn(),
        isTask: false,
        setIsTask: vi.fn(),
        taskDueDate: '',
        setTaskDueDate: vi.fn(),
        taskStatus: 'pending',
        setTaskStatus: vi.fn(),
        editingTaskId: null,
        setEditingTaskId: vi.fn(),
        savedNotesView: 'notes',
        setSavedNotesView: vi.fn(),
        editingAppointmentId: null,
        setEditingAppointmentId: vi.fn(),
        appointmentPurpose: '',
        setAppointmentPurpose: vi.fn(),
        appointmentDateOnly: '',
        setAppointmentDateOnly: vi.fn(),
        appointmentTimeOptional: '',
        setAppointmentTimeOptional: vi.fn(),
        moveCaseNoteToTrash: vi.fn(),
        toggleCaseNotePin: vi.fn(),
        toggleCaseTaskPin: vi.fn(),
        commitDossierNote: vi.fn(),
        handleSaveAppointment: vi.fn(),
        moveTimelineEventToTrash: vi.fn(),
        handleSaveTask: vi.fn(),
        handleUpdateTask: vi.fn(),
        handleDeleteTask: vi.fn(),
        handleCompleteTask: vi.fn(),
        handleAddTimelineEvent: vi.fn(),
        ...overrides,
    };
}

describe('ExecutionDashboardNotesOverlays', () => {
    it('does not render when notes and appointment modals are both closed', () => {
        render(<ExecutionDashboardNotesOverlays {...createBaseProps()} />);

        expect(screen.queryByRole('button', { name: 'close notes' })).toBeNull();
        expect(lazyNotesAndAppointmentModalProps).not.toHaveBeenCalled();
    });

    it('uses explicit close callbacks for notes and appointment modals', () => {
        const onCloseNotesModal = vi.fn();
        const onCloseAppointmentModal = vi.fn();

        render(
            <ExecutionDashboardNotesOverlays
                {...createBaseProps({
                    showNotesModal: true,
                    showAppointmentModal: true,
                    onCloseNotesModal,
                    onCloseAppointmentModal,
                })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'close notes' }));
        fireEvent.click(screen.getByRole('button', { name: 'close appointment' }));

        expect(onCloseNotesModal).toHaveBeenCalledTimes(1);
        expect(onCloseAppointmentModal).toHaveBeenCalledTimes(1);
    });
});
