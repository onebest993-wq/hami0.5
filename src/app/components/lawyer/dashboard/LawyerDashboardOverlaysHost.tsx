import React from 'react';
import type { LawyerDashboardOverlaysHostProps } from './lawyerDashboardOverlaysHostBundles';
import { LawyerDashboardProductivityOverlays } from './overlay-sections/LawyerDashboardProductivityOverlays';
import { LawyerDashboardCaseOverlays } from './overlay-sections/LawyerDashboardCaseOverlays';
import { LawyerDashboardDiscoveryOverlays } from './overlay-sections/LawyerDashboardDiscoveryOverlays';

export type { LawyerDashboardOverlaysHostProps } from './lawyerDashboardOverlaysHostBundles';

export function LawyerDashboardOverlaysHost(props: LawyerDashboardOverlaysHostProps) {
    return (
        <>
            <LawyerDashboardProductivityOverlays
                shell={props.shell}
                data={props.data}
                overlays={props.overlays}
                notepad={props.notepad}
                nav={props.nav}
                dossier={props.dossier}
                archive={props.archive}
            />
            <LawyerDashboardCaseOverlays
                shell={props.shell}
                data={props.data}
                overlays={props.overlays}
                criminalBridge={props.criminalBridge}
                dossier={props.dossier}
                archive={props.archive}
                newCase={props.newCase}
                executionCreate={props.executionCreate}
                nav={props.nav}
            />
            <LawyerDashboardDiscoveryOverlays
                shell={props.shell}
                data={props.data}
                overlays={props.overlays}
                criminalBridge={props.criminalBridge}
                nav={props.nav}
            />
        </>
    );
}
