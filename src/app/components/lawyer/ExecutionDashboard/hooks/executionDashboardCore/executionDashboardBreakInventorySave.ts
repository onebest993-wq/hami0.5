import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';
import { patchExecutorDecisionRowReliable } from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildMaritalFurnitureDeliveryNoteBody,
    furnitureDetailsFromItems,
    normalizeMaritalFurnitureItems,
    sumMaritalFurnitureTotal,
    sumUndeliveredMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';

export type CaseNoteRow = {
    id: string;
    title: string;
    body: string;
    createdAt: string;
};

export type BreakInventoryStorageDeps = {
    storageId: string;
    evictionProcedureLocked: boolean;
    showToast: (message: string, type?: string) => void;
};

export function runSaveBreakInventoryLedgerEntry(
    input: { decisionId: string; payload: BreakInventoryFurnitureSavePayload },
    deps: BreakInventoryStorageDeps & {
        setCaseNotesLog: Dispatch<SetStateAction<CaseNoteRow[]>>;
        persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    },
): void {
    const { decisionId: rawId, payload } = input;
    const { storageId, evictionProcedureLocked, showToast, setCaseNotesLog, persistExecutionMergeRef } =
        deps;
    if (evictionProcedureLocked) {
        showToast('لا يمكن حفظ الجرد — الإضبارة أو الإجراءات مقفلة.', 'warning');
        return;
    }
    const decisionId = String(rawId || '').trim();
    if (!decisionId) return;
    const ts = new Date().toISOString();
    const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
        breakInventoryFurnitureLedgerAt: ts,
        breakInventoryFurnitureMode: payload.mode,
        breakInventoryFurnitureLines:
            payload.mode === 'list' ? payload.lines.map((s) => s.trim()).filter(Boolean) : [],
    });
    if (!ok) {
        showToast('تعذر حفظ الجرد — تحقق من قرار المنفذ.', 'error');
        return;
    }
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
    const now = new Date().toISOString();
    const noteId = `note_${Date.now()}`;
    setCaseNotesLog((prev) => {
        const next = [
            {
                id: noteId,
                title: 'جرد الأثاث — كسر الأقفال والجرد',
                body,
                createdAt: now,
            },
            ...prev,
        ];
        queueMicrotask(() => {
            persistExecutionMergeRef.current?.({ caseNotesLog: next });
        });
        return next;
    });
    showToast('تم حفظ الجرد في قسم الملاحظات', 'success');
}

export function runFinalizeBreakInventoryEntry(
    input: { decisionId: string },
    deps: BreakInventoryStorageDeps,
): void {
    const { evictionProcedureLocked, showToast, storageId } = deps;
    if (evictionProcedureLocked) {
        showToast('لا يمكن تأكيد الجرد — الإضبارة أو الإجراءات مقفلة.', 'warning');
        return;
    }
    const decisionId = String(input.decisionId || '').trim();
    if (!decisionId) return;
    const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
        breakInventoryFurnitureFinalizedAt: new Date().toISOString(),
    });
    if (!ok) {
        showToast('تعذر تأكيد اكتمال الجرد', 'error');
        return;
    }
    showToast('تم إنهاء الجرد وإغلاق الطلب', 'success');
}

export function runSaveMaritalFurnitureDeliveryInventoryEntry(
    input: { decisionId: string; items: MaritalFurnitureItem[] },
    deps: BreakInventoryStorageDeps & {
        persistExecutionMerge: (patch: Record<string, unknown>) => void;
        setCaseNotesLog: Dispatch<SetStateAction<CaseNoteRow[]>>;
        persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    },
): void {
    const { evictionProcedureLocked, showToast, storageId, persistExecutionMerge, setCaseNotesLog, persistExecutionMergeRef } =
        deps;
    if (evictionProcedureLocked) {
        showToast('لا يمكن حفظ الجرد — الإضبارة أو الإجراءات مقفلة.', 'warning');
        return;
    }
    const decisionId = String(input.decisionId || '').trim();
    if (!decisionId) return;
    const normalized = normalizeMaritalFurnitureItems(input.items).map((row) => {
        const src = input.items.find((i) => i.id === row.id);
        return {
            ...row,
            delivered: src?.delivered === true,
            deliveryOutcome: src?.deliveryOutcome,
            deliveryRecordedAt: src?.deliveryRecordedAt,
        };
    });
    if (normalized.length === 0) {
        showToast('لا توجد قطع أثاث لحفظ حالة التسليم', 'warning');
        return;
    }

    const ts = new Date().toISOString();
    const undeliveredTotal = sumUndeliveredMaritalFurnitureTotal(normalized);
    const furnitureValue = sumMaritalFurnitureTotal(normalized);
    const body = buildMaritalFurnitureDeliveryNoteBody(normalized);

    const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
        breakInventoryFurnitureLedgerAt: ts,
        breakInventoryFurnitureMode: 'marital_delivery',
        breakInventoryFurnitureLines: normalized.map(
            (row) => `${row.name}|${row.quantity}|${row.delivered ? 'delivered' : 'undelivered'}`,
        ),
    });
    if (!ok) {
        showToast('تعذر حفظ جرد التسليم — تحقق من قرار المنفذ.', 'error');
        return;
    }

    persistExecutionMerge({
        maritalFurnitureItems: normalized,
        furnitureValue,
        furnitureDetails: furnitureDetailsFromItems(normalized),
        maritalFurnitureDeliveryRecordedAt: ts,
        totalAmount: undeliveredTotal,
        debtAmount: undeliveredTotal,
    });

    const noteId = `note_${Date.now()}`;
    setCaseNotesLog((prev) => {
        const next = [
            {
                id: noteId,
                title: 'جرد تسليم الأثاث الزوجية',
                body,
                createdAt: ts,
            },
            ...prev,
        ];
        queueMicrotask(() => {
            persistExecutionMergeRef.current?.({ caseNotesLog: next });
        });
        return next;
    });

    showToast(
        undeliveredTotal > 0
            ? `تم حفظ التسليم — ${undeliveredTotal.toLocaleString('ar-IQ')} د.ع غير مُسلَّم في المركز المالي`
            : 'تم حفظ التسليم — جميع القطع مُسلَّمة ولا مبلغ في المركز المالي',
        'success',
    );
}

export function resolveBreakInventoryStorageId(
    decisionsStorageExecutionId: string | undefined,
    executionData: ExecutionFile | null | undefined,
    executionId: string | undefined,
): string {
    return String(decisionsStorageExecutionId || executionData?.id || executionId || '').trim();
}
