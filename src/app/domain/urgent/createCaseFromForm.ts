import {
    computeUrgentCaseStatus,
    type UrgentCase,
} from '@/app/components/lawyer/Component_Urgent_Card';
import { uuidv4 } from '@/app/services/urgent-actions-db';
import { resolveProcedureCategory } from './procedureCategory';
import type { UrgentFormSavePayload } from './types';

const DEFAULT_MS_PER_DAY = 1000 * 60 * 60 * 24;

function resolveRepresentedParty(data: UrgentFormSavePayload): 'client' | 'opponent' | null {
    const p1 = Array.isArray(data.allParty1) ? data.allParty1 : [];
    const p2 = Array.isArray(data.allParty2) ? data.allParty2 : [];
    const p1Rep = p1.some((p) => {
        const row = p && typeof p === 'object' ? (p as Record<string, unknown>) : null;
        return !!row?.isRepresented || !!row?.isClient;
    });
    const p2Rep = p2.some((p) => {
        const row = p && typeof p === 'object' ? (p as Record<string, unknown>) : null;
        return !!row?.isRepresented || !!row?.isClient;
    });
    if (p1Rep && !p2Rep) return 'client';
    if (p2Rep && !p1Rep) return 'opponent';
    if (data.representedParty === 'client' || data.representedParty === 'opponent') return data.representedParty;
    return null;
}

type CreateCaseFromFormOptions = {
    now?: Date;
    msPerDay?: number;
};

/** يبني UrgentCase جديداً من حمولة Form_Urgent_Actions بعد الحفظ */
export function createCaseFromForm(data: UrgentFormSavePayload, opts?: CreateCaseFromFormOptions): UrgentCase {
    const now = opts?.now ?? new Date();
    const msPerDay = opts?.msPerDay ?? DEFAULT_MS_PER_DAY;
    const nowYmd = now.toISOString().slice(0, 10);
    const requestDateRaw = typeof data.requestDate === 'string' ? data.requestDate : null;
    const requestDate = requestDateRaw ? new Date(requestDateRaw) : now;
    const specificActionType =
        typeof data.specificActionType === 'string' ? data.specificActionType.trim() : 'طلب مستعجل';
    const procedureCategory =
        data.procedureCategory === 'petition_orders' || data.procedureCategory === 'urgent_judiciary'
            ? data.procedureCategory
            : resolveProcedureCategory(null, specificActionType);
    const pathway =
        procedureCategory === 'urgent_judiciary' ||
        data.actionType === 'urgent_discovery' ||
        data.actionType === 'acknowledgment'
            ? 'urgent_action'
            : 'state_order';
    const startAtGrievance = data?.initialEntryMode === 'grievance';
    const startDefenderPhase2 = data?.initialEntryMode === 'defender_phase2';
    const startDefenderPhase3 = data?.initialEntryMode === 'defender_phase3';
    const judgeDecisionDate =
        typeof data?.initialJudgeDecisionDate === 'string' && data.initialJudgeDecisionDate
            ? data.initialJudgeDecisionDate
            : nowYmd;
    const hasIntervention = data?.hasIntervention === true;
    const guaranteeKind =
        data?.guaranteeKind === 'cash' ||
        data?.guaranteeKind === 'personal' ||
        data?.guaranteeKind === 'real_estate' ||
        data?.guaranteeKind === 'none'
            ? data.guaranteeKind
            : null;
    const guaranteeDetailsText = typeof data?.guaranteeDetailsText === 'string' ? data.guaranteeDetailsText : null;
    const defaultDeadlineDays = pathway === 'state_order' ? 3 : 7;
    const deadlineDays =
        typeof data.deadlineDays === 'number' && Number.isFinite(data.deadlineDays) && data.deadlineDays > 0
            ? data.deadlineDays
            : defaultDeadlineDays;
    const derivedDeadline = new Date(requestDate.getTime() + deadlineDays * msPerDay);
    const firstHearingYmd =
        typeof data.firstHearingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.firstHearingDate.trim())
            ? data.firstHearingDate.trim()
            : null;

    const newCaseBase: UrgentCase = {
        id: uuidv4(),
        type: pathway === 'state_order' ? 'state_order' : 'urgent_action',
        actionType: specificActionType,
        applicantName: typeof data.party1Name === 'string' ? data.party1Name : 'مقدم الطلب',
        court: typeof data.courtName === 'string' ? data.courtName : 'غير محدد',
        requestNumber: typeof data.requestNumber === 'string' ? data.requestNumber : '',
        requestDate: typeof data.requestDate === 'string' ? data.requestDate : '',
        courtName: typeof data.courtName === 'string' ? data.courtName : '',
        judgeName: typeof data.judgeName === 'string' ? data.judgeName : '',
        specificActionType,
        procedureCategory,
        procedureDetails: typeof data.procedureDetails === 'string' ? data.procedureDetails.trim() : '',
        requestSubject: typeof data.requestSubject === 'string' ? data.requestSubject : '',
        urgentReason: typeof data.urgentReason === 'string' ? data.urgentReason : '',
        legalBasis: typeof data.legalBasis === 'string' ? data.legalBasis : '',
        requestNotes: typeof data.notes === 'string' ? data.notes : '',
        hasIntervention,
        guaranteeKind,
        guaranteeDetailsText,
        feeReceiptNumber: typeof data.feeReceiptNumber === 'string' ? data.feeReceiptNumber : null,
        feeReceiptDate: typeof data.feeReceiptDate === 'string' ? data.feeReceiptDate : null,
        initialNotificationMethod:
            data.initialNotificationMethod === 'personal' ||
            data.initialNotificationMethod === 'by_agent' ||
            data.initialNotificationMethod === 'publication'
                ? data.initialNotificationMethod
                : null,
        initialNotificationDate: typeof data.initialNotificationDate === 'string' ? data.initialNotificationDate : null,
        party1Name: typeof data.party1Name === 'string' ? data.party1Name : '',
        party1Phone: typeof data.party1Phone === 'string' ? data.party1Phone : '',
        party1Address: typeof data.party1Address === 'string' ? data.party1Address : '',
        party2Name: typeof data.party2Name === 'string' ? data.party2Name : '',
        party2Address: typeof data.party2Address === 'string' ? data.party2Address : '',
        allParty1: Array.isArray(data.allParty1) ? data.allParty1 : undefined,
        allParty2: Array.isArray(data.allParty2) ? data.allParty2 : undefined,
        representedParty: resolveRepresentedParty(data),
        deadlineDate: derivedDeadline,
        sessionDate: pathway !== 'state_order' && firstHearingYmd ? firstHearingYmd : null,
        notificationDate: null,
        deadlineDays,
        preDecisionClosed: startDefenderPhase3 ? true : false,
        expectedDecisionDate: null,
        judgeDecision: startDefenderPhase2 || startDefenderPhase3 ? 'rejected' : startAtGrievance ? 'accepted' : null,
        judgeDecisionDate: startDefenderPhase2
            ? typeof data.stateOrderIssuedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.stateOrderIssuedDate)
                ? data.stateOrderIssuedDate
                : judgeDecisionDate
            : startDefenderPhase3
              ? typeof data.requestDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.requestDate)
                  ? data.requestDate
                  : judgeDecisionDate
              : startAtGrievance
                ? judgeDecisionDate
                : null,
        legalState: startDefenderPhase2
            ? 'Awaiting_Grievance'
            : startDefenderPhase3
              ? 'Awaiting_Cassation'
              : startAtGrievance
                ? 'Awaiting_Grievance'
                : null,
        phase: startDefenderPhase3
            ? 'cassation_window'
            : startDefenderPhase2 || startAtGrievance
              ? 'grievance_window'
              : procedureCategory === 'petition_orders'
                ? 'grievance_window'
                : 'notification_pending',
        defenderEntryPhase:
            typeof data.defenderEntryPhase === 'number' &&
            (data.defenderEntryPhase === 1 || data.defenderEntryPhase === 2 || data.defenderEntryPhase === 3)
                ? data.defenderEntryPhase
                : null,
        clientRole: data.clientRole === 'respondent' || data.clientRole === 'applicant' ? data.clientRole : null,
        stateOrderIssuedDate:
            typeof data.stateOrderIssuedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.stateOrderIssuedDate)
                ? data.stateOrderIssuedDate
                : null,
        grievanceOutcome: startDefenderPhase3 ? 'filed' : null,
        grievanceFilingDate: startDefenderPhase3 ? (typeof data.requestDate === 'string' ? data.requestDate : null) : null,
        grievanceFirstHearingDate: startDefenderPhase3
            ? typeof data.requestDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.requestDate)
                ? data.requestDate
                : null
            : null,
        grievanceDecision: startDefenderPhase3 ? 'confirmed' : null,
        grievanceDecisionDate:
            startDefenderPhase3 &&
            typeof data.defenderPhase3GrievanceDecisionDate === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(data.defenderPhase3GrievanceDecisionDate)
                ? data.defenderPhase3GrievanceDecisionDate
                : null,
        firstHearingDate:
            startDefenderPhase2 &&
            typeof data.stateOrderIssuedDate === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(data.stateOrderIssuedDate)
                ? data.stateOrderIssuedDate
                : firstHearingYmd,
        isNotificationConfirmed: false,
        grievanceResult: null,
        archived: false,
        archivedAt: null,
        archivedReason: null,
        deleted: false,
        deletedAt: null,
        deletedReason: null,
        hearings: [],
        expertModule: {
            enabled: false,
            expertName: '',
            depositAmount: '',
            inspectionDate: '',
            reportDueDate: '',
            reportReceivedDate: '',
        },
        status: 'safe',
        createdAt: now,
    };

    return { ...newCaseBase, status: computeUrgentCaseStatus(newCaseBase) };
}
