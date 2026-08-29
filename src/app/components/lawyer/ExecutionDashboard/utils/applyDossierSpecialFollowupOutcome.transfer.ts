import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { patchExecutionDossierRecord } from '@/app/utils/executionDossierBlobPersistence';
import {
    dispatchToast,
    markDossierSpecialFollowupApplied,
    normalizeBaseDossierIdFromDecisionsKey,
} from './applyDossierSpecialFollowupOutcome.helpers';

export function applyTransferFollowupOutcome(input: {
    executionId: string;
    row: Record<string, unknown>;
    resolution: 'approved' | 'rejected';
    id: string;
}): void {
    const { executionId, row, resolution, id } = input;
    if (resolution !== 'approved') {
        dispatchToast('تم رفض طلب نقل الإضبارة.', 'warning');
        return;
    }
    const store = useExecutionDashboardStore.getState();
    const dossierId =
        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
        String(store.currentFile?.id || '').trim();
    if (!dossierId) {
        dispatchToast('تعذر تنفيذ النقل: لم يتم تحديد الإضبارة.', 'warning');
        return;
    }
    const payloadRaw = String(row.payloadJson || '').trim();
    let targetDirectorate = '';
    if (payloadRaw) {
        try {
            const parsed = JSON.parse(payloadRaw) as Record<string, unknown>;
            if (parsed?.kind === 'transfer') {
                targetDirectorate = String(parsed?.targetDirectorate || '').trim();
            }
        } catch {
            /* ignore */
        }
    }
    if (!targetDirectorate) {
        const bodyRaw = String(row.body || '');
        const m = bodyRaw.match(/الدائرة\s*المراد\s*النقل\s*إليها:\s*(.+)/);
        if (m?.[1]) targetDirectorate = m[1].split('\n')[0]?.trim() || '';
    }
    if (!targetDirectorate) {
        dispatchToast('تعذر تنفيذ النقل: لم يتم تحديد المديرية المراد النقل إليها.', 'warning');
        return;
    }
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const patch: Record<string, unknown> = {
        directorate: targetDirectorate,
        transferPendingFileNumberChange: true,
        dossier_last_action_date: today,
        updatedAt: now,
    };
    const curId = String(store.currentFile?.id || '').trim();
    if (curId && curId === dossierId) {
        store.updateCurrentFile(patch);
    } else {
        patchExecutionDossierRecord(dossierId, patch);
    }
    dispatchToast(
        'تم نقل الإضبارة وتحديث المديرية. يمكنك تغيير رقم الإضبارة من الخيار الظاهر فوق الرقم.',
        'success'
    );
    markDossierSpecialFollowupApplied(executionId, id);
}
