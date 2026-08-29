import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { newEventId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    asExecutionFiles,
    dispatchToast,
    markDossierSpecialFollowupApplied,
    normalizeBaseDossierIdFromDecisionsKey,
    parseDecisionPayload,
} from './applyDossierSpecialFollowupOutcome.helpers';

export function applyUnificationFollowupOutcome(input: {
    executionId: string;
    row: Record<string, unknown>;
    resolution: 'approved' | 'rejected';
    id: string;
}): void {
    const { executionId, row, resolution, id } = input;
    if (resolution !== 'approved') {
        dispatchToast('تم رفض طلب توحيد الأضابير.', 'warning');
        return;
    }
    const store = useExecutionDashboardStore.getState();
    const parentExecutionId =
        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
        String(store.currentFile?.id || '').trim();
    const payloadRaw = String(row.payloadJson || '').trim();
    if (!parentExecutionId) {
        dispatchToast('تعذر تنفيذ التوحيد: لم يتم تحديد الإضبارة الأصلية.', 'warning');
        return;
    }
    if (!payloadRaw) {
        dispatchToast('طلب توحيد قديم بدون بيانات منظمة — يرجى إعادة إرسال الطلب.', 'warning');
        return;
    }
    try {
        const parsed = parseDecisionPayload(payloadRaw);
        if (parsed?.kind !== 'unification') {
            dispatchToast('تعذر تنفيذ التوحيد: صيغة الطلب غير مدعومة.', 'warning');
            return;
        }
        const targetType = String(parsed?.targetType || '').trim();
        if (targetType === 'colleague') {
            dispatchToast('ربط إضبارة الزميل عبر التوحيد لم يعد متاحاً.', 'warning');
            return;
        }
        if (targetType !== 'own') {
            dispatchToast('تعذر تنفيذ التوحيد: نوع الربط غير معروف.', 'warning');
            return;
        }
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
            const all = asExecutionFiles(loadExecutionFilesRaw());
            const base = all.find((f) => String(f?.id || '').trim() === parentExecutionId);
            const unified = all.find((f) => String(f?.id || '').trim() === targetId);
            const baseNo = String(base?.fileNumber || '').trim() || parentExecutionId;
            const unifiedNo = String(unified?.fileNumber || '').trim() || targetId;
            const ts = new Date().toISOString();
            const ymd = ts.slice(0, 10);
            const alreadyBase =
                Array.isArray(base?.timelineEvents) &&
                base.timelineEvents.some((e) => String(e?.metadata?.decisionRowId || '') === id);
            const alreadyUnified =
                Array.isArray(unified?.timelineEvents) &&
                unified.timelineEvents.some((e) => String(e?.metadata?.decisionRowId || '') === id);
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
                });
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
                });
            }
        } catch {
            /* ignore */
        }
        dispatchToast('تم توحيد الإضبارة تلقائياً بعد موافقة المنفذ.', 'success');
        markDossierSpecialFollowupApplied(executionId, id);
    } catch {
        dispatchToast('تعذر قراءة بيانات طلب التوحيد. يرجى إعادة إرسال الطلب.', 'warning');
    }
}
