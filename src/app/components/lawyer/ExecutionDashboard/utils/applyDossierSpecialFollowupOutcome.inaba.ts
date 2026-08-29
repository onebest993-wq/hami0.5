import {
    useExecutionDashboardStore,
    INABA_SUB_FILE_ID,
    makeInabaSubFileId,
} from '@/app/stores/executionDashboardStore';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import {
    asExecutionFiles,
    dispatchToast,
    markDossierSpecialFollowupApplied,
    normalizeBaseDossierIdFromDecisionsKey,
    type ExecutionFileLike,
} from './applyDossierSpecialFollowupOutcome.helpers';

export function applyInabaDelegationFollowupOutcome(input: {
    executionId: string;
    row: Record<string, unknown>;
    resolution: 'approved' | 'rejected';
    id: string;
}): void {
    const { executionId, row, resolution, id } = input;
    const storeApi = useExecutionDashboardStore.getState();
    const parentExecutionId =
        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
        String(storeApi.currentFile?.id || '').trim();
    if (resolution === 'rejected') {
        const target = storeApi.subFiles.find(
            (f) =>
                (f.id === makeInabaSubFileId(parentExecutionId) ||
                    (f.id === INABA_SUB_FILE_ID &&
                        String(f.parentFileId || '').trim() === parentExecutionId)) &&
                parentExecutionId.length > 0
        );
        if (target) {
            storeApi.removeSubFile(target.id);
            storeApi.restoreOriginalFile();
            dispatchToast('تم رفض طلب الإنابة التنفيذية وإلغاء الإضبارة الفرعية.', 'warning');
        }
        return;
    }
    if (resolution !== 'approved') return;
    const store = useExecutionDashboardStore.getState();
    const persistedFile = (() => {
        try {
            const all = asExecutionFiles(loadExecutionFilesRaw());
            return all.find((f) => String(f?.id || '').trim() === parentExecutionId) ?? null;
        } catch {
            return null;
        }
    })();
    const file: ExecutionFileLike = persistedFile || store.currentFile || {};
    if (!parentExecutionId) return;
    const ts = new Date().toISOString();
    const bodyRaw = String(row.body || '');
    let targetDirectorate = file.directorate || '';
    const dirMatch = bodyRaw.match(/الدائرة المناب إليها[:\s]+(.+)/);
    if (dirMatch?.[1]) {
        targetDirectorate = dirMatch[1].trim();
    } else {
        const dirFallbackMatch = bodyRaw.match(/إليها[:\s]+(.+)/);
        if (dirFallbackMatch?.[1]) {
            const line = dirFallbackMatch[1].split('\n')[0]?.trim();
            if (line) targetDirectorate = line;
        }
    }
    let delegationPurpose = '';
    const purposeMatch = bodyRaw.match(/الغاية من الإنابة:\s*(.+)/);
    if (purposeMatch?.[1]) delegationPurpose = purposeMatch[1].trim();
    const inabaSubFile: ExecutionFileLike = {
        id: makeInabaSubFileId(parentExecutionId),
        fileNumber: '',
        parentFileId: parentExecutionId,
        directorate: targetDirectorate,
        debtorCourt: file.debtorCourt || '',
        creditors: file.creditors ? [...file.creditors] : [],
        debtors: file.debtors ? [...file.debtors] : [],
        debtAmount: file.debtAmount || 0,
        claimType: file.claimType || '',
        status: 'UNNOTIFIED',
        dossier_lifecycle_status: 'active',
        debtor_summons_marker: null,
        delegationTargetDirectorate: targetDirectorate,
        delegationPurpose,
        decisions: [],
        timelineEvents: [],
        createdAt: ts,
        updatedAt: ts,
    };
    try {
        store.addSubFile(inabaSubFile);
        queueMicrotask(() => {
            try {
                store.swapToSubFile(inabaSubFile);
            } catch {
                /* ignore */
            }
        });
        dispatchToast('تم تفعيل الإنابة التنفيذية. يمكنك التبديل إلى الإضبارة الفرعية.', 'success');
        markDossierSpecialFollowupApplied(executionId, id);
    } catch {
        /* ignore */
    }
}
