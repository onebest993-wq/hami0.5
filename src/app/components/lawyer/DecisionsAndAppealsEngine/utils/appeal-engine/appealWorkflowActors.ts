import { createElement, type ReactNode } from 'react';
import { stripEmojisFromText } from '@/app/utils/timelineSmartDisplay';
import type { ExecutionDecisionAppealPhase, ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { Decision } from '../../types';
import {
    decisionCardGlassClasses,
    type DecisionCardEnforcementVisual,
} from '../../decisionCardGlassShell';
import {
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    appealRelabelTimelineMessage,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    EXECUTOR_QUEUE_REQUEST_KINDS,
    hubWithInferredAppealOrigin,
    inferDecisionAppealRequestOrigin,
    isCreditorInitiatedExecutorRequest,
    isCreditorExecutorAppealSubject,
    isCreditorPartyRequest,
    isDecisionLikeRow,
    resolveRequestFilerFromDebtorAgentView,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import { isManualExecutorLedgerDecision } from './manualExecutorIdentity';
import {
    buildManualExecutorGrievanceOutcomePatch,
    manualExecutorAwaitingCassationParty,
    manualExecutorCassationPartyAfterGrievance,
    resolveManualExecutorGrievanceFiler,
} from './manualExecutorLedger';
import { appealGrievanceOutcomeClockPatch } from './appealDates';
import {
    appellantLabelFromLogMessage,
    resolveAppealActorLabel,
} from './appealProceedingsActors';

export type DecisionsAppealsAppealSlot = 'appealsTab' | 'previousCard';

export function appealEntryShowsDebtorFirst(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    return resolveHarmedPartyAppealActor(d, perspective) === 'debtor';
}

/** وكيل الدائن — إحضار جبري بقرار المنفذ أو طلب دائن مُوافق عليه: الطعن للمدين فقط */
export function creditorAgentDebtorIsSoleAppellant(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (perspective !== 'creditor_agent') return false;
    if (d.activatedByExecutorOrder === true) return true;
    if (
        d.appealRequestOrigin === 'executor_side' &&
        d.requestKind === 'personal_coercive'
    ) {
        return true;
    }
    if (d.appealRequestOrigin === 'executor_side') return false;
    return resolveHarmedPartyAppealActor(d, perspective) === 'debtor';
}

/** موافقة منفذ يحق بعدها للمدين التظلم — كل أنواع الطلبات */
export function isDebtorAppealEligibleApprovedHub(
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    const phys = hub.executorOutcome;
    if (phys !== 'approved' && phys !== 'alternative') return false;
    if (isCreditorExecutorAppealSubject(hub, perspective)) return true;
    if (creditorAgentDebtorIsSoleAppellant(hub, perspective)) return true;
    if (perspective === 'creditor_agent' && resolveHarmedPartyAppealActor(hub, perspective) === 'debtor') {
        return true;
    }
    return false;
}

/** الطرف المتضرر الذي يحق له تقديم التظلم أو التمييز المباشر */
export function resolveHarmedPartyAppealActor(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'lawyer' | 'debtor' | null {
    if (d.appealRequestOrigin === 'executor_side') return null;
    const proponent = resolveRequestProponent(d, perspective);
    const ex = d.executorOutcome;
    if (ex === 'approved' || ex === 'alternative') {
        return proponent === 'creditor' ? 'debtor' : 'lawyer';
    }
    if (ex === 'rejected') {
        return proponent === 'creditor' ? 'lawyer' : 'debtor';
    }
    return null;
}

export function resolveAppealBaseBranch(d: Decision): 'after_approval' | 'after_rejection' {
    if (d.appealBaseBranch === 'after_rejection' || d.appealBaseBranch === 'after_approval') {
        return d.appealBaseBranch;
    }
    return d.executorOutcome === 'rejected' ? 'after_rejection' : 'after_approval';
}

/** مُقدّم التظلم — يُستنتج من نتيجة الطعن وفرع القرار (لا يعتمد على appealActor القديم وحده) */
export function resolveGrievanceFilerActor(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'lawyer' | 'debtor' | null {
    if (isManualExecutorLedgerDecision(d)) {
        return resolveManualExecutorGrievanceFiler(d);
    }
    const hub = hubWithInferredAppealOrigin(d);
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);
    const branch = resolveAppealBaseBranch(hub);
    const result = String(d.appealResult ?? '').trim();

    if (result === 'قبول التظلم' || result === 'رد التظلم') {
        if (branch === 'after_approval' && creditorRow) return 'debtor';
        if (branch === 'after_rejection' && creditorRow) return 'lawyer';
        if (branch === 'after_approval' && !creditorRow) return 'lawyer';
        if (branch === 'after_rejection' && !creditorRow) return 'debtor';
    }

    if (d.appealStatus === 'tadhallum_filed' || d.appealPhase === 'grievance') {
        if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
        if (branch === 'after_approval' && creditorRow) return 'debtor';
        if (branch === 'after_rejection' && creditorRow) return 'lawyer';
    }

    if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
    return null;
}

/** true = المُطعّن فاز بالتظلم (قبول التظلم) */
export function grievancePetitionGranted(d: Decision, grievanceAccepted: boolean): boolean {
    if (!grievanceAccepted) return false;
    if (isManualExecutorLedgerDecision(d)) return true;

    const hub = hubWithInferredAppealOrigin(d);
    const filer = resolveGrievanceFilerActor(d);
    const filerIsDebtor = filer === 'debtor';
    const branch = resolveAppealBaseBranch(hub);
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);

    if (!creditorRow) {
        return filerIsDebtor;
    }

    if (branch === 'after_rejection') {
        return filer === 'lawyer';
    }
    return filerIsDebtor;
}

/** الطرف المخالف الذي يحق له التمييز بعد قبول تظلم الطرف الآخر */
export function cassationEntryPartyAfterGrievanceGrant(d: Decision): 'lawyer' | 'debtor' | null {
    if (isManualExecutorLedgerDecision(d)) {
        return manualExecutorCassationPartyAfterGrievance(d, true);
    }
    const branch = resolveAppealBaseBranch(d);
    const filer = resolveGrievanceFilerActor(d);
    const filerIsDebtor = filer === 'debtor';
    const hub = hubWithInferredAppealOrigin(d);
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);
    if (branch === 'after_rejection' && creditorRow && filer === 'lawyer') return 'debtor';
    if (branch === 'after_approval' && creditorRow && filerIsDebtor) return 'lawyer';
    if (branch === 'after_rejection' && !creditorRow && filerIsDebtor) return 'lawyer';
    if (branch === 'after_approval' && !creditorRow && filer === 'lawyer') return 'debtor';
    return null;
}

function attachGrievanceOutcomeCassationClock(
    patch: Partial<Decision>,
    outcomeIssuedYmd?: string
): Partial<Decision> {
    const needsClock =
        Boolean(patch.awaitingCassationEntryBy) ||
        patch.grievanceRejectedAwaitingTamyeez === true ||
        patch.grievanceAcceptedAwaitingDebtorTamyeez === true;
    if (!needsClock) return patch;
    return { ...patch, ...appealGrievanceOutcomeClockPatch(outcomeIssuedYmd) };
}

export function buildGrievanceResolutionPatch(
    d: Decision,
    grievanceAccepted: boolean,
    all?: Decision[],
    outcomeIssuedYmd?: string
): Partial<Decision> {
    const underlying =
        all && all.length > 0 ? resolveUnderlyingDecisionHub(d, all) : d;
    if (isManualExecutorLedgerDecision(d) || isManualExecutorLedgerDecision(underlying)) {
        return buildManualExecutorGrievanceOutcomePatch(d, grievanceAccepted, outcomeIssuedYmd);
    }
    const hub = hubWithInferredAppealOrigin(d);
    const granted = grievancePetitionGranted(d, grievanceAccepted);
    const branch = resolveAppealBaseBranch(hub);
    const appealResult: NonNullable<Decision['appealResult']> = grievanceAccepted
        ? 'قبول التظلم'
        : 'رد التظلم';
    const phys = hub.executorOutcome;
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);

    /** تظلم المدين على طلب دائن موافق عليه (حجز/تخلية/جبري…) — إيقاف مؤقت لا إعادة دورة */
    if (
        grievanceAccepted &&
        creditorRow &&
        (phys === 'approved' || phys === 'alternative') &&
        branch === 'after_approval' &&
        resolveGrievanceFilerActor(d) === 'debtor'
    ) {
        return attachGrievanceOutcomeCassationClock(
            {
                appealPhase: null,
                appealStatus: 'pending',
                appealResult,
                appealWorkflowState: 'PENDING_APPEAL_LAWYER',
                executorOutcome: phys,
                status: 'accepted',
                awaitingCassationEntryBy: 'lawyer',
                grievanceRejectedAwaitingTamyeez: false,
                grievanceAcceptedAwaitingDebtorTamyeez: false,
                appealMethod: 'tadhallum',
                noAppealChosen: false,
            },
            outcomeIssuedYmd
        );
    }

    if (granted) {
        const outcome =
            branch === 'after_rejection'
                ? { executorOutcome: 'approved' as const, status: 'accepted' as const }
                : { executorOutcome: 'approved' as const, status: 'accepted' as const };
        const cassationParty = cassationEntryPartyAfterGrievanceGrant(d);
        if (cassationParty) {
            return attachGrievanceOutcomeCassationClock(
                {
                    appealPhase: null,
                    appealStatus: 'pending',
                    appealResult,
                    appealWorkflowState:
                        cassationParty === 'debtor'
                            ? ('PENDING_APPEAL_DEBTOR' as const)
                            : ('PENDING_APPEAL_LAWYER' as const),
                    ...outcome,
                    awaitingCassationEntryBy: cassationParty,
                    grievanceRejectedAwaitingTamyeez: false,
                    grievanceAcceptedAwaitingDebtorTamyeez: cassationParty === 'debtor',
                    appealMethod: 'tadhallum',
                    noAppealChosen: false,
                },
                outcomeIssuedYmd
            );
        }
        return {
            appealPhase: null,
            appealStatus: 'final',
            appealResult,
            appealWorkflowState:
                branch === 'after_rejection' ? ('FINAL_ACCEPTED' as const) : ('FINAL_REJECTED' as const),
            ...outcome,
            awaitingCassationEntryBy: null,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            appealMethod: 'tadhallum',
            noAppealChosen: false,
        };
    }

    const standing =
        branch === 'after_rejection'
            ? { executorOutcome: 'rejected' as const, status: 'rejected' as const }
            : { executorOutcome: 'approved' as const, status: 'accepted' as const };

    if (branch === 'after_approval') {
        return attachGrievanceOutcomeCassationClock(
            {
                appealPhase: null,
                appealStatus: 'pending',
                appealResult,
                appealWorkflowState: 'PENDING_APPEAL_DEBTOR',
                ...standing,
                awaitingCassationEntryBy: 'debtor',
                grievanceRejectedAwaitingTamyeez: true,
                grievanceAcceptedAwaitingDebtorTamyeez: false,
                appealMethod: null,
                noAppealChosen: false,
            },
            outcomeIssuedYmd
        );
    }

    return attachGrievanceOutcomeCassationClock(
        {
            appealPhase: null,
            appealStatus: 'pending',
            appealResult,
            appealWorkflowState: 'NONE',
            ...standing,
            grievanceRejectedAwaitingTamyeez: true,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            awaitingCassationEntryBy: d.appealActor ?? null,
            appealMethod: null,
            noAppealChosen: false,
        },
        outcomeIssuedYmd
    );
}

export function petitionGrantedAfterCassation(d: Decision, choice: 'rad_laheeza' | 'naqd'): boolean {
    const filerIsDebtor = resolveCassationFilerActor(d) === 'debtor';
    const rad = choice === 'rad_laheeza';
    const hub = hubWithInferredAppealOrigin(d);
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);

    if (creditorRow) {
        return filerIsDebtor ? rad : !rad;
    }

    const branch = resolveAppealBaseBranch(hub);
    if (branch === 'after_approval') {
        if (filerIsDebtor) return !rad;
        return rad;
    }
    if (filerIsDebtor) return !rad;
    return rad;
}

export function cassationButtonTitles(
    decision: Decision,
    perspective: import('../../appealUiLabels').AppealUiPerspective = 'creditor_agent'
): { rad: string; naqd: string } {
    const hub = hubWithInferredAppealOrigin(decision);
    const creditorPartyRequest = isCreditorInitiatedExecutorRequest(hub);
    const trueDebtorRequest = !creditorPartyRequest;
    if (perspective === 'debtor_agent') {
        if (trueDebtorRequest) {
            return {
                rad: 'تصديق القرار يعني تثبيت ما قرره المنفذ لصالح موكّلنا في هذا الطلب.',
                naqd: 'نقض القرار يعني تغيير نتيجة المنفذ لصالح موكّلنا — وفق مسار التمييز.',
            };
        }
        return {
            rad: 'تصديق القرار يعني تثبيت قرار المنفذ بشأن طلب الدائن.',
            naqd: 'نقض القرار يعني نقض قرار المنفذ في شأن طلب الدائن — لصالح موكّلنا عند الاقتضاء.',
        };
    }
    if (creditorPartyRequest) {
        return {
            rad: 'تصديق القرار يعني تثبيت طلبنا وما سجّله المنفذ لصالح طلب التنفيذ الذي قدّمناه.',
            naqd: 'نقض هذا القرار يعني رفض طلب المدين وإيقاف الإجراء — بحسب ما ينطبق على هذه الإضبارة.',
        };
    }
    return {
        rad: 'تصديق القرار يعني تثبيت ما قرره المنفذ بشأن طلب الطرف الآخر (المدين).',
        naqd: 'نقض القرار يعني تغيير نتيجة المنفذ في شأن طلب المدين — قبولاً أو رفضاً نهائياً وفق مسار التمييز.',
    };
}

const CASSATION_APPEAL_RESULTS = new Set(['رد اللائحة', 'نقض القرار', 'تصديق القرار']);

/** من قدّم التمييز فعلياً — الطرف المخالف بعد قبول تظلم الطرف الآخر */
export function resolveCassationFilerActor(d: Decision): 'lawyer' | 'debtor' | null {
    if (isManualExecutorLedgerDecision(d)) {
        const manual = d.manualCassationAppellants ?? [];
        if (manual.length === 1) return manual[0]!;
        if (d.appealStatus === 'tamyeez_filed' || d.appealPhase === 'cassation') {
            if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
        }
        return manualExecutorAwaitingCassationParty(d);
    }
    const logs = Array.isArray(d.appealTimelineLogs) ? [...d.appealTimelineLogs] : [];
    logs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    for (let i = logs.length - 1; i >= 0; i--) {
        const m = String(logs[i]?.message || '');
        if (/تم تسجيل تمييز|تسجيل تمييز|سُجِّل تمييز|تمييز المدين|تمييز وكيل/.test(m)) {
            if (/تمييز المدين|المدين.*تمييز/.test(m)) return 'debtor';
            if (/تمييز وكيل|وكيل الدائن/.test(m)) return 'lawyer';
            const fromLog = appellantLabelFromLogMessage(m);
            if (fromLog === 'المدين') return 'debtor';
            if (fromLog === 'الدائن') return 'lawyer';
        }
    }

    const methods = inferAppealMethodsUsed(d);
    const grievanceAccepted =
        d.appealResult === 'قبول التظلم' ||
        logs.some((l) => /قبول التظلم|قُبل التظلم/.test(String(l.message || '')));

    if (methods.tadhallum && methods.tamyeez && grievanceAccepted) {
        const party = cassationEntryPartyAfterGrievanceGrant(d);
        if (party) return party;
    }

    if (
        d.appealMethod === 'tamyeez' ||
        d.appealPhase === 'cassation' ||
        d.appealStatus === 'tamyeez_filed' ||
        CASSATION_APPEAL_RESULTS.has(String(d.appealResult || '').trim())
    ) {
        if (d.awaitingCassationEntryBy === 'lawyer' || d.awaitingCassationEntryBy === 'debtor') {
            return d.awaitingCassationEntryBy;
        }
        if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') {
            const grievanceOnly =
                methods.tadhallum &&
                grievanceAccepted &&
                d.appealMethod !== 'tamyeez' &&
                d.appealPhase !== 'cassation' &&
                d.appealStatus !== 'tamyeez_filed';
            if (!grievanceOnly) return d.appealActor;
            const entitled = cassationEntryPartyAfterGrievanceGrant(d);
            if (entitled) return entitled;
        }
    }

    if (d.grievanceRejectedAwaitingTamyeez) {
        return d.awaitingCassationEntryBy ?? d.appealActor ?? null;
    }

    return d.awaitingCassationEntryBy ?? d.appealActor ?? null;
}

export function resolveCassationAppellantLabel(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    const actor = resolveCassationFilerActor(d);
    if (actor === 'lawyer') return 'الدائن';
    if (actor === 'debtor') return perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    return resolveAppealActorLabel(d, perspective);
}

export function inferAppealMethodsUsed(d: Decision): { tadhallum: boolean; tamyeez: boolean } {
    const logs = Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : [];
    const logText = logs.map((l) => l.message).join('\n');
    const appealResult = String(d.appealResult || '').trim();
    const grievanceOutcomeOnly =
        (appealResult === 'قبول التظلم' || appealResult === 'رد التظلم') &&
        d.appealStatus !== 'tamyeez_filed' &&
        d.appealPhase !== 'cassation';
    const tamyeez =
        d.appealStatus === 'tamyeez_filed' ||
        d.appealPhase === 'cassation' ||
        Boolean(String(d.tamyeezDecisionNumber || '').trim()) ||
        CASSATION_APPEAL_RESULTS.has(appealResult) ||
        appealResult === 'نقض القرار' ||
        (!grievanceOutcomeOnly &&
            (d.appealMethod === 'tamyeez' ||
                /تم تسجيل تمييز|تسجيل تمييز|سُجِّل تمييز|تمييز المدين|تمييز وكيل/.test(logText) ||
                (/رد اللائحة|نقض القرار|تصديق القرار/.test(logText) && !/تظلم/.test(logText))));
    const tadhallum =
        d.appealMethod === 'tadhallum' ||
        d.appealPhase === 'grievance' ||
        d.appealStatus === 'tadhallum_filed' ||
        appealResult === 'قبول التظلم' ||
        appealResult === 'رد التظلم' ||
        /تظلم/.test(logText) ||
        /قبول التظلم|رد التظلم/.test(logText);
    return { tadhallum, tamyeez };
}

