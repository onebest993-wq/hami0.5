import { applyInabaDelegationFollowupOutcome } from './applyDossierSpecialFollowupOutcome.inaba';
import { applyUnificationFollowupOutcome } from './applyDossierSpecialFollowupOutcome.unification';
import { applyInabaCorrespondenceFollowupOutcome } from './applyDossierSpecialFollowupOutcome.correspondence';
import { applyTransferFollowupOutcome } from './applyDossierSpecialFollowupOutcome.transfer';
import { applyRenewalFollowupOutcome } from './applyDossierSpecialFollowupOutcome.renewal';

export {
    asExecutionFiles,
    parseDecisionPayload,
    type ExecutionFileLike,
} from './applyDossierSpecialFollowupOutcome.helpers';

/** آثار الموافقة/الرفض على طلبات تبويب «التحكم في الإضبارة» */
export function applyDossierSpecialFollowupOutcome(input: {
    executionId: string | undefined;
    row: Record<string, unknown>;
    resolution: 'approved' | 'rejected';
}): void {
    const executionId = String(input.executionId || '').trim();
    const row = input.row;
    const resolution = input.resolution;
    const id = String(row.id || '').trim();
    const title = String(row.title || '').trim();
    const payload = { executionId, row, resolution, id };

    if (title === 'طلب الإنابة التنفيذية') {
        applyInabaDelegationFollowupOutcome(payload);
        return;
    }
    if (title === 'طلب توحيد الأضابير') {
        applyUnificationFollowupOutcome(payload);
        return;
    }
    if (title === 'طلب مخاطبة مديرية الانابة') {
        applyInabaCorrespondenceFollowupOutcome(payload);
        return;
    }
    if (title === 'طلب نقل الإضبارة') {
        applyTransferFollowupOutcome(payload);
        return;
    }
    if (title === 'طلب تجديد الإضبارة') {
        applyRenewalFollowupOutcome(payload);
    }
}
