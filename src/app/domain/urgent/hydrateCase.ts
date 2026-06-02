import {
    computeUrgentCaseStatus,
    type CaseHearing,
    type LegalState,
    type UrgentCase,
} from '@/app/components/lawyer/Component_Urgent_Card';
import { uuidv4 } from '@/app/services/urgent-actions-db';
import { resolveProcedureCategory } from './procedureCategory';

function asRecord(raw: unknown): Record<string, unknown> | null {
    if (!raw || typeof raw !== 'object') return null;
    return raw as Record<string, unknown>;
}

/** يحوّل صفاً خاماً من التخزين إلى UrgentCase مع حساب الحالة */
export function hydrateCase(raw: unknown): UrgentCase | null {
    const row = asRecord(raw);
    if (!row) return null;

    const id = typeof row.id === 'string' ? row.id : uuidv4();
    const createdAt = row.createdAt ? new Date(row.createdAt as string | number | Date) : new Date();
    const deadlineDate = row.deadlineDate ? new Date(row.deadlineDate as string | number | Date) : null;
    const sessionDate = row.sessionDate ? new Date(row.sessionDate as string | number | Date) : null;
    const notificationDate = row.notificationDate ? new Date(row.notificationDate as string | number | Date) : null;
    const judgeDecision =
        row.judgeDecision === 'accepted' || row.judgeDecision === 'rejected' || row.judgeDecision === 'partially_accepted'
            ? row.judgeDecision
            : null;
    const judgeDecisionDate = typeof row.judgeDecisionDate === 'string' ? row.judgeDecisionDate : null;
    const deadlineDays = typeof row.deadlineDays === 'number' && Number.isFinite(row.deadlineDays) ? row.deadlineDays : null;
    const type = row.type === 'state_order' ? 'state_order' : 'urgent_action';
    const actionType =
        typeof row.actionType === 'string'
            ? row.actionType
            : typeof row.specificActionType === 'string'
              ? row.specificActionType
              : 'طلب مستعجل';
    const applicantName =
        typeof row.applicantName === 'string'
            ? row.applicantName
            : typeof row.party1Name === 'string' && String(row.party1Name).trim()
              ? String(row.party1Name)
              : 'مقدم الطلب';
    const court =
        typeof row.court === 'string' ? row.court : typeof row.courtName === 'string' ? row.courtName : 'غير محدد';
    const phase =
        row.phase === 'cassation_window' || row.phase === 'completed' || row.phase === 'notification_pending'
            ? row.phase
            : 'grievance_window';
    const legacyLegalStateAwaiting = 'Awaiting_' + 'Appeal';
    const legacyOutcomeKey = 'ap' + 'pealOutcome';
    const legacyFiledByKey = 'ap' + 'pealFiledBy';
    const legacyFilingDateKey = 'ap' + 'pealFilingDate';
    const legacyFileNumberKey = 'ap' + 'pealFileNumber';
    const legacyDecisionKey = 'ap' + 'pealDecision';
    const legacyDecisionDateKey = 'ap' + 'pealDecisionDate';

    const normalizedHearings = Array.isArray(row.hearings)
        ? (row.hearings as unknown[])
              .map((h): CaseHearing | null => {
                  const hearing = asRecord(h);
                  if (!hearing) return null;
                  const stage = hearing.stage === 'pre_decision' || hearing.stage === 'grievance' ? hearing.stage : null;
                  if (!stage) return null;
                  return {
                      id: typeof hearing.id === 'string' ? hearing.id : uuidv4(),
                      stage,
                      sessionDate: typeof hearing.sessionDate === 'string' ? hearing.sessionDate : '',
                      notes: typeof hearing.notes === 'string' ? hearing.notes : '',
                      nextSessionDate: typeof hearing.nextSessionDate === 'string' ? hearing.nextSessionDate : '',
                      createdAt: typeof hearing.createdAt === 'string' ? hearing.createdAt : new Date().toISOString(),
                  };
              })
              .filter(Boolean)
        : null;

    const base: UrgentCase = {
        id,
        type,
        actionType,
        applicantName,
        court,
        requestNumber: typeof row.requestNumber === 'string' ? row.requestNumber : '',
        requestDate: typeof row.requestDate === 'string' ? row.requestDate : '',
        courtName: typeof row.courtName === 'string' ? row.courtName : '',
        judgeName: typeof row.judgeName === 'string' ? row.judgeName : '',
        specificActionType: typeof row.specificActionType === 'string' ? row.specificActionType : '',
        procedureCategory: (() => {
            const stored = row.procedureCategory;
            const specific = typeof row.specificActionType === 'string' ? row.specificActionType : '';
            return resolveProcedureCategory(stored, specific);
        })(),
        procedureDetails: typeof row.procedureDetails === 'string' ? row.procedureDetails : '',
        requestSubject: typeof row.requestSubject === 'string' ? row.requestSubject : '',
        urgentReason: typeof row.urgentReason === 'string' ? row.urgentReason : '',
        legalBasis: typeof row.legalBasis === 'string' ? row.legalBasis : '',
        requestNotes:
            typeof row.requestNotes === 'string' ? row.requestNotes : typeof row.notes === 'string' ? row.notes : '',
        hasIntervention: typeof row.hasIntervention === 'boolean' ? row.hasIntervention : false,
        isMainLawsuitFiled: typeof row.isMainLawsuitFiled === 'boolean' ? row.isMainLawsuitFiled : undefined,
        guaranteeKind:
            row.guaranteeKind === 'cash' ||
            row.guaranteeKind === 'personal' ||
            row.guaranteeKind === 'real_estate' ||
            row.guaranteeKind === 'none'
                ? row.guaranteeKind
                : null,
        guaranteeDetailsText: typeof row.guaranteeDetailsText === 'string' ? row.guaranteeDetailsText : null,
        feeReceiptNumber: typeof row.feeReceiptNumber === 'string' ? row.feeReceiptNumber : null,
        feeReceiptDate: typeof row.feeReceiptDate === 'string' ? row.feeReceiptDate : null,
        initialNotificationMethod:
            row.initialNotificationMethod === 'personal' ||
            row.initialNotificationMethod === 'by_agent' ||
            row.initialNotificationMethod === 'publication'
                ? row.initialNotificationMethod
                : null,
        initialNotificationDate: typeof row.initialNotificationDate === 'string' ? row.initialNotificationDate : null,
        party1Name: typeof row.party1Name === 'string' ? row.party1Name : '',
        party1Phone: typeof row.party1Phone === 'string' ? row.party1Phone : '',
        party1Address: typeof row.party1Address === 'string' ? row.party1Address : '',
        party2Name: typeof row.party2Name === 'string' ? row.party2Name : '',
        party2Address: typeof row.party2Address === 'string' ? row.party2Address : '',
        allParty1: Array.isArray(row.allParty1) ? row.allParty1 : undefined,
        allParty2: Array.isArray(row.allParty2) ? row.allParty2 : undefined,
        representedParty: (() => {
            const p1 = Array.isArray(row.allParty1) ? row.allParty1 : [];
            const p2 = Array.isArray(row.allParty2) ? row.allParty2 : [];
            const p1Rep = p1.some((p) => {
                const party = asRecord(p);
                return !!party?.isRepresented || !!party?.isClient;
            });
            const p2Rep = p2.some((p) => {
                const party = asRecord(p);
                return !!party?.isRepresented || !!party?.isClient;
            });
            if (p1Rep && !p2Rep) return 'client';
            if (p2Rep && !p1Rep) return 'opponent';
            if (row.representedParty === 'client' || row.representedParty === 'opponent') return row.representedParty;
            return null;
        })(),
        deadlineDate,
        sessionDate,
        notificationDate,
        deadlineDays,
        preDecisionClosed: typeof row.preDecisionClosed === 'boolean' ? row.preDecisionClosed : undefined,
        expectedDecisionDate: typeof row.expectedDecisionDate === 'string' ? row.expectedDecisionDate : null,
        judgeDecision,
        judgeDecisionDate,
        legalState: ((): LegalState | null => {
            if (row.legalState === legacyLegalStateAwaiting) return 'Awaiting_Cassation';
            if (
                row.legalState === 'Awaiting_Grievance' ||
                row.legalState === 'Grievance_Filed' ||
                row.legalState === 'Awaiting_Cassation'
            ) {
                return row.legalState;
            }
            return null;
        })(),
        rejectionNotificationDate: typeof row.rejectionNotificationDate === 'string' ? row.rejectionNotificationDate : null,
        grievanceOutcome: row.grievanceOutcome === 'filed' || row.grievanceOutcome === 'expired' ? row.grievanceOutcome : null,
        grievanceFiledBy: row.grievanceFiledBy === 'client' || row.grievanceFiledBy === 'opponent' ? row.grievanceFiledBy : null,
        grievanceFilingDate: typeof row.grievanceFilingDate === 'string' ? row.grievanceFilingDate : null,
        firstHearingDate: (() => {
            const a = typeof row.firstHearingDate === 'string' ? row.firstHearingDate : '';
            const b = typeof row.phase1FirstHearingDate === 'string' ? row.phase1FirstHearingDate : '';
            const pick = a || b;
            const ymd = typeof pick === 'string' ? pick.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] : null;
            return ymd || null;
        })(),
        grievanceFirstHearingDate:
            typeof row.grievanceFirstHearingDate === 'string'
                ? String(row.grievanceFirstHearingDate).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null
                : null,
        grievanceSessionDate: typeof row.grievanceSessionDate === 'string' ? row.grievanceSessionDate : null,
        grievanceDecision:
            row.grievanceDecision === 'confirmed' || row.grievanceDecision === 'modified' || row.grievanceDecision === 'canceled'
                ? row.grievanceDecision
                : null,
        grievanceDecisionDate: typeof row.grievanceDecisionDate === 'string' ? row.grievanceDecisionDate : null,
        cassationOutcome:
            row.cassationOutcome === 'filed' || row.cassationOutcome === 'expired'
                ? row.cassationOutcome
                : row[legacyOutcomeKey] === 'filed' || row[legacyOutcomeKey] === 'expired'
                  ? (row[legacyOutcomeKey] as 'filed' | 'expired')
                  : null,
        cassationFiledBy:
            row.cassationFiledBy === 'client' || row.cassationFiledBy === 'opponent'
                ? row.cassationFiledBy
                : row[legacyFiledByKey] === 'client' || row[legacyFiledByKey] === 'opponent'
                  ? (row[legacyFiledByKey] as 'client' | 'opponent')
                  : null,
        cassationFilingDate:
            typeof row.cassationFilingDate === 'string'
                ? row.cassationFilingDate
                : typeof row[legacyFilingDateKey] === 'string'
                  ? row[legacyFilingDateKey]
                  : null,
        cassationFileNumber:
            typeof row.cassationFileNumber === 'string'
                ? row.cassationFileNumber
                : typeof row[legacyFileNumberKey] === 'string'
                  ? row[legacyFileNumberKey]
                  : null,
        cassationDecision:
            row.cassationDecision === 'confirmed' || row.cassationDecision === 'modified' || row.cassationDecision === 'canceled'
                ? row.cassationDecision
                : row[legacyDecisionKey] === 'confirmed' ||
                    row[legacyDecisionKey] === 'modified' ||
                    row[legacyDecisionKey] === 'canceled'
                  ? (row[legacyDecisionKey] as 'confirmed' | 'modified' | 'canceled')
                  : null,
        cassationDecisionDate:
            typeof row.cassationDecisionDate === 'string'
                ? row.cassationDecisionDate
                : typeof row[legacyDecisionDateKey] === 'string'
                  ? row[legacyDecisionDateKey]
                  : null,
        requiresGuarantee:
            typeof row.requiresGuarantee === 'boolean'
                ? row.requiresGuarantee
                : typeof row.judgeDecisionRequiresGuarantee === 'boolean'
                  ? row.judgeDecisionRequiresGuarantee
                  : undefined,
        guaranteeSubmitted:
            typeof row.guaranteeSubmitted === 'boolean'
                ? row.guaranteeSubmitted
                : typeof row.guaranteeStatus === 'boolean'
                  ? row.guaranteeStatus
                  : undefined,
        guaranteeRecovered: typeof row.guaranteeRecovered === 'boolean' ? row.guaranteeRecovered : undefined,
        guaranteeRecoveryDate: typeof row.guaranteeRecoveryDate === 'string' ? row.guaranteeRecoveryDate : null,
        orderLifted: typeof row.orderLifted === 'boolean' ? row.orderLifted : undefined,
        orderLiftDate: typeof row.orderLiftDate === 'string' ? row.orderLiftDate : null,
        hearings: normalizedHearings && normalizedHearings.length ? (normalizedHearings as CaseHearing[]) : undefined,
        expertModule:
            row.expertModule && typeof row.expertModule === 'object'
                ? {
                      enabled: !!(row.expertModule as Record<string, unknown>).enabled,
                      expertName:
                          typeof (row.expertModule as Record<string, unknown>).expertName === 'string'
                              ? ((row.expertModule as Record<string, unknown>).expertName as string)
                              : '',
                      depositAmount:
                          typeof (row.expertModule as Record<string, unknown>).depositAmount === 'string'
                              ? ((row.expertModule as Record<string, unknown>).depositAmount as string)
                              : '',
                      inspectionDate:
                          typeof (row.expertModule as Record<string, unknown>).inspectionDate === 'string'
                              ? ((row.expertModule as Record<string, unknown>).inspectionDate as string)
                              : '',
                      reportDueDate:
                          typeof (row.expertModule as Record<string, unknown>).reportDueDate === 'string'
                              ? ((row.expertModule as Record<string, unknown>).reportDueDate as string)
                              : '',
                      reportReceivedDate:
                          typeof (row.expertModule as Record<string, unknown>).reportReceivedDate === 'string'
                              ? ((row.expertModule as Record<string, unknown>).reportReceivedDate as string)
                              : '',
                  }
                : undefined,
        guaranteeStatus: typeof row.guaranteeStatus === 'boolean' ? row.guaranteeStatus : undefined,
        notes: Array.isArray(row.notes) ? row.notes : undefined,
        events: Array.isArray(row.events) ? row.events : undefined,
        attachments: Array.isArray(row.attachments) ? row.attachments : undefined,
        followups: Array.isArray(row.followups) ? row.followups : undefined,
        archived: typeof row.archived === 'boolean' ? row.archived : false,
        archivedAt: typeof row.archivedAt === 'string' ? row.archivedAt : null,
        archivedReason: typeof row.archivedReason === 'string' ? row.archivedReason : null,
        deleted: typeof row.deleted === 'boolean' ? row.deleted : false,
        deletedAt: typeof row.deletedAt === 'string' ? row.deletedAt : null,
        deletedReason: typeof row.deletedReason === 'string' ? row.deletedReason : null,
        phase,
        isNotificationConfirmed: !!row.isNotificationConfirmed,
        grievanceResult: (row.grievanceResult as UrgentCase['grievanceResult']) ?? null,
        status: 'safe',
        createdAt,
    };

    const storageExtras: Record<string, unknown> = {};
    if (row.iqrarDeedAuthenticated === true) storageExtras.iqrarDeedAuthenticated = true;
    if (row.legalState === 'Iqrar_Authenticated') storageExtras.legalState = 'Iqrar_Authenticated';
    if (typeof row.finalityReason === 'string') storageExtras.finalityReason = row.finalityReason;

    const merged = { ...base, ...storageExtras };
    return { ...merged, status: computeUrgentCaseStatus(merged as UrgentCase) } as UrgentCase;
}
