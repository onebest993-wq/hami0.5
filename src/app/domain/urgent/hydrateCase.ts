import {
    computeUrgentCaseStatus,
    type UrgentCase,
} from '@/app/components/lawyer/Component_Urgent_Card';
import { uuidv4 } from '@/app/services/urgent-actions-db';
import { resolveProcedureCategory } from './procedureCategory';
import {
    asRecord,
    hydrateExpertModule,
    mapLegacyCassationFields,
    normalizeUrgentHearings,
    pickYmdPrefix,
    resolveHydratedLegalState,
    resolveHydratedRepresentedParty,
} from './hydrateCaseParts';

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asStringOrNull(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

function asBool(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** يحوّل صفاً خاماً من التخزين إلى UrgentCase مع حساب الحالة */
export function hydrateCase(raw: unknown): UrgentCase | null {
    const row = asRecord(raw);
    if (!row) return null;

    const type = row.type === 'state_order' ? 'state_order' : 'urgent_action';
    const specificActionType = asString(row.specificActionType);
    const actionType = asString(row.actionType, specificActionType || 'طلب مستعجل');
    const applicantName =
        asString(row.applicantName) ||
        (asString(row.party1Name).trim() ? asString(row.party1Name) : 'مقدم الطلب');
    const phase =
        row.phase === 'cassation_window' || row.phase === 'completed' || row.phase === 'notification_pending'
            ? row.phase
            : 'grievance_window';
    const judgeDecision =
        row.judgeDecision === 'accepted' ||
        row.judgeDecision === 'rejected' ||
        row.judgeDecision === 'partially_accepted'
            ? row.judgeDecision
            : null;

    const base: UrgentCase = {
        id: typeof row.id === 'string' ? row.id : uuidv4(),
        type,
        actionType,
        applicantName,
        court: asString(row.court, asString(row.courtName, 'غير محدد')),
        requestNumber: asString(row.requestNumber),
        requestDate: asString(row.requestDate),
        courtName: asString(row.courtName),
        judgeName: asString(row.judgeName),
        specificActionType,
        procedureCategory: resolveProcedureCategory(row.procedureCategory, specificActionType),
        procedureDetails: asString(row.procedureDetails),
        requestSubject: asString(row.requestSubject),
        urgentReason: asString(row.urgentReason),
        legalBasis: asString(row.legalBasis),
        requestNotes: asString(row.requestNotes, asString(row.notes)),
        hasIntervention: asBool(row.hasIntervention) ?? false,
        isMainLawsuitFiled: asBool(row.isMainLawsuitFiled),
        guaranteeKind:
            row.guaranteeKind === 'cash' ||
            row.guaranteeKind === 'personal' ||
            row.guaranteeKind === 'real_estate' ||
            row.guaranteeKind === 'none'
                ? row.guaranteeKind
                : null,
        guaranteeDetailsText: asStringOrNull(row.guaranteeDetailsText),
        feeReceiptNumber: asStringOrNull(row.feeReceiptNumber),
        feeReceiptDate: asStringOrNull(row.feeReceiptDate),
        initialNotificationMethod:
            row.initialNotificationMethod === 'personal' ||
            row.initialNotificationMethod === 'by_agent' ||
            row.initialNotificationMethod === 'publication'
                ? row.initialNotificationMethod
                : null,
        initialNotificationDate: asStringOrNull(row.initialNotificationDate),
        party1Name: asString(row.party1Name),
        party1Phone: asString(row.party1Phone),
        party1Address: asString(row.party1Address),
        party2Name: asString(row.party2Name),
        party2Address: asString(row.party2Address),
        allParty1: Array.isArray(row.allParty1) ? row.allParty1 : undefined,
        allParty2: Array.isArray(row.allParty2) ? row.allParty2 : undefined,
        representedParty: resolveHydratedRepresentedParty(row),
        deadlineDate: asDate(row.deadlineDate),
        sessionDate: asDate(row.sessionDate),
        notificationDate: asDate(row.notificationDate),
        deadlineDays: typeof row.deadlineDays === 'number' && Number.isFinite(row.deadlineDays) ? row.deadlineDays : null,
        preDecisionClosed: asBool(row.preDecisionClosed),
        expectedDecisionDate: asStringOrNull(row.expectedDecisionDate),
        judgeDecision,
        judgeDecisionDate: asStringOrNull(row.judgeDecisionDate),
        legalState: resolveHydratedLegalState(row),
        rejectionNotificationDate: asStringOrNull(row.rejectionNotificationDate),
        grievanceOutcome: row.grievanceOutcome === 'filed' || row.grievanceOutcome === 'expired' ? row.grievanceOutcome : null,
        grievanceFiledBy: row.grievanceFiledBy === 'client' || row.grievanceFiledBy === 'opponent' ? row.grievanceFiledBy : null,
        grievanceFilingDate: asStringOrNull(row.grievanceFilingDate),
        firstHearingDate: pickYmdPrefix(row.firstHearingDate) || pickYmdPrefix(row.phase1FirstHearingDate),
        grievanceFirstHearingDate: pickYmdPrefix(row.grievanceFirstHearingDate),
        grievanceSessionDate: asStringOrNull(row.grievanceSessionDate),
        grievanceDecision:
            row.grievanceDecision === 'confirmed' ||
            row.grievanceDecision === 'modified' ||
            row.grievanceDecision === 'canceled'
                ? row.grievanceDecision
                : null,
        grievanceDecisionDate: asStringOrNull(row.grievanceDecisionDate),
        ...mapLegacyCassationFields(row),
        requiresGuarantee: asBool(row.requiresGuarantee) ?? asBool(row.judgeDecisionRequiresGuarantee),
        guaranteeSubmitted: asBool(row.guaranteeSubmitted) ?? asBool(row.guaranteeStatus),
        guaranteeRecovered: asBool(row.guaranteeRecovered),
        guaranteeRecoveryDate: asStringOrNull(row.guaranteeRecoveryDate),
        orderLifted: asBool(row.orderLifted),
        orderLiftDate: asStringOrNull(row.orderLiftDate),
        hearings: normalizeUrgentHearings(row.hearings),
        expertModule: hydrateExpertModule(row.expertModule),
        guaranteeStatus: asBool(row.guaranteeStatus),
        notes: Array.isArray(row.notes) ? row.notes : undefined,
        events: Array.isArray(row.events) ? row.events : undefined,
        attachments: Array.isArray(row.attachments) ? row.attachments : undefined,
        followups: Array.isArray(row.followups) ? row.followups : undefined,
        archived: typeof row.archived === 'boolean' ? row.archived : false,
        archivedAt: asStringOrNull(row.archivedAt),
        archivedReason: asStringOrNull(row.archivedReason),
        deleted: typeof row.deleted === 'boolean' ? row.deleted : false,
        deletedAt: asStringOrNull(row.deletedAt),
        deletedReason: asStringOrNull(row.deletedReason),
        phase,
        isNotificationConfirmed: !!row.isNotificationConfirmed,
        grievanceResult: (row.grievanceResult as UrgentCase['grievanceResult']) ?? null,
        status: 'safe',
        createdAt: asDate(row.createdAt) ?? new Date(),
    };

    const storageExtras: Record<string, unknown> = {};
    if (row.iqrarDeedAuthenticated === true) storageExtras.iqrarDeedAuthenticated = true;
    if (row.legalState === 'Iqrar_Authenticated') storageExtras.legalState = 'Iqrar_Authenticated';
    if (typeof row.finalityReason === 'string') storageExtras.finalityReason = row.finalityReason;

    const merged = { ...base, ...storageExtras };
    return { ...merged, status: computeUrgentCaseStatus(merged as UrgentCase) } as UrgentCase;
}
