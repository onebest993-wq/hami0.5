// @ts-nocheck

import React, { Suspense } from 'react';

import {

    EXEC_OVERLAY_LAZY_FALLBACK,

    LazyExecutionNotesAndAppointmentModals,

} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell';



export type ExecutionDashboardNotesOverlaysProps = Record<string, unknown>;



/** ملاحظات/مواعيد — lazy + prefetch عند hover شبكة الأدوات */

export function ExecutionDashboardNotesOverlays(props: ExecutionDashboardNotesOverlaysProps) {

    const { showNotesModal, showAppointmentModal } = props;

    if (!showNotesModal && !showAppointmentModal) return null;



    return (

        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>

            <LazyExecutionNotesAndAppointmentModals {...props} />

        </Suspense>

    );

}

