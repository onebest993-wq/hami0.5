import React from 'react';
import { ExecutionNotesAndAppointmentModalsReady } from './ExecutionNotesAndAppointmentModalsReady';

export type { ExecutionNotesAndAppointmentModalsProps } from './ExecutionNotesAndAppointmentModals.types';
export type { NotesModalTypeSurface } from './ExecutionNotesAndAppointmentModalsReady';
import type { ExecutionNotesAndAppointmentModalsProps } from './ExecutionNotesAndAppointmentModals.types';

export const ExecutionNotesAndAppointmentModals: React.FC<
    ExecutionNotesAndAppointmentModalsProps
> = (props) => <ExecutionNotesAndAppointmentModalsReady {...props} />;
