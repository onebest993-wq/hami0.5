import type { MutableRefObject } from 'react';
import type {
    ExecutionFile,
    RealEstateGender,
    SeizedMovable,
    SeizedProperty,
    TimelineEvent,
} from '@/app/types/execution';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';

export type SaveSeizedPropertyInitInput = {
    decisionId: string;
    subject?: string;
    propertyNumber: string;
    propertyGender: RealEstateGender;
    deedNotes: string;
};

export type SaveSeizedMovableInitInput = {
    decisionId: string;
    subject?: string;
    movableDescription: string;
    movableLocation: string;
    judicialCustodianName: string;
};

export type FollowupSeizureInitDeps = {
    exId: string;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    showToast: (message: string, type?: string) => void;
};

export function runSaveSeizedPropertyInitForDecision(
    input: SaveSeizedPropertyInitInput,
    deps: FollowupSeizureInitDeps,
): void {
    const { exId, executionDataRef, nextTimelineId, persistExecutionMerge, pushTimelineEvent, showToast } =
        deps;
    const decisionId = String(input.decisionId || '').trim();
    if (!exId || exId === 'undefined' || !decisionId) return;
    const propertyNumber = String(input.propertyNumber || '').trim();
    if (!propertyNumber) {
        showToast('أدخل رقم العقار.', 'warning');
        return;
    }
    const deedNotes = String(input.deedNotes || '').trim();
    if (!deedNotes) {
        showToast('أدخل تفاصيل السند.', 'warning');
        return;
    }
    const nowIso = new Date().toISOString();
    const prev = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
    const existingIdx = prev.findIndex((x) => String(x.decisionRowId || '') === decisionId);
    const next: SeizedProperty[] = [...prev];
    const nextRow: SeizedProperty = {
        id: existingIdx >= 0 ? String(next[existingIdx].id) : `sp_${decisionId}`,
        decisionRowId: decisionId,
        propertyNumber,
        district: String((existingIdx >= 0 ? next[existingIdx].district : '') || ''),
        propertyGender: input.propertyGender,
        deedNotes,
        status: 'seized',
        seizedAtIso: nowIso,
        subject: String(input.subject || '').trim() || undefined,
    };
    if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...nextRow };
    else next.unshift(nextRow);
    persistExecutionMerge({ seizedProperties: next });
    patchExecutorDecisionRow(exId, decisionId, {
        seizureRequestSavedAt: nowIso,
        seizureRequestDetails: `رقم العقار: ${propertyNumber}\nالجنس: ${input.propertyGender}\nتفاصيل السند:\n${deedNotes}`,
    });
    pushTimelineEvent({
        id: nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '🏠 حفظ بيانات العقار (بعد موافقة المنفذ)',
        description: `رقم العقار: ${propertyNumber}\nالجنس: ${input.propertyGender}\nتفاصيل السند:\n${deedNotes}`,
        type: 'decision',
        source: 'محضر المتابعة — الأموال المحجوزة',
        metadata: { seizedPropertyId: nextRow.id, decisionRowId: decisionId },
    });
    showToast('تم حفظ بيانات العقار وإنشاء البطاقة داخل الأموال المحجوزة.', 'success');
}

export function runSaveSeizedMovableInitForDecision(
    input: SaveSeizedMovableInitInput,
    deps: FollowupSeizureInitDeps,
): void {
    const { exId, executionDataRef, nextTimelineId, persistExecutionMerge, pushTimelineEvent, showToast } =
        deps;
    const decisionId = String(input.decisionId || '').trim();
    if (!exId || exId === 'undefined' || !decisionId) return;
    const desc = String(input.movableDescription || '').trim();
    if (!desc) {
        showToast('أدخل وصف المال المنقول.', 'warning');
        return;
    }
    const loc = String(input.movableLocation || '').trim();
    if (!loc) {
        showToast('أدخل مكان تواجد المال المنقول.', 'warning');
        return;
    }
    const cust = String(input.judicialCustodianName || '').trim();
    if (!cust) {
        showToast('أدخل اسم الحارس القضائي.', 'warning');
        return;
    }
    const nowIso = new Date().toISOString();
    const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
    const existingIdx = prev.findIndex((x) => String(x.decisionRowId || '') === decisionId);
    const next: SeizedMovable[] = [...prev];
    const nextRow: SeizedMovable = {
        id: existingIdx >= 0 ? String(next[existingIdx].id) : `sm_${decisionId}`,
        decisionRowId: decisionId,
        movableDescription: desc,
        movableLocation: loc,
        judicialCustodianName: cust,
        status: 'seized',
        seizedAtIso: nowIso,
        subject: String(input.subject || '').trim() || undefined,
    };
    if (existingIdx >= 0) next[existingIdx] = nextRow;
    else next.unshift(nextRow);
    persistExecutionMerge({ seizedMovables: next });
    patchExecutorDecisionRow(exId, decisionId, {
        seizureRequestSavedAt: nowIso,
        seizureRequestDetails: `وصف المال المنقول: ${desc}\nالمكان: ${loc}\nالحارس القضائي: ${cust}`,
    });
    pushTimelineEvent({
        id: nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '📦 حفظ بيانات المال المنقول (بعد موافقة المنفذ)',
        description: `وصف المال المنقول: ${desc}\nالمكان: ${loc}\nالحارس القضائي: ${cust}`,
        type: 'decision',
        source: 'محضر المتابعة — الأموال المحجوزة',
        metadata: { seizedMovableId: nextRow.id, decisionRowId: decisionId },
    });
    showToast('تم حفظ بيانات المال المنقول وإنشاء البطاقة داخل الأموال المحجوزة.', 'success');
}
