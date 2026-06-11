/**
 * مسار آلي بعد «قبول المنفذ» في مركز القرارات والطعون — نطاق إجراءات التخلية الميدانية فقط.
 * يُستدعى من الواجهة بعد التحديث التفاؤلي للقرار؛ النداءات للخادم تُعلَّق بـ TODO أدناه.
 */

import {
    EVICTION_TIMELINE_ACTION_IDS,
    type EvictionTimelineActionId,
} from '@/app/utils/executionModuleStrategies';
import { executionFieldVisitAppointmentStorageKey } from '@/app/utils/executionStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';

/** مفتاح يُخزَّن مع صف القرار عند إنشاء طلب تخلية من لوحة الإجراءات الميدانية */
export type EvictionExecutorWorkflowKey =
    | 'field_visit_or_grace'
    | 'police_assistance'
    /** قديم: طلبات قبل فصل مساري الجرد والتسليم */
    | 'inventory_or_eviction'
    | 'break_inventory'
    | 'marital_furniture_delivery'
    | 'judicial_custodian'
    | 'residential_grace_early_end';

/** ربط زر الإجراء الميداني → نوع سير العمل */
export const EVICTION_WORKFLOW_BY_ACTION_ID: Partial<
    Record<EvictionTimelineActionId, EvictionExecutorWorkflowKey>
> = {
    [EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT]: 'field_visit_or_grace',
    [EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE]: 'police_assistance',
    [EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY]: 'break_inventory',
    [EVICTION_TIMELINE_ACTION_IDS.MARITAL_FURNITURE_DELIVERY]: 'marital_furniture_delivery',
    [EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN]: 'judicial_custodian',
};

/** القيم التي يتوقعها الـ switch (مطابقة لصياغة المهمة) */
export type ExecutorApprovalDecisionType =
    | 'Field Visit Date'
    | 'Grace Period'
    | 'Police Assistance Request'
    | 'Lock Breaking & Inventory'
    | 'Marital Furniture Delivery'
    | 'Judicial Custodian'
    | 'Eviction'
    | 'Residential Grace Early End'
    | 'other';

export interface ExecutorDecisionLike {
    title: string;
    requestKind?: string;
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
}

export function fieldVisitAppointmentStorageKey(dossierId: string): string {
    return executionFieldVisitAppointmentStorageKey(dossierId);
}

/** استنتاج نوع القرار للمسار الآلي من المفتاح أو من عنوان الطلب (للصفوف القديمة) */
export function inferExecutorApprovalDecisionType(row: ExecutorDecisionLike): ExecutorApprovalDecisionType {
    const t = row.title || '';
    const k = row.evictionWorkflowKey;

    if (k === 'residential_grace_early_end') return 'Residential Grace Early End';

    if (k === 'field_visit_or_grace') {
        if (/مهلة|إعطاء مهلة|التخلية \(سكني\)/.test(t)) return 'Grace Period';
        return 'Field Visit Date';
    }
    if (k === 'police_assistance') return 'Police Assistance Request';
    if (k === 'break_inventory') return 'Lock Breaking & Inventory';
    if (k === 'marital_furniture_delivery') return 'Marital Furniture Delivery';
    if (k === 'judicial_custodian') return 'Judicial Custodian';
    if (k === 'inventory_or_eviction') {
        if (/التخلية وتسليم|تسليم العقار|الإخلاء الجبري|إخلاء جبري/i.test(t)) return 'Eviction';
        return 'Lock Breaking & Inventory';
    }

    if (row.requestKind !== 'eviction_procedure') return 'other';

    if (/إنهاء مهلة التخلية السكنية|طلب إنهاء مهلة التخلية|مهلة التخلية السكنية.*منفذ/i.test(t))
        return 'Residential Grace Early End';
    if (/تحديد موعد الخروج الميداني|الخروج الميداني/.test(t)) return 'Field Visit Date';
    if (/مهلة|إعطاء مهلة/.test(t)) return 'Grace Period';
    if (/مفاتحة الشرطة|القوة الإجرائية/.test(t)) return 'Police Assistance Request';
    if (/تسليم أثاث|أثاث زوجية|جرد وتسليم قطع/i.test(t)) return 'Marital Furniture Delivery';
    if (/حارس\s*قضائي|تنصيب\s*حارس/.test(t)) return 'Judicial Custodian';
    if (/كسر الأقفال|جرد الأثاث/.test(t)) return 'Lock Breaking & Inventory';
    if (/التخلية وتسليم العقار|الإخلاء الجبري|إخلاء جبري/i.test(t)) return 'Eviction';

    return 'other';
}

export interface BreakInventoryFurnitureSavePayload {
    mode: 'list' | 'none';
    lines: string[];
}

export interface JudicialCustodianSavePayload {
    name: string;
    salary: string;
}

export interface ScheduledDateSavePayload {
    dateOnly: string;
    timeOptional: string;
    eventIso: string;
    displayAr: string;
}

/**
 * واجهة يوفّرها شاشة الإضبارة (React) — فتح نوافذ، مهام، سجل زمني، إلخ.
 * TODO: من هنا تُستدعى واجهات REST/Supabase (مثلاً POST /cases/:id/appointments).
 */
export interface ExecutorApprovalActions {
    openScheduledDateModal: (input: {
        decisionId: string;
        requestTitle: string;
        onSaved: (payload: ScheduledDateSavePayload) => void;
    }) => void;
    openPoliceAssistanceModal?: (input: {
        decisionId: string;
        requestTitle: string;
        initialAgencyName?: string;
    }) => void;
    showToast: (message: string, variant: 'success' | 'error' | 'warning' | 'info') => void;
    appendDossierTask: (task: { title: string; body: string; dueDate: string }) => void;
    /** آخر موعد خروج ميداني مُعتمد (ISO) — لربط مهمة الشرطة */
    getFieldVisitDeadlineIso: () => string | null;
    promptOpenExecutionReport: (onConfirm: () => void) => void;
    pushCalendarAppointment: (input: {
        dossierId: string;
        decisionId: string;
        purpose: string;
        eventIso: string;
        recordedAt: string;
    }) => void;
    patchDecision: (decisionId: string, patch: Record<string, unknown>) => void;
    openBreakInventoryFurnitureModal: (input: {
        decisionId: string;
        requestTitle: string;
        onSaved: (payload: BreakInventoryFurnitureSavePayload) => void;
        onFinalize: () => void;
    }) => void;
    openJudicialCustodianModal: (input: {
        decisionId: string;
        requestTitle: string;
        onSaved: (payload: JudicialCustodianSavePayload) => void;
    }) => void;
    appendCaseNote: (input: { title: string; body: string }) => void;
    persistJudicialCustodianDetails: (input: {
        decisionId: string;
        fullName: string;
        salary: string;
        /** تعديل سجل موجود في القائمة */
        recordId?: string;
    }) => void;
}

export function openBreakInventoryCompletion(
    decisionId: string,
    actions: ExecutorApprovalActions,
    requestTitle: string
): void {
    actions.openBreakInventoryFurnitureModal({
        decisionId,
        requestTitle,
        onSaved: (payload: BreakInventoryFurnitureSavePayload) => {
            const ts = new Date().toISOString();
            actions.patchDecision(decisionId, {
                breakInventoryFurnitureLedgerAt: ts,
                breakInventoryFurnitureMode: payload.mode,
                breakInventoryFurnitureLines:
                    payload.mode === 'list'
                        ? payload.lines.map((s) => s.trim()).filter(Boolean)
                        : [],
            });
            const body =
                payload.mode === 'none'
                    ? 'إقرار: لا يوجد أثاث منقول في العين وقت الجرد (كسر الأقفال والجرد).'
                    : [
                          'قائمة المنقولات المجرودة (كسر الأقفال والجرد):',
                          ...payload.lines
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .map((l, i) => `${i + 1}. ${l}`),
                      ].join('\n');
            actions.appendCaseNote({
                title: 'جرد الأثاث — كسر الأقفال والجرد',
                body,
            });
            actions.showToast('تم حفظ الجرد في قسم الملاحظات', 'success');
        },
        onFinalize: () => {
            const ts = new Date().toISOString();
            actions.patchDecision(decisionId, {
                breakInventoryFurnitureFinalizedAt: ts,
            });
            actions.showToast('تم إنهاء الجرد وإغلاق الطلب', 'success');
        },
    });
}

export function openJudicialCustodianCompletion(
    decisionId: string,
    actions: ExecutorApprovalActions,
    requestTitle: string
): void {
    actions.openJudicialCustodianModal({
        decisionId,
        requestTitle,
        onSaved: (payload: JudicialCustodianSavePayload) => {
            const ts = new Date().toISOString();
            actions.patchDecision(decisionId, { judicialCustodianDetailsSavedAt: ts });
            actions.persistJudicialCustodianDetails({
                decisionId,
                fullName: payload.name,
                salary: payload.salary,
            });
            actions.showToast('تم حفظ بيانات الحارس القاضي', 'success');
        },
    });
}

/**
 * الموجّه المركزي بعد قبول المنفذ — يفرّع حسب نوع القرار.
 *
 * @param decisionType — ناتج inferExecutorApprovalDecisionType
 * @param dossierId — معرّف الإضبارة (نفس executionId في التخزين المحلي)
 * @param decisionId — معرّف صف القرار في localStorage
 */
export function handleExecutorApproval(
    decisionType: ExecutorApprovalDecisionType,
    dossierId: string,
    decisionId: string,
    actions: ExecutorApprovalActions,
    meta: { requestTitle: string }
): void {
    switch (decisionType) {
        case 'Field Visit Date':
            actions.openScheduledDateModal({
                decisionId,
                requestTitle: meta.requestTitle,
                onSaved: (payload) => {
                    const now = new Date().toISOString();
                    actions.pushCalendarAppointment({
                        dossierId,
                        decisionId,
                        purpose: meta.requestTitle,
                        eventIso: payload.eventIso,
                        recordedAt: now,
                    });
                    actions.patchDecision(decisionId, {
                        executorScheduleLabel: `مجدول: ${payload.displayAr}`,
                    });
                    try {
                        SecureStoreService.setItemSync(fieldVisitAppointmentStorageKey(dossierId), payload.eventIso);
                    } catch {
                        /* ignore */
                    }
                    actions.showToast('تم اعتماد الموعد وربطه بالمواعيد والسجل', 'success');
                },
            });
            break;

        case 'Grace Period':
            actions.showToast('تمت الموافقة على المهلة — افتح بطاقة القرار لإكمال حفظ المهلة.', 'success');
            void dossierId;
            break;

        case 'Police Assistance Request':
            if (actions.openPoliceAssistanceModal) {
                actions.openPoliceAssistanceModal({
                    decisionId,
                    requestTitle: meta.requestTitle,
                });
                return;
            }
            actions.showToast(
                'تم قبول طلب القوة الجبرية — افتح بطاقة القرار لإكمال الجهة المرافقة والحفظ.',
                'success'
            );
            void dossierId;
            break;

        case 'Lock Breaking & Inventory':
            openBreakInventoryCompletion(decisionId, actions, meta.requestTitle);
            break;

        case 'Marital Furniture Delivery':
            if (actions.openBreakInventoryFurnitureModal) {
                actions.openBreakInventoryFurnitureModal({
                    decisionId,
                    requestTitle: meta.requestTitle,
                    onSaved: () => {},
                    onFinalize: () => {},
                });
                return;
            }
            actions.openScheduledDateModal({
                decisionId,
                requestTitle: meta.requestTitle,
                onSaved: () => {},
            });
            break;

        case 'Judicial Custodian':
            actions.showToast('تم قبول الطلب — أكمل بيانات الحارس من بطاقة القرار.', 'success');
            break;

        case 'Eviction':
            actions.promptOpenExecutionReport(() => {
                // TODO: PATCH /api/cases/{dossierId}/execution-report — فتح مسودة محضر التنفيذ
            });
            break;

        case 'Residential Grace Early End':
            actions.showToast('تمت موافقة المنفذ على إنهاء المهلة السكنية وإعادة دورة المهلة في الملف.', 'success');
            break;

        case 'other':
        default:
            break;
    }
}
