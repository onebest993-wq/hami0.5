/**
 * سياسة تسخين جسور المعالجات عند الطلاء — متوافقة مع executionHandlerClusterGate.
 *
 * فتح الإضبارة لا يُحمّل جسور المحضر/السجل/الدعم؛ تلك تُسخَّن عند نية التبويب أو ضغط stub.
 */
import { prefetchExecutionCoreHandlers } from '../../executionCoreHandlersPrefetch';

export function prefetchExecutionHandlersForOpenDossier(input: {
    isEvictionExecutionModule: boolean;
}): void {
    prefetchExecutionCoreHandlers('seizure-requests');
    if (!input.isEvictionExecutionModule) return;
    prefetchExecutionCoreHandlers('coercive');
    prefetchExecutionCoreHandlers('coercive-eviction');
    prefetchExecutionCoreHandlers('coercive-lifecycle');
}

export function prefetchExecutionHandlersForOpenFollowup(input: {
    isRepresentingDebtor: boolean;
    isEvictionExecutionModule: boolean;
    unifiedModalTab: string | undefined;
}): void {
    const tab = String(input.unifiedModalTab || '').trim();
    if (!tab || tab === 'seizure_requests' || tab === 'financial' || tab === 'admin') {
        prefetchExecutionCoreHandlers('seizure-requests');
    }
    if (tab === 'admin' || tab === 'special') {
        prefetchExecutionCoreHandlers('followup-admin-special');
    }
    if (tab === 'dossier_controls') {
        prefetchExecutionCoreHandlers('followup-dossier-controls');
    }
    if (tab === 'other_party') {
        prefetchExecutionCoreHandlers(
            input.isRepresentingDebtor ? 'followup-other-party-debtor' : 'followup-other-party-creditor',
        );
    }
    if (tab === 'coercive' || tab === 'personal' || input.isEvictionExecutionModule) {
        prefetchExecutionCoreHandlers('coercive');
        if (input.isEvictionExecutionModule) {
            prefetchExecutionCoreHandlers('coercive-eviction');
            prefetchExecutionCoreHandlers('coercive-lifecycle');
        }
    }
    if (tab === 'coercive' || tab === 'personal') {
        prefetchExecutionCoreHandlers('coercive-employee');
    }
}
