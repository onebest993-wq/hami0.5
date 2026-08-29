import type { UrgentCase, UrgentCaseStorageRow } from './types';

/** يحوّل UrgentCase إلى صف قابل للتخزين في localStorage / KV */
export function serializeCaseForStorage(c: UrgentCase): Record<string, unknown> {
    const row = c as UrgentCaseStorageRow;
    return {
        ...c,
        deadlineDate: c.deadlineDate ? new Date(c.deadlineDate).toISOString() : null,
        sessionDate: c.sessionDate ? new Date(c.sessionDate).toISOString() : null,
        notificationDate: c.notificationDate ? new Date(c.notificationDate).toISOString() : null,
        deadlineDays: typeof c.deadlineDays === 'number' && Number.isFinite(c.deadlineDays) ? c.deadlineDays : null,
        preDecisionClosed: typeof row.preDecisionClosed === 'boolean' ? row.preDecisionClosed : null,
        expectedDecisionDate: typeof row.expectedDecisionDate === 'string' ? row.expectedDecisionDate : null,
        feeReceiptNumber: typeof row.feeReceiptNumber === 'string' ? row.feeReceiptNumber : null,
        feeReceiptDate: typeof row.feeReceiptDate === 'string' ? row.feeReceiptDate : null,
        initialNotificationMethod:
            row.initialNotificationMethod === 'personal' ||
            row.initialNotificationMethod === 'by_agent' ||
            row.initialNotificationMethod === 'publication'
                ? row.initialNotificationMethod
                : null,
        initialNotificationDate: typeof row.initialNotificationDate === 'string' ? row.initialNotificationDate : null,
        requiresGuarantee: typeof row.requiresGuarantee === 'boolean' ? row.requiresGuarantee : null,
        guaranteeSubmitted: typeof row.guaranteeSubmitted === 'boolean' ? row.guaranteeSubmitted : null,
        guaranteeRecovered: typeof row.guaranteeRecovered === 'boolean' ? row.guaranteeRecovered : null,
        guaranteeRecoveryDate: typeof row.guaranteeRecoveryDate === 'string' ? row.guaranteeRecoveryDate : null,
        orderLifted: typeof row.orderLifted === 'boolean' ? row.orderLifted : null,
        orderLiftDate: typeof row.orderLiftDate === 'string' ? row.orderLiftDate : null,
        hearings: Array.isArray(row.hearings) ? row.hearings : null,
        expertModule: row.expertModule && typeof row.expertModule === 'object' ? row.expertModule : null,
        archived: !!c.archived,
        archivedAt: typeof c.archivedAt === 'string' ? c.archivedAt : null,
        archivedReason: typeof row.archivedReason === 'string' ? row.archivedReason : null,
        deleted: typeof row.deleted === 'boolean' ? row.deleted : false,
        deletedAt: typeof row.deletedAt === 'string' ? row.deletedAt : null,
        deletedReason: typeof row.deletedReason === 'string' ? row.deletedReason : null,
        createdAt: new Date(c.createdAt).toISOString(),
    };
}

export function serializeCasesForStorage(cases: UrgentCase[]): Record<string, unknown>[] {
    return cases.map(serializeCaseForStorage);
}
