import type { Decision } from '../../types';


import {
    type AppealUiPerspective,
} from '../../appealUiLabels';
import {
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
    isCreditorExecutorAppealSubject,
} from '../appealRequestOrigin';
import { isManualExecutorLedgerDecision } from './manualExecutorIdentity';
import {
    manualExecutorAwaitingCassationParty,
} from './manualExecutorAppealActors';
import { CASSATION_APPEAL_RESULTS, inferAppealMethodsUsed } from './appealMethodsInference';
export { buildGrievanceResolutionPatch, grievancePetitionGranted } from './appealGrievanceResolution';
export { inferAppealMethodsUsed } from './appealMethodsInference';
import {
    appellantLabelFromLogMessage,
    resolveAppealActorLabel,
} from './appealActorLabels';
import {
    cassationEntryPartyAfterGrievanceGrant,
    resolveAppealBaseBranch,
    resolveGrievanceFilerActor,
    resolveHarmedPartyAppealActor,
} from './appealActorFiling';
export {
    cassationEntryPartyAfterGrievanceGrant,
    resolveAppealBaseBranch,
    resolveGrievanceFilerActor,
    resolveHarmedPartyAppealActor,
} from './appealActorFiling';

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

