import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { appealGrievanceFilingClockPatch } from './appealDates';
import {
    resolveGrievanceFilerActor,
    resolveCassationAppellantLabel,
    inferAppealMethodsUsed,
} from './appealWorkflowActors';
import {
    manualExecutorAwaitingCassationParty,
} from './manualExecutorLedger';
import type { AppealProceedingRow, ManualAppealAppellantActor } from './appealProceedingsTypes';
import {
    formatManualAppealAppellantsLabel,
} from './appealProceedingsTypes';
import {
    resolveAppealActorLabel,
    isCassationAffirmResult,
    resolveEffectiveAwaitingCassationParty,
    appellantLabelFromLogMessage,
} from './appealProceedingsActors';

function resolveManualGrievanceProceedingResult(row: Decision): string {
    const r = String(row.appealResult ?? '').trim();
    if (r === 'قبول التظلم' || r === 'رد التظلم') return r;
    if (row.appealStatus === 'tadhallum_filed' || row.appealPhase === 'grievance') return 'قيد النظر';
    return '—';
}

function resolveManualCassationProceedingResult(row: Decision): string {
    const r = String(row.appealResult ?? '').trim();
    if (r === 'نقض القرار') return 'نقض القرار';
    if (isCassationAffirmResult(r)) return 'تصديق القرار';
    if (row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation') return 'قيد النظر';
    return '—';
}

export function buildExecutorSideAppealCommitPatch(
    stage: 'grievance' | 'cassation',
    appellants: ManualAppealAppellantActor[]
): Partial<Decision> {
    const filtered = appellants.filter((a) => a === 'lawyer' || a === 'debtor');
    const hasLawyer = filtered.includes('lawyer');
    const hasDebtor = filtered.includes('debtor');
    const isGrievance = stage === 'grievance';
    const primaryActor = filtered.length === 1 ? filtered[0] : null;

    return {
        executorOutcome: 'rejected',
        appealBaseBranch: 'after_rejection',
        status: 'rejected',
        appealRequestOrigin:
            hasLawyer && !hasDebtor
                ? 'creditor_side'
                : hasDebtor && !hasLawyer
                  ? 'debtor_side'
                  : 'executor_side',
        noAppealChosen: false,
        appealActor: primaryActor,
        appealMethod: isGrievance ? 'tadhallum' : 'tamyeez',
        appealWorkflowState:
            primaryActor === 'debtor'
                ? 'PENDING_APPEAL_DEBTOR'
                : primaryActor === 'lawyer'
                  ? 'PENDING_APPEAL_LAWYER'
                  : undefined,
        appealStatus: isGrievance ? 'tadhallum_filed' : 'tamyeez_filed',
        appealPhase: isGrievance ? 'grievance' : 'cassation',
        ...(isGrievance
            ? { manualGrievanceAppellants: filtered, ...appealGrievanceFilingClockPatch() }
            : { manualCassationAppellants: filtered }),
    };
}

export function executorSideAppealTimelineMessage(
    stage: 'grievance' | 'cassation',
    appellants: ManualAppealAppellantActor[],
    perspective: AppealUiPerspective
): string {
    const names = appellants.map((actor) => {
        if (actor === 'lawyer') return 'الدائن';
        return perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    });
    const joined = names.join(' و');
    if (stage === 'grievance') {
        return `تم تسجيل تظلم ${joined} على قرار المنفذ.`;
    }
    return `سُجِّل تمييز ${joined} على قرار المنفذ.`;
}

export function buildManualExecutorAppealProceedings(
    row: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): AppealProceedingRow[] {
    const rows: AppealProceedingRow[] = [];
    const grievanceActors = row.manualGrievanceAppellants ?? [];
    if (grievanceActors.length > 0) {
        rows.push({
            stage: 'تظلم',
            appellant: formatManualAppealAppellantsLabel(grievanceActors, perspective),
            result: resolveManualGrievanceProceedingResult(row),
        });
    }
    const grievanceResult = String(row.appealResult ?? '').trim();
    const cassationActors = row.manualCassationAppellants ?? [];
    const cassationFiled =
        row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation';
    if (cassationActors.length > 0 || cassationFiled || grievanceResult === 'قبول التظلم' || grievanceResult === 'رد التظلم') {
        let cassAppellant = '';
        if (cassationFiled || cassationActors.length > 0) {
            cassAppellant =
                cassationActors.length > 0
                    ? formatManualAppealAppellantsLabel(cassationActors, perspective)
                    : resolveCassationAppellantLabel(row, perspective);
        } else if (grievanceResult === 'قبول التظلم') {
            const awaiting = manualExecutorAwaitingCassationParty(row);
            cassAppellant = awaiting ? cassationAwaitingAppellantLabel(awaiting, perspective) : '';
        } else if (grievanceResult === 'رد التظلم') {
            cassAppellant = grievanceAppellantLabel(row, perspective);
        }
        const cassResult = cassationFiled
            ? resolveManualCassationProceedingResult(row)
            : grievanceResult === 'قبول التظلم' || grievanceResult === 'رد التظلم'
              ? 'بانتظار التسجيل'
              : resolveManualCassationProceedingResult(row);
        if (cassResult !== '—') {
            rows.push({
                stage: 'تمييز',
                appellant: cassAppellant,
                result: cassResult,
            });
        }
    }
    return rows.filter((r) => r.result !== '—');
}

export function grievanceAppellantLabel(
    row: Decision,
    perspective: AppealUiPerspective
): string {
    const actor = resolveGrievanceFilerActor(row, perspective);
    if (actor === 'lawyer') return 'الدائن';
    if (actor === 'debtor') return perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    return resolveAppealActorLabel(row, perspective);
}

function cassationAwaitingAppellantLabel(
    awaiting: 'lawyer' | 'debtor',
    perspective: AppealUiPerspective
): string {
    if (awaiting === 'lawyer') return 'الدائن';
    return perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
}

/** نتيجة تظلم مسجّلة بينما مسار التظلم لا يزال مفتوحاً — لا يُستنتج تمييز بعد */
export function isGrievanceOutcomeWithoutCassationWindow(row: Decision): boolean {
    const grievanceResult = String(row.appealResult ?? '').trim();
    if (grievanceResult !== 'قبول التظلم' && grievanceResult !== 'رد التظلم') {
        return false;
    }
    if (row.awaitingCassationEntryBy || row.grievanceRejectedAwaitingTamyeez) {
        return false;
    }
    if (row.appealStatus === 'pending' || row.appealStatus === 'final') {
        return false;
    }
    return row.appealStatus === 'tadhallum_filed' && row.appealPhase === 'grievance';
}

/** يبني مسار الطعن من الحالة الفعلية — دون سجل قديم متعارض */
export function buildAuthoritativeAppealProceedings(
    row: Decision,
    perspective: AppealUiPerspective
): AppealProceedingRow[] {
    const grievanceResult = String(row.appealResult ?? '').trim();
    const rows: AppealProceedingRow[] = [
        {
            stage: 'تظلم',
            appellant: grievanceAppellantLabel(row, perspective),
            result: grievanceResult,
        },
    ];

    const cassationFiled =
        row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation';
    const awaiting = resolveEffectiveAwaitingCassationParty(row);

    if (cassationFiled) {
        rows.push({
            stage: 'تمييز',
            appellant: resolveCassationAppellantLabel(row, perspective),
            result: 'قيد النظر',
        });
        return rows;
    }

    if (
        grievanceResult === 'قبول التظلم' &&
        awaiting &&
        !isGrievanceOutcomeWithoutCassationWindow(row)
    ) {
        rows.push({
            stage: 'تمييز',
            appellant: '',
            result: 'بانتظار التسجيل',
        });
    } else if (
        grievanceResult === 'رد التظلم' &&
        (row.grievanceRejectedAwaitingTamyeez || awaiting)
    ) {
        rows.push({
            stage: 'تمييز',
            appellant: grievanceAppellantLabel(row, perspective),
            result: 'بانتظار التسجيل',
        });
    }

    return rows;
}

/** مسار طعن نهائي (تمييز) — مرحلة تظلم واحدة + نتيجة التمييز من الحالة الفعلية */
export function buildAuthoritativeAppealProceedingsFromFinal(
    row: Decision,
    perspective: AppealUiPerspective
): AppealProceedingRow[] {
    const logs = Array.isArray(row.appealTimelineLogs) ? [...row.appealTimelineLogs] : [];
    logs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const rows: AppealProceedingRow[] = [];
    let openGrievanceAppellant: string | null = null;
    let lastGrievance: AppealProceedingRow | null = null;

    for (const log of logs) {
        const m = String(log.message || '').replace(/\s+/g, ' ').trim();
        if (!m) continue;

        if (/تم تسجيل تظلم|تسجيل تظلم/.test(m)) {
            openGrievanceAppellant =
                appellantLabelFromLogMessage(m, perspective) ?? resolveAppealActorLabel(row, perspective);
            continue;
        }
        if (/قبول التظلم|قُبل التظلم/.test(m)) {
            const fromLog = appellantLabelFromLogMessage(m, perspective);
            if (!openGrievanceAppellant && !fromLog && lastGrievance) {
                continue;
            }
            const appellant =
                openGrievanceAppellant ?? fromLog ?? grievanceAppellantLabel(row, perspective);
            lastGrievance = { stage: 'تظلم', appellant, result: 'قبول التظلم' };
            openGrievanceAppellant = null;
            continue;
        }
        if (/رد التظلم|رُد التظلم/.test(m)) {
            const fromLog = appellantLabelFromLogMessage(m, perspective);
            if (!openGrievanceAppellant && !fromLog && lastGrievance) {
                continue;
            }
            const appellant =
                openGrievanceAppellant ?? fromLog ?? grievanceAppellantLabel(row, perspective);
            lastGrievance = { stage: 'تظلم', appellant, result: 'رد التظلم' };
            openGrievanceAppellant = null;
        }
    }

    if (lastGrievance) {
        if (!lastGrievance.appellant || lastGrievance.appellant === '—') {
            lastGrievance = {
                ...lastGrievance,
                appellant: grievanceAppellantLabel(row, perspective),
            };
        }
        rows.push(lastGrievance);
    } else if (inferAppealMethodsUsed(row).tadhallum) {
        rows.push({
            stage: 'تظلم',
            appellant: grievanceAppellantLabel(row, perspective),
            result: '—',
        });
    }

    const cassResult = String(row.appealResult ?? '').trim();
    if (
        cassResult === 'نقض القرار' ||
        isCassationAffirmResult(cassResult) ||
        inferAppealMethodsUsed(row).tamyeez
    ) {
        rows.push({
            stage: 'تمييز',
            appellant: resolveCassationAppellantLabel(row, perspective),
            result: isCassationAffirmResult(cassResult) ? 'تصديق القرار' : cassResult || '—',
        });
    }

    return rows.filter((r) => r.result !== '—');
}

export function shouldRebuildAppealProceedingsFromState(
    row: Decision,
    parsed: AppealProceedingRow[]
): boolean {
    const grievanceRows = parsed.filter((r) => r.stage === 'تظلم');
    const cassationRows = parsed.filter((r) => r.stage === 'تمييز');
    if (grievanceRows.length > 1 || cassationRows.length > 1) return true;

    const authoritative = String(row.appealResult ?? '').trim();
    if (
        row.appealStatus === 'final' &&
        (isCassationAffirmResult(authoritative) || authoritative === 'نقض القرار')
    ) {
        return true;
    }

    if (authoritative !== 'قبول التظلم' && authoritative !== 'رد التظلم') {
        return false;
    }
    if (grievanceRows.some((r) => r.result !== authoritative)) return true;

    const cassationActive =
        row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation';
    if (
        parsed.some(
            (r) => r.stage === 'تمييز' && r.result === 'قيد النظر' && !cassationActive
        )
    ) {
        return true;
    }

    if (grievanceRows.length === 1) {
        const expected = grievanceAppellantLabel(row, 'creditor_agent');
        const debtorExpected = grievanceAppellantLabel(row, 'debtor_agent');
        const g = grievanceRows[0];
        if (
            g.result === authoritative &&
            g.appellant !== expected &&
            g.appellant !== debtorExpected &&
            g.appellant !== 'موكّلنا' &&
            g.appellant !== 'المدين'
        ) {
            return true;
        }
    }

    return false;
}
