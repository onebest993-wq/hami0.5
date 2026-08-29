import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { patchExecutionDossierRecord } from '@/app/utils/executionDossierBlobPersistence';
import {
    dispatchToast,
    markDossierSpecialFollowupApplied,
    normalizeBaseDossierIdFromDecisionsKey,
} from './applyDossierSpecialFollowupOutcome.helpers';

export function applyRenewalFollowupOutcome(input: {
    executionId: string;
    row: Record<string, unknown>;
    resolution: 'approved' | 'rejected';
    id: string;
}): void {
    const { executionId, resolution, id } = input;
    if (resolution !== 'approved') {
        dispatchToast('تم رفض طلب تجديد الإضبارة.', 'warning');
        return;
    }
    const store = useExecutionDashboardStore.getState();
    const dossierId =
        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
        String(store.currentFile?.id || '').trim();
    if (!dossierId) {
        dispatchToast('تعذر تنفيذ التجديد: لم يتم تحديد الإضبارة.', 'warning');
        return;
    }
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const patch: Record<string, unknown> = {
        dossier_lifecycle_status: 'active',
        dossier_status_reason: 'مجدد',
        dossier_status_date: today,
        dossier_last_action_date: today,
        executionPaused: false,
        stay_of_execution: null,
        updatedAt: now,
    };
    const curId = String(store.currentFile?.id || '').trim();
    if (curId && curId === dossierId) {
        store.updateCurrentFile(patch);
    } else {
        patchExecutionDossierRecord(dossierId, patch);
    }
    dispatchToast('تم تجديد الإضبارة وإرجاع حالتها إلى نشطة.', 'success');
    markDossierSpecialFollowupApplied(executionId, id);
}
