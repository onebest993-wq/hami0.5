import React from 'react';
import { VisitationLauncherCard } from './VisitationLauncherCard';
import { VisitationWorkspaceBody } from './VisitationWorkspaceBody';
import { VisitationWorkspaceSheet } from './VisitationWorkspaceSheet';
import type { VisitationScheduleModuleProps } from './visitationScheduleModuleTypes';
import { useVisitationScheduleModuleState } from './useVisitationScheduleModuleState';

export const VisitationScheduleModule: React.FC<VisitationScheduleModuleProps> = (props) => {
    const state = useVisitationScheduleModuleState(props);

    return (
        <>
            <VisitationLauncherCard
                ready={state.ready}
                visitChildNames={state.visitChildNames}
                scheduledCount={state.scheduledCount}
                documentedCount={state.documentedCount}
                scheduleHint={state.scheduleHint}
                onOpen={state.openWorkspace}
            />

            <VisitationWorkspaceSheet
                open={state.workspaceOpen}
                onClose={state.requestCloseWorkspace}
                ready={state.ready}
                activeTab={state.workspaceTab}
                onTabChange={state.setWorkspaceTab}
            >
                <VisitationWorkspaceBody {...state} />
            </VisitationWorkspaceSheet>

            {state.sectionConfirmDialog}
        </>
    );
};
