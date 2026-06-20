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
import { appealWindowsForDecision, todayYmd, appealGrievanceFilingClockPatch, isOpenGrievancePipeline, decisionHasAppealClock } from './appealDates';
import { buildGrievanceResolutionPatch, inferAppealMethodsUsed } from './appealWorkflowActors';
import type { CreditorDecisionEnforcementState, ExecutorDecisionStatusFlag } from './appealTypes';
import { hasManualExecutorAppealAppellants } from './appealProceedingsTypes';
import {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
    resolveManualExecutorWorkflowPhase,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';

export {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
    resolveManualExecutorWorkflowPhase,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';

/** قرار «إضافة قرار» — النسخة أو الأصل المرتبط */
export function isManualExecutorAppealRow(row: Decision, all: Decision[]): boolean {
    if (isManualExecutorLedgerDecision(row)) return true;
    if (!row.appealSourceDecisionId) return false;
    const hub = resolveUnderlyingDecisionHub(row, all);
    return isManualExecutorLedgerDecision(hub);
}

/** @internal shared with appeal proceedings */
export function resolveManualExecutorGrievanceResult(row: Decision): string {
    const direct = String(row.appealResult ?? '').trim();
    if (direct === 'قبول التظلم' || direct === 'رد التظلم') return direct;
    const logs = Array.isArray(row.appealTimelineLogs) ? [...row.appealTimelineLogs] : [];
    for (let i = logs.length - 1; i >= 0; i--) {
        const m = String(logs[i]?.message ?? '');
        if (/قبول التظلم|قُبل التظلم/.test(m)) return 'قبول التظلم';
        if (/رد التظلم|رُد التظلم/.test(m)) return 'رد التظلم';
    }
    return '';
}

/** مُقدّم التظلم على قرار «إضافة قرار» اليدوي */
export function resolveManualExecutorGrievanceFiler(d: Decision): 'lawyer' | 'debtor' | null {
    const manual = d.manualGrievanceAppellants ?? [];
    if (manual.length === 1) return manual[0]!;
    if (manual.length > 1) {
        if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
        return null;
    }
    if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
    if (d.appealRequestOrigin === 'creditor_side') return 'lawyer';
    if (d.appealRequestOrigin === 'debtor_side') return 'debtor';
    return null;
}

/**
 * الطرف المخوّل بالتمييز بعد نتيجة التظلم — قرار «إضافة قرار» فقط.
 * قبول التظلم: المتضرر (الطرف الآخر) | رد التظلم: مقدّم التظلم.
 */
export function manualExecutorCassationPartyAfterGrievance(
    d: Decision,
    grievanceAccepted: boolean
): 'lawyer' | 'debtor' | null {
    const filer = resolveManualExecutorGrievanceFiler(d);
    if (!filer) return null;
    if (grievanceAccepted) return filer === 'debtor' ? 'lawyer' : 'debtor';
    return filer;
}

/** من يحق له تسجيل التمييز الآن على قرار «إضافة قرار» */
export function manualExecutorAwaitingCassationParty(d: Decision): 'lawyer' | 'debtor' | null {
    if (d.appealStatus === 'tamyeez_filed' || d.appealPhase === 'cassation') return null;
    if (d.appealStatus === 'final') return null;

    const result = resolveManualExecutorGrievanceResult(d);
    if (result === 'قبول التظلم') {
        return manualExecutorCassationPartyAfterGrievance(d, true);
    }
    if (result === 'رد التظلم') {
        return manualExecutorCassationPartyAfterGrievance(d, false);
    }
    if (
        (d.appealStatus === 'tadhallum_filed' || d.appealPhase === 'grievance') &&
        !result
    ) {
        return null;
    }
    return null;
}

/** يصحّح حقول الانتظار القديمة لقرار «إضافة قرار» بعد نتيجة التظلم */
export function repairManualExecutorAppealAwaitingFields(
    row: Decision,
    all: Decision[]
): Decision {
    if (!isManualExecutorAppealRow(row, all)) return row;
    const party = manualExecutorAwaitingCassationParty(row);
    const grievanceResult = resolveManualExecutorGrievanceResult(row);
    if (!party && !grievanceResult) return row;
    const next: Decision = { ...row };
    if (grievanceResult === 'قبول التظلم' || grievanceResult === 'رد التظلم') {
        next.appealResult = grievanceResult as Decision['appealResult'];
    }
    if (party) {
        next.awaitingCassationEntryBy = party;
        next.appealWorkflowState =
            party === 'debtor' ? 'PENDING_APPEAL_DEBTOR' : 'PENDING_APPEAL_LAWYER';
        next.grievanceAcceptedAwaitingDebtorTamyeez = false;
        next.grievanceRejectedAwaitingTamyeez = grievanceResult === 'رد التظلم';
    }
    return next;
}

/**
 * @deprecated للبيانات القديمة والاختبارات فقط.
 * المسار الفعلي لـ «إضافة قرار»: buildManualExecutorGrievanceOutcomePatch
 */
export function buildManualExecutorGrievanceResolutionPatch(
    d: Decision,
    grievanceAccepted: boolean
): Partial<Decision> {
    const appealResult: NonNullable<Decision['appealResult']> = grievanceAccepted
        ? 'قبول التظلم'
        : 'رد التظلم';
    const cassationParty = manualExecutorCassationPartyAfterGrievance(d, grievanceAccepted);

    if (!cassationParty) {
        return {
            appealPhase: null,
            appealStatus: 'final',
            appealResult,
            appealWorkflowState: 'FINAL_ACCEPTED',
            awaitingCassationEntryBy: null,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            appealMethod: 'tadhallum',
            noAppealChosen: false,
        };
    }

    const workflowState =
        cassationParty === 'debtor' ? ('PENDING_APPEAL_DEBTOR' as const) : ('PENDING_APPEAL_LAWYER' as const);

    if (grievanceAccepted) {
        return {
            appealPhase: null,
            appealStatus: 'pending',
            appealResult,
            appealWorkflowState: workflowState,
            awaitingCassationEntryBy: cassationParty,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            appealMethod: 'tadhallum',
            noAppealChosen: false,
        };
    }

    return {
        appealPhase: null,
        appealStatus: 'pending',
        appealResult,
        appealWorkflowState: workflowState,
        awaitingCassationEntryBy: cassationParty,
        grievanceRejectedAwaitingTamyeez: true,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        appealMethod: null,
        noAppealChosen: false,
    };
}

/** قرار «إضافة قرار» فقط — لا مسار طعن */
export function isExecutorManualLedgerHub(hub: Decision): boolean {
    return isManualExecutorLedgerDecision(hub);
}

function manualExecutorTimelineLog(
    message: string,
    tone: 'emerald' | 'rose' | 'amber' | 'slate'
): NonNullable<Decision['appealTimelineLogs']>[number] {
    return {
        id:
            (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ??
            `mel_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        at: new Date().toISOString(),
        message,
        tone,
    };
}

export function resolveManualExecutorLedgerEnforcementState(
    hub: Decision
): CreditorDecisionEnforcementState {
    if (isAppealDeadlinePerpetuallyEnforced(hub)) {
        return {
            visual: 'enforced',
            pillLabel: 'القرار نافذ — نهائياً',
            pillTone: 'emerald',
            enforced: true,
        };
    }
    const flag = resolveExecutorDecisionStatusFlag(hub);
    if (flag === 2) {
        const phase = resolveManualExecutorWorkflowPhase(hub);
        if (phase === 'grievance_pending') {
            return {
                visual: 'paused',
                pillLabel: 'التنفيذ موقوف لحين البت في التظلم',
                pillTone: 'amber',
                enforced: false,
            };
        }
        if (phase === 'cassation_unlocked') {
            return {
                visual: 'paused',
                pillLabel: 'موقوف — مهلة التمييز (7 أيام)',
                pillTone: 'amber',
                enforced: false,
            };
        }
        return {
            visual: 'paused',
            pillLabel: 'التنفيذ موقوف لحين حسم الطعن',
            pillTone: 'amber',
            enforced: false,
        };
    }
    if (flag === 3) {
        return {
            visual: 'withdrawn',
            pillLabel: 'قرار ملغى تمييزاً - منتهٍ',
            pillTone: 'slate',
            enforced: false,
        };
    }
    return {
        visual: 'enforced',
        pillLabel: 'قرار ساري ومُنتج لآثاره',
        pillTone: 'emerald',
        enforced: true,
    };
}

export function buildManualExecutorAppealFilePatch(
    row: Decision,
    appellant: 'lawyer' | 'debtor',
    appealKind: 'tadhallum' | 'tamyeez'
): Partial<Decision> {
    const windows = appealWindowsForDecision(row);
    if (appealKind === 'tadhallum' && !windows.canTadhallum) return {};
    if (appealKind === 'tamyeez' && !windows.canTamyeez) return {};
    const appellantAr = appellant === 'lawyer' ? 'طالب التنفيذ' : 'المدين';
    const kindAr =
        appealKind === 'tadhallum'
            ? 'تظلم أمام المنفذ العدل'
            : 'طعن تمييزي أمام محكمة الاستئناف';
    const isGrievance = appealKind === 'tadhallum';
    return {
        executorDecisionStatusFlag: 2,
        manualExecutorAppealAppellant: appellant,
        manualExecutorAppealKind: appealKind,
        manualExecutorWorkflowPhase: isGrievance ? 'grievance_pending' : 'cassation_pending',
        manualExecutorGrievanceOutcome: undefined,
        manualExecutorEnforced: undefined,
        ...(isGrievance ? appealGrievanceFilingClockPatch() : {}),
        appealTimelineLogs: [
            manualExecutorTimelineLog(
                `تسجيل طعن — الطاعن: ${appellantAr} | النوع: ${kindAr}`,
                'amber'
            ),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

export function buildManualExecutorGrievanceOutcomePatch(
    row: Decision,
    accepted: boolean,
    outcomeIssuedYmd?: string
): Partial<Decision> {
    const label = accepted ? 'قُبل التظلم' : 'رُدّ التظلم';
    const ymd = String(outcomeIssuedYmd || todayYmd()).trim().slice(0, 10);
    return {
        executorDecisionStatusFlag: 2,
        manualExecutorGrievanceOutcome: accepted ? 'accepted' : 'rejected',
        manualExecutorWorkflowPhase: 'cassation_unlocked',
        grievanceOutcomeIssuedYmd: ymd,
        cassationAppealClockYmd: ymd,
        appealTimelineLogs: [
            manualExecutorTimelineLog(
                `نتيجة التظلم أمام المنفذ: ${label} | تاريخ إصدار القرار: ${ymd}`,
                accepted ? 'emerald' : 'amber'
            ),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

export function buildManualExecutorCassationFilePatch(row: Decision): Partial<Decision> {
    const appellant = row.manualExecutorAppealAppellant;
    const appellantAr = appellant === 'lawyer' ? 'طالب التنفيذ' : appellant === 'debtor' ? 'المدين' : '—';
    return {
        executorDecisionStatusFlag: 2,
        manualExecutorAppealKind: 'tamyeez',
        manualExecutorWorkflowPhase: 'cassation_pending',
        appealTimelineLogs: [
            manualExecutorTimelineLog(
                `تسجيل تمييز — الطاعن: ${appellantAr} | طعن تمييزي أمام محكمة الاستئناف`,
                'amber'
            ),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

function manualExecutorArchiveClosurePatch(): Partial<Decision> {
    const now = new Date().toISOString();
    return {
        isArchived: true,
        requestCycleSuperseded: true,
        requestCycleSupersededAt: now,
    };
}

/** قرار «إضافة قرار» منتهٍ (علم 3) — يُؤرشف تلقائياً في سجل الأرشيف */
export function isManualExecutorDecisionTerminated(d: Decision): boolean {
    return (
        isManualExecutorLedgerDecision(d) && resolveExecutorDecisionStatusFlag(d) === 3
    );
}

export function shouldAutoArchiveTerminatedDecision(hub: Decision): boolean {
    if (hub.isArchived || hub.appealSourceDecisionId) return false;
    return isManualExecutorDecisionTerminated(hub);
}

/** يُؤرشف قرارات «إضافة قرار» المنتهية (علم 3) القديمة تلقائياً */
export function reconcileTerminatedDecisionArchives(all: Decision[]): {
    rows: Decision[];
    mutated: boolean;
} {
    let mutated = false;
    const rows = all.map((row) => {
        if (!shouldAutoArchiveTerminatedDecision(row)) return row;
        mutated = true;
        return { ...row, ...manualExecutorArchiveClosurePatch() };
    });
    return { rows, mutated };
}

function appealDeadlineTimelineLog(
    message: string,
    tone: 'emerald' | 'rose' | 'amber' | 'slate' = 'slate'
): NonNullable<Decision['appealTimelineLogs']>[number] {
    return manualExecutorTimelineLog(message, tone);
}

function shouldApplyPerpetualEnforcementAfterCassationLapse(row: Decision): boolean {
    if (row.appealDeadlinePerpetuallyEnforced || row.isArchived) return false;
    if (row.appealSourceDecisionId) return false;
    if (!decisionHasAppealClock(row)) return false;
    if (isManualExecutorLedgerDecision(row) && resolveExecutorDecisionStatusFlag(row) === 3) {
        return false;
    }
    if (row.appealStatus === 'final' && row.appealDeadlinePerpetuallyEnforced) return false;
    return true;
}

/** بعد انقضاء مهلة التمييز (7 أيام) — أرشفة + نفاذ نهائي */
export function buildAppealPerpetualEnforcementPatch(row: Decision): Partial<Decision> {
    const message =
        'انقضت مهلة التمييز (7 أيام) — القرار نافذٌ نهائياً وأُرشف تلقائياً';
    const log = appealDeadlineTimelineLog(message, 'slate');
    const now = new Date().toISOString();
    const archivePatch = {
        appealDeadlinePerpetuallyEnforced: true,
        isArchived: true,
        requestCycleSuperseded: true,
        requestCycleSupersededAt: now,
        appealPhase: null,
        awaitingCassationEntryBy: null,
        grievanceRejectedAwaitingTamyeez: false,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        appealTimelineLogs: [log, ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : [])],
    };

    if (isManualExecutorLedgerDecision(row)) {
        const workflowState =
            row.executorOutcome === 'rejected' ? 'FINAL_REJECTED' : 'FINAL_ACCEPTED';
        return {
            ...archivePatch,
            executorDecisionStatusFlag: 1,
            manualExecutorWorkflowPhase: undefined,
            manualExecutorGrievanceOutcome: undefined,
            appealStatus: 'final',
            appealWorkflowState: workflowState,
        };
    }

    const workflowState =
        row.executorOutcome === 'rejected' ? 'FINAL_REJECTED' : 'FINAL_ACCEPTED';
    return {
        ...archivePatch,
        appealStatus: 'final',
        appealWorkflowState: workflowState,
    };
}

/** بعد انقضاء مهلة التظلم (3 أيام) — إغلاق مسار التظلم للطرفين */
export function buildGrievanceDeadlineLapsePatch(
    row: Decision,
    all: Decision[]
): Partial<Decision> {
    const message = 'انقضت مهلة التظلم (3 أيام) — سقط حق التظلم';
    const log = appealDeadlineTimelineLog(message, 'amber');
    if (isManualExecutorLedgerDecision(row)) {
        return {
            ...buildManualExecutorGrievanceOutcomePatch(row, false),
            appealTimelineLogs: [
                log,
                ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
            ],
        };
    }
    return {
        ...buildGrievanceResolutionPatch(row, false, all),
        appealTimelineLogs: [
            log,
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

/**
 * عند انقضاء مهلة التظلم فقط — إغلاق مسار التظلم المعلّق.
 * مهلة التمييز: يُنتظر اختيار «إنهاء المدة» من الواجهة.
 */
export function reconcileAppealDeadlineEnforcement(all: Decision[]): {
    rows: Decision[];
    mutated: boolean;
} {
    let mutated = false;
    const rows = all.map((row) => {
        if (row.appealSourceDecisionId || row.appealDeadlinePerpetuallyEnforced) return row;
        const windows = appealWindowsForDecision(row);

        if (windows.isPastGrievanceDeadline && isOpenGrievancePipeline(row)) {
            mutated = true;
            return { ...row, ...buildGrievanceDeadlineLapsePatch(row, all) };
        }

        return row;
    });

    return { rows, mutated };
}

export function buildManualExecutorAppealWonPatch(row: Decision): Partial<Decision> {
    const appellant = row.manualExecutorAppealAppellant;
    if (!appellant) return {};
    const nextFlag: ExecutorDecisionStatusFlag = appellant === 'lawyer' ? 3 : 1;
    const message =
        appellant === 'lawyer'
            ? 'كسبنا الطعن — نقض قرار المنفذ وإلغاؤه'
            : 'كسبنا الطعن — نقض قرار الموقوفية لصالحنا';
    return {
        executorDecisionStatusFlag: nextFlag,
        manualExecutorWorkflowPhase: undefined,
        ...(nextFlag === 3 ? manualExecutorArchiveClosurePatch() : {}),
        appealTimelineLogs: [
            manualExecutorTimelineLog(message, nextFlag === 1 ? 'emerald' : 'rose'),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

export function buildManualExecutorAppealLostPatch(row: Decision): Partial<Decision> {
    const appellant = row.manualExecutorAppealAppellant;
    if (!appellant) return {};
    const nextFlag: ExecutorDecisionStatusFlag = appellant === 'lawyer' ? 1 : 3;
    const message =
        appellant === 'lawyer'
            ? 'خسرنا الطعن — تصديق قرار المنفذ'
            : 'خسرنا الطعن — إلغاء القرار لصالح المدين';
    return {
        executorDecisionStatusFlag: nextFlag,
        manualExecutorWorkflowPhase: undefined,
        ...(nextFlag === 3 ? manualExecutorArchiveClosurePatch() : {}),
        appealTimelineLogs: [
            manualExecutorTimelineLog(message, nextFlag === 1 ? 'amber' : 'rose'),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

/** يزيل نسخ الطعن القديمة ويُبقي منظومة الحالات الثلاث على البطاقة الأصلية */
export function purgeManualExecutorAppealArtifacts(all: Decision[]): {
    rows: Decision[];
    mutated: boolean;
} {
    const manualIds = new Set(
        all.filter((d) => d.manualExecutorLedgerEntry === true).map((d) => String(d.id))
    );
    const stripped = (row: Decision): Decision => {
        const flag = resolveExecutorDecisionStatusFlag(row);
        return {
            ...row,
            activeAppealCopyId: null,
            appealRequestOrigin: undefined,
            appealActor: null,
            appealMethod: null,
            appealPhase: null,
            appealStatus: 'pending',
            appealResult: undefined,
            appealWorkflowState: 'NONE',
            awaitingCassationEntryBy: null,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            manualGrievanceAppellants: undefined,
            manualCassationAppellants: undefined,
            noAppealChosen: false,
            manualExecutorEnforced: undefined,
            executorDecisionStatusFlag: flag,
            manualExecutorAppealAppellant:
                flag === 2 || flag === 3 ? row.manualExecutorAppealAppellant : undefined,
            manualExecutorAppealKind:
                flag === 2 || flag === 3 ? row.manualExecutorAppealKind : undefined,
            manualExecutorWorkflowPhase:
                flag === 2 ? row.manualExecutorWorkflowPhase : undefined,
            manualExecutorGrievanceOutcome:
                flag === 2 || flag === 3 ? row.manualExecutorGrievanceOutcome : undefined,
        };
    };
    const filtered = all.filter(
        (d) =>
            !d.appealSourceDecisionId ||
            !manualIds.has(String(d.appealSourceDecisionId))
    );
    let mutated = filtered.length !== all.length;
    const rows = filtered.map((d) => {
        if (d.manualExecutorLedgerEntry !== true) return d;
        const next = stripped(d);
        if (
            next.activeAppealCopyId !== d.activeAppealCopyId ||
            next.appealActor !== d.appealActor ||
            next.appealMethod !== d.appealMethod ||
            next.appealPhase !== d.appealPhase ||
            next.appealStatus !== d.appealStatus ||
            next.appealResult !== d.appealResult ||
            next.appealWorkflowState !== d.appealWorkflowState ||
            next.awaitingCassationEntryBy !== d.awaitingCassationEntryBy ||
            next.grievanceRejectedAwaitingTamyeez !== d.grievanceRejectedAwaitingTamyeez ||
            next.grievanceAcceptedAwaitingDebtorTamyeez !==
                d.grievanceAcceptedAwaitingDebtorTamyeez ||
            next.manualGrievanceAppellants !== d.manualGrievanceAppellants ||
            next.manualCassationAppellants !== d.manualCassationAppellants ||
            next.noAppealChosen !== d.noAppealChosen ||
            next.executorDecisionStatusFlag !== d.executorDecisionStatusFlag ||
            next.manualExecutorAppealAppellant !== d.manualExecutorAppealAppellant ||
            next.manualExecutorAppealKind !== d.manualExecutorAppealKind ||
            next.manualExecutorWorkflowPhase !== d.manualExecutorWorkflowPhase ||
            next.manualExecutorGrievanceOutcome !== d.manualExecutorGrievanceOutcome ||
            next.manualExecutorEnforced !== d.manualExecutorEnforced
        ) {
            mutated = true;
        }
        return next;
    });
    return { rows, mutated };
}

/** قرار منفذ بلا طعن مسجّل بعد — يُعرض زر الطعن بغضّ النظر عن مهلة التاريخ */
export function isExecutorSideAwaitingAppealEntry(
    hub: Decision,
    pipeline: Decision = hub
): boolean {
    if (isManualExecutorLedgerDecision(hub)) return false;
    if (hub.appealRequestOrigin !== 'executor_side') {
        return false;
    }
    if (hub.noAppealChosen === true || pipeline.noAppealChosen === true) return false;
    if (hub.isArchived) return false;
    const st = pipeline.appealStatus ?? hub.appealStatus;
    if (st === 'final') return false;
    if (st === 'tadhallum_filed' || st === 'tamyeez_filed') return false;
    if (pipeline.appealPhase === 'grievance' || pipeline.appealPhase === 'cassation') {
        return false;
    }
    if (hub.activeAppealCopyId) return false;
    if (
        hub.appealActor ||
        pipeline.appealActor ||
        hub.appealMethod ||
        pipeline.appealMethod ||
        hasManualExecutorAppealAppellants(hub) ||
        hasManualExecutorAppealAppellants(pipeline)
    ) {
        return false;
    }
    return st === 'pending' || !st;
}

export function formatManualExecutorBeneficiaryLabel(
    beneficiary: Decision['manualExecutorBeneficiary'],
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    if (beneficiary === 'creditor') return 'لصالح الدائن';
    if (beneficiary === 'debtor') {
        return perspective === 'debtor_agent' ? 'لصالح موكّلنا' : 'لصالح المدين';
    }
    if (beneficiary === 'neutral') return 'غير محدد';
    return '';
}

/** أرشفة القرار — بعد اكتمال المنفذ وانتهاء مسار الطعن (أو التنازل عنه) */
export function canArchiveExecutorDecisionCard(
    hubRow: Decision,
    pipeline: Decision,
    opts: {
        hubTab: 'current' | 'previous';
        settled: boolean;
        appealLegallyFinal: boolean;
    }
): boolean {
    if (opts.hubTab !== 'previous') return false;
    if (!opts.settled) return false;
    if (hubRow.isArchived) return false;
    if (isManualExecutorLedgerDecision(hubRow)) {
        return resolveExecutorDecisionStatusFlag(hubRow) === 3;
    }
    if (isExecutorSideAwaitingAppealEntry(hubRow, pipeline)) return false;
    return (
        opts.appealLegallyFinal ||
        hubRow.noAppealChosen === true ||
        pipeline.noAppealChosen === true
    );
}

export function formatRegisteredAppealPathForDecision(
    row: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): string | null {
    const logs = Array.isArray(row.appealTimelineLogs) ? [...row.appealTimelineLogs] : [];
    logs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const parts: string[] = [];
    for (const log of logs) {
        const raw = String(log.message || '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!raw) continue;
        const m =
            perspective === 'debtor_agent'
                ? appealRelabelTimelineMessage(raw, perspective)
                : raw;
        if (m) parts.push(m);
    }
    if (parts.length > 0) return parts.join(' ← ');
    const inf = inferAppealMethodsUsed(row);
    const fb: string[] = [];
    if (inf.tadhallum) fb.push('تظلم');
    if (inf.tamyeez) fb.push('تمييز');
    if (fb.length === 0) return null;
    return fb.join(' ← ');
}

