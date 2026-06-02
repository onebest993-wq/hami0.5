import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '@/app/components/lawyer/NeuralAlertsCard/types';
import { effectiveCaseNumber } from './extractCaseRefs';
import type { WorkspacePinnedItem, WorkspacePinType } from './types';
import { buildWorkspaceRoute } from './workspaceRoutes';

function targetToPinType(target: SecretaryAlert['target']): WorkspacePinType | null {
    switch (target) {
        case 'lawsuit':
            return 'lawsuit';
        case 'execution':
            return 'execution';
        case 'urgent':
            return 'urgent';
        case 'transactions':
            return 'transaction';
        case 'threading':
            return 'threading';
        case 'notepad':
            return 'notepad';
        case 'schedule':
            return 'task';
        default:
            return null;
    }
}

export function buildPinFromSecretaryAlert(
    source: SecretaryAlert,
    alert: SmartAlert,
): WorkspacePinnedItem | null {
    const type = targetToPinType(source.target);
    const id = source.entityId ? String(source.entityId) : null;
    if (!type || !id) return null;
    return {
        id,
        type,
        title: alert.title,
        clientName: source.clientName ?? '',
        caseNumber: effectiveCaseNumber(alert.caseNo ?? '', alert.title, source.summary),
        routePath: buildWorkspaceRoute(type, id),
    };
}
