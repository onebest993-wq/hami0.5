import type { ExecutionFile } from '@/app/types/execution';
import {
    useExecutionDashboardStore,
    INABA_SUB_FILE_ID,
    makeInabaSubFileId,
    isInabaSubFileId,
} from '@/app/stores/executionDashboardStore';
import { loadExecutionFilesRaw, saveExecutionFilesRaw, EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { storageCache } from '@/app/utils/storageCache';
import { updateInabaLogEntryByDecisionId } from '@/app/components/lawyer/ExecutionDashboard/utils/inabaCorrespondenceLog';
import { newEventId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';

function normalizeBaseDossierIdFromDecisionsKey(rawKey: string | undefined): string {
    const key = String(rawKey || '').trim();
    if (!key) return '';
    const childIdx = key.indexOf('__child__');
    const subIdx = key.indexOf('__sub__');
    const idx =
        childIdx >= 0 && subIdx >= 0 ? Math.min(childIdx, subIdx) : childIdx >= 0 ? childIdx : subIdx;
    const base = (idx >= 0 ? key.slice(0, idx) : key).trim();
    if (!base || base === 'default' || base === 'undefined' || base === 'null') return '';
    return base;
}

function dispatchToast(msg: string, type: 'success' | 'warning' | 'info' = 'success') {
    try {
        window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message: msg, type } }));
    } catch {
        /* ignore */
    }
}

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

    if (title === 'طلب الإنابة التنفيذية') {
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
        } else if (resolution === 'approved') {
            const store = useExecutionDashboardStore.getState();
            const persistedFile = (() => {
                try {
                    const all = loadExecutionFilesRaw() as any[];
                    return all.find((f: any) => String(f?.id || '').trim() === parentExecutionId) as any;
                } catch {
                    return null;
                }
            })();
            const file = persistedFile || (store.currentFile as any) || {};
            if (parentExecutionId) {
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
                const inabaSubFile: any = {
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
                } catch {
                    /* ignore */
                }
            }
        }
        return;
    }

    if (title === 'طلب توحيد الأضابير') {
        if (resolution !== 'approved') {
            dispatchToast('تم رفض طلب توحيد الأضابير.', 'warning');
            return;
        }
        const store = useExecutionDashboardStore.getState();
        const parentExecutionId =
            normalizeBaseDossierIdFromDecisionsKey(executionId) ||
            String(store.currentFile?.id || '').trim();
        const payloadRaw = String((row as any)?.payloadJson || '').trim();
        if (!parentExecutionId) {
            dispatchToast('تعذر تنفيذ التوحيد: لم يتم تحديد الإضبارة الأصلية.', 'warning');
            return;
        }
        if (!payloadRaw) {
            dispatchToast('طلب توحيد قديم بدون بيانات منظمة — يرجى إعادة إرسال الطلب.', 'warning');
            return;
        }
        try {
            const parsed = JSON.parse(payloadRaw) as any;
            if (parsed?.kind !== 'unification') {
                dispatchToast('تعذر تنفيذ التوحيد: صيغة الطلب غير مدعومة.', 'warning');
                return;
            }
            const targetType = String(parsed?.targetType || '').trim();
            if (targetType === 'colleague') {
                dispatchToast('ربط إضبارة الزميل عبر التوحيد لم يعد متاحاً.', 'warning');
                return;
            }
            if (targetType === 'own') {
                const targetId = String(parsed?.targetId || '').trim();
                if (!targetId) {
                    dispatchToast('تعذر تنفيذ التوحيد: لم يتم تحديد معرف الإضبارة.', 'warning');
                    return;
                }
                if (targetId === parentExecutionId) {
                    dispatchToast('تعذر تنفيذ التوحيد: لا يمكن توحيد الإضبارة مع نفسها.', 'warning');
                    return;
                }
                store.setParentIdForDossier(targetId, parentExecutionId);
                try {
                    const all = loadExecutionFilesRaw() as any[];
                    const base = all.find((f: any) => String(f?.id || '').trim() === parentExecutionId) as
                        | ExecutionFile
                        | undefined;
                    const unified = all.find((f: any) => String(f?.id || '').trim() === targetId) as
                        | ExecutionFile
                        | undefined;
                    const baseNo = String(base?.fileNumber || '').trim() || parentExecutionId;
                    const unifiedNo = String(unified?.fileNumber || '').trim() || targetId;
                    const ts = new Date().toISOString();
                    const ymd = ts.slice(0, 10);
                    const alreadyBase =
                        Array.isArray((base as any)?.timelineEvents) &&
                        (base as any).timelineEvents.some(
                            (e: any) => String(e?.metadata?.decisionRowId || '') === id
                        );
                    const alreadyUnified =
                        Array.isArray((unified as any)?.timelineEvents) &&
                        (unified as any).timelineEvents.some(
                            (e: any) => String(e?.metadata?.decisionRowId || '') === id
                        );
                    if (!alreadyBase) {
                        store.appendTimelineEventToFile(parentExecutionId, {
                            id: newEventId(),
                            type: 'decision',
                            title: `تم توحيد الإضبارة رقم ${unifiedNo} مع هذه الإضبارة`,
                            description: `بتاريخ ${ymd}:\n\nتم قبول طلب التوحيد من قبل المنفذ، وتم ربط الإضبارة رقم ${unifiedNo} بهذه الإضبارة.`,
                            date: ymd,
                            timestamp: ts,
                            source: 'القرارات والطعون',
                            metadata: {
                                decisionRowId: id,
                                timelineThreadKey: `executor_decision:${id}`,
                                unifiedDossierId: targetId,
                            },
                        } as any);
                    }
                    if (!alreadyUnified) {
                        store.appendTimelineEventToFile(targetId, {
                            id: newEventId(),
                            type: 'decision',
                            title: `تم توحيد هذه الإضبارة لتصبح تابعة للإضبارة رقم ${baseNo}`,
                            description: `بتاريخ ${ymd}:\n\nتم قبول طلب التوحيد من قبل المنفذ، وأصبحت هذه الإضبارة مرتبطة بالإضبارة رقم ${baseNo}.`,
                            date: ymd,
                            timestamp: ts,
                            source: 'القرارات والطعون',
                            metadata: {
                                decisionRowId: id,
                                timelineThreadKey: `executor_decision:${id}`,
                                baseDossierId: parentExecutionId,
                            },
                        } as any);
                    }
                } catch {
                    /* ignore */
                }
                dispatchToast('تم توحيد الإضبارة تلقائياً بعد موافقة المنفذ.', 'success');
            } else {
                dispatchToast('تعذر تنفيذ التوحيد: نوع الربط غير معروف.', 'warning');
            }
        } catch {
            dispatchToast('تعذر قراءة بيانات طلب التوحيد. يرجى إعادة إرسال الطلب.', 'warning');
        }
        return;
    }

    if (title === 'طلب مخاطبة مديرية الانابة') {
        const parentForLog =
            normalizeBaseDossierIdFromDecisionsKey(executionId) ||
            String(useExecutionDashboardStore.getState().currentFile?.id || '').trim();
        if (resolution !== 'approved') {
            if (parentForLog) {
                updateInabaLogEntryByDecisionId(parentForLog, id, { status: 'rejected' });
            }
            dispatchToast('تم رفض طلب مخاطبة مديرية الانابة.', 'warning');
            return;
        }
        const store = useExecutionDashboardStore.getState();
        const parentExecutionId =
            normalizeBaseDossierIdFromDecisionsKey(executionId) ||
            String(store.currentFile?.id || '').trim();
        const payloadRaw = String((row as any)?.payloadJson || '').trim();
        if (!parentExecutionId) {
            dispatchToast('تعذر تنفيذ الطلب: لم يتم تحديد الإضبارة الأم.', 'warning');
            return;
        }
        if (!payloadRaw) {
            dispatchToast('طلب مخاطبة قديم بدون بيانات منظمة — يرجى إعادة إرسال الطلب.', 'warning');
            return;
        }
        try {
            const parsed = JSON.parse(payloadRaw) as any;
            if (parsed?.kind !== 'inaba_correspondence') {
                dispatchToast('تعذر تنفيذ الطلب: صيغة الطلب غير مدعومة.', 'warning');
                return;
            }
            const inabaSubFileId = String(parsed?.inabaSubFileId || '').trim();
            const directorate = String(parsed?.directorate || '').trim();
            const subject = String(parsed?.subject || '').trim();
            if (!subject) {
                dispatchToast('تعذر تنفيذ الطلب: موضوع المخاطبة مفقود.', 'warning');
                return;
            }
            const mkId = () => `tl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const ts = new Date().toISOString();
            const ymd = ts.slice(0, 10);
            const resolvedInabaId =
                inabaSubFileId ||
                store.subFiles.find(
                    (sf) =>
                        String(sf.parentFileId || '') === parentExecutionId &&
                        isInabaSubFileId(sf.id) &&
                        String((sf as any).delegationTargetDirectorate || sf.directorate || '').trim() ===
                            directorate
                )?.id ||
                '';
            if (!resolvedInabaId) {
                dispatchToast('تعذر تنفيذ الطلب: لم يتم العثور على الإضبارة الفرعية المستهدفة.', 'warning');
                return;
            }
            updateInabaLogEntryByDecisionId(parentExecutionId, id, { status: 'sent', sentAt: ts });
            store.appendTimelineEventToFile(parentExecutionId, {
                id: mkId(),
                type: 'decision',
                title: 'تم إرسال مخاطبة إلى مديرية الإنابة',
                description: `بتاريخ ${ymd}:\n\nمديرية الإنابة: ${directorate || '---'}\nموضوع المخاطبة: ${subject}`,
                date: ymd,
                timestamp: ts,
                source: 'القرارات والطعون',
                metadata: {
                    decisionRowId: id,
                    timelineThreadKey: `executor_decision:${id}`,
                    inabaSubFileId: resolvedInabaId,
                },
            } as any);
            store.appendTimelineEventToSubFile(resolvedInabaId, parentExecutionId, {
                id: mkId(),
                type: 'decision',
                title: 'وردت مخاطبة من الإضبارة الأم',
                description: `بتاريخ ${ymd}:\n\nموضوع المخاطبة: ${subject}`,
                date: ymd,
                timestamp: ts,
                source: 'القرارات والطعون',
                metadata: {
                    decisionRowId: id,
                    timelineThreadKey: `executor_decision:${id}`,
                    parentExecutionId,
                },
            } as any);
            dispatchToast('تم تسجيل المخاطبة في الإضبارة الأم والإنابة.', 'success');
        } catch {
            dispatchToast('تعذر قراءة بيانات طلب المخاطبة. يرجى إعادة إرسال الطلب.', 'warning');
        }
        return;
    }

    if (title === 'طلب نقل الإضبارة') {
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
        const payloadRaw = String((row as any)?.payloadJson || '').trim();
        let targetDirectorate = '';
        if (payloadRaw) {
            try {
                const parsed = JSON.parse(payloadRaw) as any;
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
        const patch: any = {
            directorate: targetDirectorate,
            transferPendingFileNumberChange: true,
            dossier_last_action_date: today,
            updatedAt: now,
        };
        const curId = String(store.currentFile?.id || '').trim();
        if (curId && curId === dossierId) {
            store.updateCurrentFile(patch);
        } else {
            try {
                const all = loadExecutionFilesRaw() as any[];
                const idx = all.findIndex((f: any) => String(f?.id || '').trim() === dossierId);
                if (idx >= 0) {
                    all[idx] = { ...(all[idx] as any), ...patch };
                    saveExecutionFilesRaw(all);
                    const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                    if (Array.isArray(cache)) {
                        const arr = cache as any[];
                        const cIdx = arr.findIndex((f: any) => String(f?.id || '').trim() === dossierId);
                        if (cIdx >= 0) {
                            arr[cIdx] = { ...(arr[cIdx] as any), ...patch };
                            storageCache.set(EXECUTION_FILES_STORAGE_KEY, arr);
                        }
                    }
                }
            } catch {
                /* ignore */
            }
        }
        dispatchToast(
            'تم نقل الإضبارة وتحديث المديرية. يمكنك تغيير رقم الإضبارة من الخيار الظاهر فوق الرقم.',
            'success'
        );
        return;
    }

    if (title === 'طلب تجديد الإضبارة') {
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
        const patch: any = {
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
            try {
                const all = loadExecutionFilesRaw() as any[];
                const idx = all.findIndex((f: any) => String(f?.id || '').trim() === dossierId);
                if (idx >= 0) {
                    all[idx] = { ...(all[idx] as any), ...patch };
                    saveExecutionFilesRaw(all);
                    const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                    if (Array.isArray(cache)) {
                        const arr = cache as any[];
                        const cIdx = arr.findIndex((f: any) => String(f?.id || '').trim() === dossierId);
                        if (cIdx >= 0) {
                            arr[cIdx] = { ...(arr[cIdx] as any), ...patch };
                            storageCache.set(EXECUTION_FILES_STORAGE_KEY, arr);
                        }
                    }
                }
            } catch {
                /* ignore */
            }
        }
        dispatchToast('تم تجديد الإضبارة وإرجاع حالتها إلى نشطة.', 'success');
    }
}
