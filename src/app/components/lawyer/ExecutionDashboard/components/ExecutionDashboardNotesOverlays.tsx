import React, { Suspense } from 'react';
import { LazyExecutionNotesAndAppointmentModals } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryOverlays';
import type { ExecutionNotesAndAppointmentModalsProps } from './ExecutionNotesAndAppointmentModals';
import {
    ExecutionAppointmentInstantFrame,
    ExecutionNotesInstantFrame,
} from './executionOverlayInstantPresets';

export type ExecutionDashboardNotesOverlaysProps = ExecutionNotesAndAppointmentModalsProps;

/** ملاحظات/مواعيد — lazy + prefetch عند hover شبكة الأدوات */
export function ExecutionDashboardNotesOverlays(props: ExecutionDashboardNotesOverlaysProps) {
    const { showNotesModal, showAppointmentModal } = props;
    if (!showNotesModal && !showAppointmentModal) return null;

    const fallback = showNotesModal ? (
        <ExecutionNotesInstantFrame onClose={props.onCloseNotesModal} />
    ) : (
        <ExecutionAppointmentInstantFrame onClose={props.onCloseAppointmentModal} />
    );

    return (
        <Suspense fallback={fallback}>
            <LazyExecutionNotesAndAppointmentModals {...props} />
        </Suspense>
    );
}
