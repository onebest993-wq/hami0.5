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
    | 'seizure-log'
    | 'coercive'
    | 'coercive-employee'
    | 'coercive-eviction'
    | 'coercive-lifecycle'
    | 'dossier-support';

/** يحدد جسور lazy التي يجب تسخينها عند ضرب stub — لا يشمل المسارات المقيمة على Core */
export function resolveExecutionStubHandlerPrefetchModes(
    stubPath: string,
): ExecutionCoreHandlerPrefetchMode[] {
    const path = String(stubPath || '');
    const modes = new Set<ExecutionCoreHandlerPrefetchMode>();

    if (
        /seizure|Seizure|followupSeizure|realEstate|thirdParty|movableSeizure|propertySeizure|seizedProperty/i.test(
            path,
        )
    ) {
        modes.add('seizure-requests');
    }

    if (/seizureLog|unifiedSeizure|SeizureLog|seizureRelease/i.test(path)) {
        modes.add('seizure-log');
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
        modes.add('coercive');
    }

    return [...modes];
}

export function prefetchExecutionHandlersForStubPath(stubPath: string): void {
    for (const mode of resolveExecutionStubHandlerPrefetchModes(stubPath)) {
        prefetchExecutionCoreHandlers(mode);
    }
}
