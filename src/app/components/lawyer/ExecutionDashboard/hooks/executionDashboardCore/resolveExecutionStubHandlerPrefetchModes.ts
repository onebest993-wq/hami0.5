import { prefetchExecutionCoreHandlers } from '../../executionCoreHandlersPrefetch';

export type ExecutionCoreHandlerPrefetchMode =
    | 'light'
    | 'followup-admin-special'
    | 'followup-dossier-controls'
    | 'followup-other-party'
    | 'followup-other-party-debtor'
    | 'followup-other-party-creditor'
    | 'seizure'
    | 'seizure-requests'
    | 'coercive'
    | 'coercive-employee'
    | 'coercive-eviction'
    | 'coercive-lifecycle'
    | 'dossier-support'
    | 'party-death';

/** يحدد جسور lazy التي يجب تسخينها عند ضرب stub — لا يشمل المسارات المقيمة على Core */
export function resolveExecutionStubHandlerPrefetchModes(
    stubPath: string,
): ExecutionCoreHandlerPrefetchMode[] {
    const path = String(stubPath || '');
    const modes = new Set<ExecutionCoreHandlerPrefetchMode>();

    if (
        /seizure|Seizure|followupSeizure|realEstate|thirdParty|movableSeizure|propertySeizure|seizedProperty|seizureRelease|seizureLog|unifiedSeizure|SeizureLog/i.test(
            path,
        )
    ) {
        modes.add('seizure-requests');
    }

    if (
        /coercive|Coercive|publication|summons|employeeAssignment|voluntaryPeriod|gracePeriodEnd|debtorSummons|evictionHeirs|breakInventory|policeAssistance|guarantorFollowup|notifyDebtor|heirsNotification/i.test(
            path,
        )
    ) {
        modes.add('coercive');
        modes.add('coercive-lifecycle');
    }

    if (/partyDeath/i.test(path)) {
        modes.add('party-death');
    }

    if (/runSpecialFollowupSubmit/i.test(path)) {
        modes.add('followup-admin-special');
    }

    if (/handleDossierAction|dossierFollowupHandlers\.handleDossierAction/i.test(path)) {
        modes.add('followup-dossier-controls');
    }

    if (
        /otherPartyTabSubmit|creditorOtherPartyTrack|openOtherPartyAppeals|dossierFollowupHandlers\.otherParty/i.test(
            path,
        )
    ) {
        modes.add('followup-other-party');
    }

    if (/paymentHandlers|notesTasksHandlers|commitDossierNote|appointmentHandler/i.test(path)) {
        modes.add('light');
    }

    if (
        /parentDossierPersistence|dossierMetaWorkflow|pushTimelineEventBinding|dossierLifecycleActions/i.test(
            path,
        )
    ) {
        modes.add('dossier-support');
    }

    return [...modes];
}

export function prefetchExecutionHandlersForStubPath(stubPath: string): void {
    for (const mode of resolveExecutionStubHandlerPrefetchModes(stubPath)) {
        prefetchExecutionCoreHandlers(mode);
    }
}
