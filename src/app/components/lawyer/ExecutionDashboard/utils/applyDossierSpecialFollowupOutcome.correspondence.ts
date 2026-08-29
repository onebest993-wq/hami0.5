import { useExecutionDashboardStore, isInabaSubFileId } from '@/app/stores/executionDashboardStore';
import { updateInabaLogEntryByDecisionId } from '@/app/components/lawyer/ExecutionDashboard/utils/inabaCorrespondenceLog';
import {
    dispatchToast,
    markDossierSpecialFollowupApplied,
    normalizeBaseDossierIdFromDecisionsKey,
} from './applyDossierSpecialFollowupOutcome.helpers';

export function applyInabaCorrespondenceFollowupOutcome(input: {
    executionId: string;
    row: Record<string, unknown>;
    resolution: 'approved' | 'rejected';
    id: string;
}): void {
    const { executionId, row, resolution, id } = input;
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
    const payloadRaw = String(row.payloadJson || '').trim();
    if (!parentExecutionId) {
        dispatchToast('تعذر تنفيذ الطلب: لم يتم تحديد الإضبارة الأم.', 'warning');
        return;
    }
    if (!payloadRaw) {
        dispatchToast('طلب مخاطبة قديم بدون بيانات منظمة — يرجى إعادة إرسال الطلب.', 'warning');
        return;
    }
    try {
        const parsed = JSON.parse(payloadRaw) as Record<string, unknown>;
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
                    String((sf as { delegationTargetDirectorate?: string }).delegationTargetDirectorate || sf.directorate || '').trim() ===
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
        });
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
        });
        dispatchToast('تم تسجيل المخاطبة في الإضبارة الأم والإنابة.', 'success');
        markDossierSpecialFollowupApplied(executionId, id);
    } catch {
        dispatchToast('تعذر قراءة بيانات طلب المخاطبة. يرجى إعادة إرسال الطلب.', 'warning');
    }
}
