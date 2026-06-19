import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import {
    inferAppealMethodsUsed,
    resolveCassationAppellantLabel,
    resolveGrievanceFilerActor,
} from './appealWorkflowActors';
import type { AppealProceedingRow } from './appealProceedingsTypes';
import { hasManualExecutorAppealAppellants } from './appealProceedingsTypes';
import { buildManualExecutorAppealProceedings, shouldRebuildAppealProceedingsFromState, buildAuthoritativeAppealProceedings, buildAuthoritativeAppealProceedingsFromFinal, grievanceAppellantLabel, isGrievanceOutcomeWithoutCassationWindow } from './appealProceedingsManual';
import {
    isCassationAffirmResult,
    resolveAppealActorLabel,
    resolveEffectiveAwaitingCassationParty,
    appellantLabelFromLogMessage,
} from './appealProceedingsActors';

/** بعد التظلم: إخفاء طاعن التمييز عند القبول، وإظهار مقدّم التظلم عند الرد */
function finalizeAppealProceedingsRows(
    rows: AppealProceedingRow[],
    row: Decision,
    perspective: AppealUiPerspective
): AppealProceedingRow[] {
    const grievanceResult = String(row.appealResult ?? '').trim();
    let out = rows.filter((r) => r.result !== '—');
    const hasGrievance = out.some((r) => r.stage === 'تظلم');
    const hasCassation = out.some((r) => r.stage === 'تمييز');
    const cassationFiled =
        row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation';

    const grievanceOutcomeDecided =
        grievanceResult === 'قبول التظلم' || grievanceResult === 'رد التظلم';

    if (
        grievanceOutcomeDecided &&
        hasGrievance &&
        !hasCassation &&
        !cassationFiled &&
        !isGrievanceOutcomeWithoutCassationWindow(row)
    ) {
        const grievanceRow = out.find((r) => r.stage === 'تظلم');
        out.push({
            stage: 'تمييز',
            appellant:
                grievanceResult === 'قبول التظلم'
                    ? ''
                    : grievanceRow?.appellant || grievanceAppellantLabel(row, perspective),
            result: 'بانتظار التسجيل',
        });
    }

    return out.map((r) => {
        if (r.stage !== 'تمييز') return r;
        if (
            cassationFiled ||
            r.result === 'قيد النظر' ||
            r.result === 'نقض القرار' ||
            isCassationAffirmResult(r.result)
        ) {
            return r;
        }
        if (grievanceResult === 'قبول التظلم') {
            return { ...r, appellant: '' };
        }
        if (grievanceResult === 'رد التظلم') {
            const grievanceRow = out.find((x) => x.stage === 'تظلم');
            return {
                ...r,
                appellant: grievanceRow?.appellant || grievanceAppellantLabel(row, perspective),
            };
        }
        return r;
    });
}

/** إجراءات الطعن المسجّلة على القرار — مرحلة، طاعن، نتيجة */
export function buildAppealProceedingsForDecision(
    row: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): AppealProceedingRow[] {
    const logs = Array.isArray(row.appealTimelineLogs) ? [...row.appealTimelineLogs] : [];
    logs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    if (
        logs.length === 0 &&
        hasManualExecutorAppealAppellants(row) &&
        (row.manualExecutorLedgerEntry === true || row.appealRequestOrigin === 'executor_side')
    ) {
        return buildManualExecutorAppealProceedings(row, perspective);
    }

    const rows: AppealProceedingRow[] = [];
    let openGrievanceAppellant: string | null = null;
    let openCassationAppellant: string | null = null;

    for (const log of logs) {
        const m = String(log.message || '').replace(/\s+/g, ' ').trim();
        if (!m) continue;

        if (/تم تسجيل تظلم|تسجيل تظلم/.test(m)) {
            openGrievanceAppellant =
                appellantLabelFromLogMessage(m, perspective) ?? resolveAppealActorLabel(row, perspective);
            continue;
        }
        if (/تم تسجيل تمييز|تسجيل تمييز|سُجِّل تمييز|تمييز المدين|تمييز وكيل/.test(m)) {
            openCassationAppellant =
                appellantLabelFromLogMessage(m, perspective) ?? resolveAppealActorLabel(row, perspective);
            continue;
        }
        if (/قبول التظلم|قُبل التظلم/.test(m)) {
            rows.push({
                stage: 'تظلم',
                appellant:
                    openGrievanceAppellant ?? appellantLabelFromLogMessage(m, perspective) ?? '—',
                result: 'قبول التظلم',
            });
            openGrievanceAppellant = null;
            continue;
        }
        if (/رد التظلم|رُد التظلم/.test(m)) {
            rows.push({
                stage: 'تظلم',
                appellant:
                    openGrievanceAppellant ?? appellantLabelFromLogMessage(m, perspective) ?? '—',
                result: 'رد التظلم',
            });
            openGrievanceAppellant = null;
            continue;
        }
        if (/رد اللائحة|تصديق القرار/.test(m)) {
            rows.push({
                stage: 'تمييز',
                appellant:
                    openCassationAppellant ??
                    appellantLabelFromLogMessage(m, perspective) ??
                    resolveCassationAppellantLabel(row, perspective),
                result: 'تصديق القرار',
            });
            openCassationAppellant = null;
            continue;
        }
        if (/نقض القرار/.test(m)) {
            rows.push({
                stage: 'تمييز',
                appellant:
                    openCassationAppellant ??
                    appellantLabelFromLogMessage(m, perspective) ??
                    resolveCassationAppellantLabel(row, perspective),
                result: 'نقض القرار',
            });
            openCassationAppellant = null;
            continue;
        }
        if (/تصديق القرار/.test(m)) {
            rows.push({
                stage: 'تمييز',
                appellant:
                    openCassationAppellant ??
                    appellantLabelFromLogMessage(m, perspective) ??
                    resolveCassationAppellantLabel(row, perspective),
                result: 'تصديق القرار',
            });
            openCassationAppellant = null;
        }
    }

    const methods = inferAppealMethodsUsed(row);
    const hasGrievance = rows.some((r) => r.stage === 'تظلم');
    const hasCassation = rows.some((r) => r.stage === 'تمييز');

    if (methods.tadhallum && !hasGrievance) {
        rows.push({
            stage: 'تظلم',
            appellant: resolveAppealActorLabel(row, perspective),
            result:
                row.appealResult === 'قبول التظلم'
                    ? 'قبول التظلم'
                    : row.appealResult === 'رد التظلم'
                      ? 'رد التظلم'
                      : row.appealStatus === 'tadhallum_filed' || row.appealPhase === 'grievance'
                        ? 'قيد النظر'
                        : '—',
        });
    }

    if (methods.tamyeez && !hasCassation) {
        const cassationResult =
            isCassationAffirmResult(row.appealResult) ||
            row.appealResult === 'نقض القرار'
                ? isCassationAffirmResult(row.appealResult)
                    ? 'تصديق القرار'
                    : row.appealResult
                : row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation'
                  ? 'قيد النظر'
                  : null;
        if (cassationResult) {
            rows.push({
                stage: 'تمييز',
                appellant: resolveCassationAppellantLabel(row, perspective),
                result: cassationResult,
            });
        }
    }

    const authoritativeGrievanceResult = String(row.appealResult ?? '').trim();
    if (authoritativeGrievanceResult === 'قبول التظلم' || authoritativeGrievanceResult === 'رد التظلم') {
        const appellant = (() => {
            const actor = resolveGrievanceFilerActor(row, perspective);
            if (actor === 'lawyer') return 'الدائن';
            if (actor === 'debtor') return perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
            return resolveAppealActorLabel(row, perspective);
        })();
        let lastGrievanceIdx = -1;
        for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i].stage === 'تظلم') {
                lastGrievanceIdx = i;
                break;
            }
        }
        if (lastGrievanceIdx >= 0 && rows[lastGrievanceIdx].result === authoritativeGrievanceResult) {
            rows[lastGrievanceIdx] = {
                ...rows[lastGrievanceIdx],
                appellant,
                result: authoritativeGrievanceResult,
            };
        } else if (
            lastGrievanceIdx >= 0 &&
            rows[lastGrievanceIdx].result !== authoritativeGrievanceResult
        ) {
            rows.push({
                stage: 'تظلم',
                appellant,
                result: authoritativeGrievanceResult,
            });
        } else if (lastGrievanceIdx < 0) {
            rows.push({
                stage: 'تظلم',
                appellant,
                result: authoritativeGrievanceResult,
            });
        } else {
            rows[lastGrievanceIdx] = {
                stage: 'تظلم',
                appellant,
                result: authoritativeGrievanceResult,
            };
        }
    }

    if (shouldRebuildAppealProceedingsFromState(row, rows)) {
        const authoritative = String(row.appealResult ?? '').trim();
        if (
            row.appealStatus === 'final' &&
            (isCassationAffirmResult(authoritative) || authoritative === 'نقض القرار')
        ) {
            return finalizeAppealProceedingsRows(
                buildAuthoritativeAppealProceedingsFromFinal(row, perspective),
                row,
                perspective
            );
        }
        return finalizeAppealProceedingsRows(
            buildAuthoritativeAppealProceedings(row, perspective),
            row,
            perspective
        );
    }

    const filtered = rows.filter((r) => r.result !== '—');
    if (
        filtered.length === 0 &&
        hasManualExecutorAppealAppellants(row) &&
        (row.manualExecutorLedgerEntry === true || row.appealRequestOrigin === 'executor_side')
    ) {
        return finalizeAppealProceedingsRows(
            buildManualExecutorAppealProceedings(row, perspective),
            row,
            perspective
        );
    }

    return finalizeAppealProceedingsRows(filtered, row, perspective);
}
