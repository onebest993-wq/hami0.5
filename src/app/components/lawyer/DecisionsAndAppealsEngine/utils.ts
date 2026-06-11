import { createElement, type ReactNode } from 'react';
import { stripEmojisFromText } from '@/app/utils/timelineSmartDisplay';
import type { ExecutionDecisionAppealPhase, ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { Decision } from './types';
import { decisionCardGlassClasses } from './decisionCardPresentation';
import {
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    appealRelabelTimelineMessage,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from './appealUiLabels';
import { DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE } from '@/app/utils/otherPartyManualTrackDecisionSync';

export const newEventId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const DECISIONS_APPEALS_TOOLTIP_DELAY_MS = 450;

export function normComparableDecisionText(s: string): string {
    return stripEmojisFromText(String(s || ''))
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

export function shouldShowDecisionHubBody(title: string, bodyText: string | undefined | null): boolean {
    const b = normComparableDecisionText(String(bodyText ?? ''));
    if (!b) return false;
    const t = normComparableDecisionText(title);
    if (!t) return true;
    if (b === t) return false;
    if (b.startsWith(t) && b.slice(t.length).trim().length <= 2) return false;
    if (t.startsWith(b) && t.slice(b.length).trim().length <= 2) return false;
    if (t.includes(b) && b.length >= Math.min(28, Math.floor(t.length * 0.92))) return false;
    return true;
}

export function arabicLooseNormalize(s: string): string {
    let x = stripEmojisFromText(String(s || '')).toLowerCase();
    x = x.replace(/[\u0640\u0610-\u061A\u064B-\u065F\u0670]/g, '');
    x = x.replace(/[أإآٱ]/g, 'ا');
    x = x.replace(/ى/g, 'ي');
    x = x.replace(/ة/g, 'ه');
    x = x.replace(/[^\p{L}\p{N}\s\u0600-\u06FF]+/gu, ' ');
    x = x.replace(/\s+/g, ' ').trim();
    return x;
}

export function isIntroLineRedundantWithTitle(title: string, line: string): boolean {
    const t = arabicLooseNormalize(title);
    const l = arabicLooseNormalize(line);
    if (!l || !t) return false;
    if (l === t) return true;
    const tw = new Set(t.split(' ').filter((w) => w.length > 2));
    const lw = new Set(l.split(' ').filter((w) => w.length > 2));
    if (tw.size === 0) return false;
    let hit = 0;
    for (const w of tw) {
        if (lw.has(w)) hit++;
    }
    const overlap = hit / tw.size;
    if (overlap >= 0.65 && l.length <= t.length * 1.55) return true;
    if (l.length >= 18 && (t.includes(l.slice(0, 22)) || l.includes(t.slice(0, 22)))) return true;
    return false;
}

export function stripRedundantLeadingLinesFromHubBody(title: string, body: string): string {
    const lines = String(body ?? '').split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
        const seg = lines[i].trim();
        if (!seg) {
            i++;
            continue;
        }
        if (isIntroLineRedundantWithTitle(title, seg)) {
            i++;
            continue;
        }
        break;
    }
    return lines.slice(i).join('\n').replace(/^\s*\n+/, '').trimStart();
}

export function appealTrackSmartPillLabel(
    awaitingTamyeezAfterGrievance: boolean,
    ap: ExecutionDecisionAppealPhase | null | undefined,
    appealStatus: Decision['appealStatus']
): string {
    if (ap === 'grievance' || appealStatus === 'tadhallum_filed') return 'طعن - تظلم';
    if (ap === 'cassation' || appealStatus === 'tamyeez_filed') return 'طعن - تمييز';
    if (awaitingTamyeezAfterGrievance) return 'طعن';
    return 'طعن';
}

export type AppealProceedingRow = {
    stage: 'تظلم' | 'تمييز';
    appellant: string;
    result: string;
};

function grievanceAppellantLabel(
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

/** يبني مسار الطعن من الحالة الفعلية — دون سجل قديم متعارض */
function buildAuthoritativeAppealProceedings(
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

    if (grievanceResult === 'قبول التظلم' && awaiting) {
        rows.push({
            stage: 'تمييز',
            appellant: cassationAwaitingAppellantLabel(awaiting, perspective),
            result: 'بانتظار التسجيل',
        });
    } else if (
        grievanceResult === 'رد التظلم' &&
        (row.grievanceRejectedAwaitingTamyeez || awaiting)
    ) {
        const party = awaiting ?? 'debtor';
        rows.push({
            stage: 'تمييز',
            appellant: cassationAwaitingAppellantLabel(party, perspective),
            result: 'بانتظار التسجيل',
        });
    }

    return rows;
}

function shouldRebuildAppealProceedingsFromState(
    row: Decision,
    parsed: AppealProceedingRow[]
): boolean {
    const authoritative = String(row.appealResult ?? '').trim();
    if (authoritative !== 'قبول التظلم' && authoritative !== 'رد التظلم') {
        return false;
    }

    const grievanceRows = parsed.filter((r) => r.stage === 'تظلم');
    if (grievanceRows.length > 1) return true;
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

export function resolveAppealActorLabel(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    const debtorLabel = perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    if (d.appealActor === 'lawyer') return 'الدائن';
    if (d.appealActor === 'debtor') return debtorLabel;
    const filer =
        resolveGrievanceFilerActor(d, perspective) ??
        resolveHarmedPartyAppealActor(d, perspective);
    if (filer === 'debtor') return debtorLabel;
    if (filer === 'lawyer') return 'الدائن';
    const proponent = resolveRequestProponent(d, perspective);
    if (proponent === 'debtor') return debtorLabel;
    if (proponent === 'creditor') return 'الدائن';
    if (proponent === 'executor') return 'المنفذ';
    return '—';
}

function appellantLabelFromLogMessage(
    message: string,
    perspective: AppealUiPerspective = 'creditor_agent'
): string | null {
    const m = String(message || '');
    const debtorLabel = perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    if (/موكّ?ل\s*المدين|موكّ?لنا|تظلم\s+موكّ?ل/.test(m)) return debtorLabel;
    if (/تمييز\s+موكّ?ل|تمييز\s+المدين|المدين.*تمييز|تظلم\s+المدين/.test(m)) return debtorLabel;
    if (/تمييز\s+الدائن|تمييز\s+وكيل|وكيل\s+الدائن.*تمييز|تظلم\s+الدائن|تظلم\s+وكيل/.test(m)) {
        return 'الدائن';
    }
    if (/المدين/.test(m)) return debtorLabel;
    if (/وكيل\s*الدائن|الدائن/.test(m)) return 'الدائن';
    return null;
}

/** يستنتج الطاعن لعرض شارة نتيجة الطعن عند غياب appealActor */
export function resolveEffectiveAppealActor(
    pipe: Decision,
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'lawyer' | 'debtor' | null {
    const result = String(pipe.appealResult ?? hub.appealResult ?? '').trim();
    if (result === 'قبول التظلم' || result === 'رد التظلم') {
        const filer =
            resolveGrievanceFilerActor(pipe, perspective) ??
            resolveGrievanceFilerActor(hub, perspective);
        if (filer) return filer;
    }
    if (pipe.appealActor === 'lawyer' || pipe.appealActor === 'debtor') return pipe.appealActor;
    if (hub.appealActor === 'lawyer' || hub.appealActor === 'debtor') return hub.appealActor;
    const filer = resolveGrievanceFilerActor(pipe, perspective) ?? resolveGrievanceFilerActor(hub, perspective);
    if (filer) return filer;
    const harmed = resolveHarmedPartyAppealActor(hub, perspective);
    if (harmed) return harmed;
    return null;
}

/** يصحّح الطرف المنتظر للتمييز عند تعارض الحقول القديمة مع نتيجة التظلم */
export function resolveEffectiveAwaitingCassationParty(
    pipe: Decision,
    hub?: Decision
): 'lawyer' | 'debtor' | null {
    const h = hub ?? pipe;
    const status = pipe.appealStatus ?? h.appealStatus;
    if (status === 'tamyeez_filed' || pipe.appealPhase === 'cassation' || h.appealPhase === 'cassation') {
        return null;
    }
    if (status === 'final') return null;

    const appealResult = String(pipe.appealResult ?? h.appealResult ?? '').trim();
    if (appealResult === 'قبول التظلم') {
        return (
            cassationEntryPartyAfterGrievanceGrant(pipe) ??
            cassationEntryPartyAfterGrievanceGrant(h) ??
            'lawyer'
        );
    }

    const stored = pipe.awaitingCassationEntryBy ?? h.awaitingCassationEntryBy ?? null;
    if (
        appealResult === 'رد التظلم' &&
        (pipe.grievanceRejectedAwaitingTamyeez || h.grievanceRejectedAwaitingTamyeez)
    ) {
        return stored ?? cassationEntryPartyAfterGrievanceGrant(pipe) ?? 'debtor';
    }

    return stored;
}

export function isCassationAffirmResult(result: string | undefined | null): boolean {
    const r = String(result ?? '').trim();
    return r === 'تصديق القرار' || r === 'رد اللائحة';
}

/** إجراءات الطعن المسجّلة على القرار — مرحلة، طاعن، نتيجة */
export function buildAppealProceedingsForDecision(
    row: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): AppealProceedingRow[] {
    const logs = Array.isArray(row.appealTimelineLogs) ? [...row.appealTimelineLogs] : [];
    logs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

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
        return buildAuthoritativeAppealProceedings(row, perspective);
    }

    return rows.filter((r) => r.result !== '—');
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

export const DECISION_GLASS_CARD =
    'flex h-full flex-col justify-between rounded-xl border border-white/5 bg-slate-900/50 p-2.5 text-right shadow-lg backdrop-blur-xl transition-all hover:bg-slate-800/60';

export function getStatusBorderClass(_status: string, _outcome: string | undefined, _origin: string | undefined): string {
    return '';
}

export function formatDateNumeric(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function cleanTitle(title: string): string {
    let t = stripEmojisFromText(String(title || ''));
    t = t.replace(/الطلبات الخاصة/g, 'الطلبات');
    t = t.replace(/^طلب طلب/g, 'طلب');
    return t;
}

export function decisionAppealClockYmd(d: { date?: string; resolvedAt?: string }): string {
    if (d.resolvedAt) {
        const dt = new Date(d.resolvedAt);
        if (!Number.isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    }
    const raw = String(d.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const dt2 = new Date(raw);
    if (!Number.isNaN(dt2.getTime())) {
        const y = dt2.getFullYear();
        const m = String(dt2.getMonth() + 1).padStart(2, '0');
        const day = String(dt2.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    return raw.slice(0, 10);
}

export function appealWindowsFromClockYmd(clockYmd: string): {
    canTadhallum: boolean;
    canTamyeez: boolean;
    daysElapsed: number;
    isPastTamyeezDeadline: boolean;
} {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(clockYmd || '').trim());
    if (!m) {
        return {
            canTadhallum: false,
            canTamyeez: false,
            daysElapsed: 999,
            isPastTamyeezDeadline: true,
        };
    }
    const start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysElapsed = Math.floor((today.getTime() - start.getTime()) / 86400000);
    return {
        canTadhallum: daysElapsed >= 0 && daysElapsed < 4,
        canTamyeez: daysElapsed >= 0 && daysElapsed < 8,
        daysElapsed,
        isPastTamyeezDeadline: daysElapsed >= 8,
    };
}

export type AppealDeadlineWindows = ReturnType<typeof appealWindowsFromClockYmd>;

export type DecisionsAppealsAppealSlot = 'appealsTab' | 'previousCard';

export function appealEntryShowsDebtorFirst(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    return resolveHarmedPartyAppealActor(d, perspective) === 'debtor';
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

export function buildGrievanceResolutionPatch(
    d: Decision,
    grievanceAccepted: boolean
): Partial<Decision> {
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
        return {
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
        };
    }

    if (granted) {
        const outcome =
            branch === 'after_rejection'
                ? { executorOutcome: 'approved' as const, status: 'accepted' as const }
                : { executorOutcome: 'approved' as const, status: 'accepted' as const };
        const cassationParty = cassationEntryPartyAfterGrievanceGrant(d);
        if (cassationParty) {
            return {
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
            };
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
        return {
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
        };
    }

    return {
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
    };
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
    perspective: import('./appealUiLabels').AppealUiPerspective = 'creditor_agent'
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

export function deriveDecisionHubStatus(
    d: Decision,
    needsExecutor: (x: Decision) => boolean
): ExecutionDecisionHubStatus {
    if (d.appealRequestOrigin === 'executor_side') {
        if (d.appealStatus === 'final') return d.status === 'rejected' ? 'rejected' : 'accepted';
        return 'accepted';
    }
    if (d.executorOutcome === 'withdrawn' || d.lawyerWithdrawn === true) return 'rejected';
    if (d.executorOutcome === 'rejected') return 'rejected';
    if (d.executorOutcome === 'approved' || d.executorOutcome === 'alternative') return 'accepted';
    if (needsExecutor(d)) return 'pending';
    if (d.status === 'accepted' || d.status === 'rejected') return d.status;
    if (d.appealStatus === 'pending' && !d.executorOutcome) return 'pending';
    return 'accepted';
}

function appealCopyHasPipelineState(copy: Decision): boolean {
    return (
        Boolean(copy.appealResult) ||
        Boolean(copy.awaitingCassationEntryBy) ||
        copy.appealStatus === 'tadhallum_filed' ||
        copy.appealStatus === 'tamyeez_filed' ||
        copy.appealPhase === 'grievance' ||
        copy.appealPhase === 'cassation' ||
        Boolean(copy.grievanceAcceptedAwaitingDebtorTamyeez) ||
        Boolean(copy.grievanceRejectedAwaitingTamyeez)
    );
}

export function getActiveAppealCopyForOriginal(original: Decision, all: Decision[]): Decision | null {
    if (!isDecisionLikeRow(original)) return null;
    if (original.appealSourceDecisionId) return null;
    if (original.activeAppealCopyId) {
        const linked = all.find((d) => d.id === original.activeAppealCopyId);
        if (linked) return linked;
    }
    const copies = all.filter((d) => d.appealSourceDecisionId === original.id);
    if (copies.length === 0) return null;
    const withPipeline = copies.filter(appealCopyHasPipelineState);
    const pool = withPipeline.length > 0 ? withPipeline : copies;
    return [...pool].sort(compareDecisionsNewestFirst)[0] ?? null;
}

export function appealPipelineRowForCard(row: Decision, all: Decision[]): Decision {
    return getActiveAppealCopyForOriginal(row, all) ?? row;
}

/** انقضاء مهلة الطعن أو صدور نتيجة تمييز/تظلم — القرار لم يعد قابلاً للطعن */
export function isExecutorDecisionAppealFinal(
    hubRow: Decision,
    pipeline: Decision,
    opts: {
        appealWindowClosed: boolean;
        appealTrackActive: boolean;
        isPastTamyeezDeadline?: boolean;
    }
): boolean {
    if (opts.appealTrackActive) return false;

    const ws = String(pipeline.appealWorkflowState ?? hubRow.appealWorkflowState ?? '').trim();
    if (hubRow.appealStatus === 'final' || pipeline.appealStatus === 'final') return true;
    if (ws === 'FINAL_ACCEPTED' || ws === 'FINAL_REJECTED' || ws === 'REVOKED_BY_APPEAL') {
        return true;
    }

    const st = pipeline.appealStatus ?? hubRow.appealStatus;
    if (st === 'upheld' || st === 'overturned' || st === 'modified') return true;

    const phase = pipeline.appealPhase ?? hubRow.appealPhase;
    const appealStillOpen =
        st === 'tadhallum_filed' ||
        st === 'tamyeez_filed' ||
        phase === 'grievance' ||
        phase === 'cassation' ||
        Boolean(pipeline.awaitingCassationEntryBy ?? hubRow.awaitingCassationEntryBy) ||
        Boolean(pipeline.grievanceAcceptedAwaitingDebtorTamyeez ?? hubRow.grievanceAcceptedAwaitingDebtorTamyeez) ||
        Boolean(pipeline.grievanceRejectedAwaitingTamyeez ?? hubRow.grievanceRejectedAwaitingTamyeez);

    if (appealStillOpen) return false;

    const appealResult = String(pipeline.appealResult ?? hubRow.appealResult ?? '').trim();
    if (appealResult === 'نقض القرار' || isCassationAffirmResult(appealResult)) {
        return true;
    }
    if (
        appealResult === 'قبول التظلم' &&
        (pipeline.appealStatus === 'final' || hubRow.appealStatus === 'final')
    ) {
        return true;
    }
    if (appealResult === 'رد التظلم' && (pipeline.appealStatus === 'final' || hubRow.appealStatus === 'final')) {
        return true;
    }

    if (opts.appealWindowClosed || opts.isPastTamyeezDeadline) {
        return st === 'pending' || !st || !phase;
    }

    return false;
}

export type DecisionHubStatusPillTone = 'red' | 'emerald' | 'amber' | 'slate' | 'violet' | 'neutral';

const HUB_PILL_TONE_CLASS: Record<DecisionHubStatusPillTone, string> = {
    red: 'border-rose-400/20 bg-rose-500/[0.08] text-rose-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-rose-400/30',
    emerald:
        'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-emerald-400/30',
    amber:
        'border-amber-400/20 bg-amber-500/[0.08] text-amber-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-amber-400/30',
    slate: 'border-white/10 bg-white/[0.05] text-slate-200/90 hover:border-white/16',
    violet:
        'border-violet-400/20 bg-violet-500/[0.08] text-violet-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-violet-400/30',
    neutral:
        'border-white/12 bg-white/[0.06] text-slate-100/90 hover:border-white/20 hover:bg-white/[0.10]',
};

export function renderDecisionHubStatusPill(
    label: string,
    tone: DecisionHubStatusPillTone,
    onClick?: () => void
): ReactNode {
    const base = `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold backdrop-blur-md transition-colors ${HUB_PILL_TONE_CLASS[tone]}`;
    if (onClick) {
        return createElement(
            'button',
            {
                type: 'button',
                onClick,
                className: `${base} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20`,
            },
            label
        );
    }
    return createElement('span', { className: base }, label);
}

export const EXECUTOR_QUEUE_REQUEST_KINDS: NonNullable<Decision['requestKind']>[] = [
    'seizure',
    'eviction_procedure',
    'lawyer_fee_payout',
    'case_expense',
    'trust_disburse',
    'unified_collection',
    'personal_coercive',
    'special_followup',
    'guarantor_request',
    'creditor_party_death',
    'debtor_party_death',
];

function isLawyerCassationNaqdResume(pipe: Decision, hub: Decision): boolean {
    if (pipe.appealResult !== 'نقض القرار' || pipe.appealStatus !== 'final') return false;
    const filer = resolveCassationFilerActor(pipe);
    if (filer === 'debtor') return false;
    const upheld = pipe.executorOutcome === 'approved' || pipe.executorOutcome === 'alternative';
    if (filer === 'lawyer') return upheld;
    const hubApproved = hub.executorOutcome === 'approved' || hub.executorOutcome === 'alternative';
    return upheld && hubApproved;
}

function isLawyerCassationRadReset(pipe: Decision, phys: Decision['executorOutcome']): boolean {
    if (!isCassationAffirmResult(pipe.appealResult) || pipe.appealStatus !== 'final') return false;
    const filer = resolveCassationFilerActor(pipe);
    if (filer === 'debtor') return false;
    if (filer === 'lawyer') return true;
    return (phys === 'approved' || phys === 'alternative') && pipe.executorOutcome === 'rejected';
}

function isDebtorCassationRadUpheld(pipe: Decision, hub: Decision): boolean {
    if (!isCassationAffirmResult(pipe.appealResult) || pipe.appealStatus !== 'final') return false;
    const filer = resolveCassationFilerActor(pipe);
    if (filer === 'lawyer') return false;
    if (pipe.executorOutcome === 'approved' || pipe.executorOutcome === 'alternative') return true;
    return hub.executorOutcome === 'approved' || hub.executorOutcome === 'alternative';
}

export function effectiveExecutorOutcomeForCreditorHubPill(
    hubRow: Decision,
    pipeline: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): Decision['executorOutcome'] | undefined {
    const phys = hubRow.executorOutcome;
    if (!isCreditorPartyRequest(hubRow, perspective)) return phys;
    if (phys !== 'approved' && phys !== 'alternative') return phys;

    const p = pipeline;

    if (p.appealWorkflowState === 'REVOKED_BY_APPEAL') {
        return 'rejected';
    }
    if (p.appealResult === 'نقض القرار' && p.appealStatus === 'final') {
        return isLawyerCassationNaqdResume(p, hubRow) ? phys : 'rejected';
    }
    if (p.executorOutcome === 'rejected' && p.appealStatus === 'final') {
        return 'rejected';
    }

    if (isCassationAffirmResult(p.appealResult) && p.appealStatus === 'final') {
        if (isLawyerCassationRadReset(p, phys)) return 'rejected';
        if (isDebtorCassationRadUpheld(p, hubRow)) return phys;
        return p.executorOutcome ?? phys;
    }

    if (p.appealResult === 'قبول التظلم' && p.appealStatus === 'final') {
        return 'rejected';
    }

    if (p.appealResult === 'رد التظلم') {
        if (p.appealStatus === 'final') {
            return phys;
        }
        if (
            p.appealActor === 'debtor' &&
            (hubRow.appealBaseBranch === 'after_approval' ||
                (hubRow.appealBaseBranch == null && phys === 'approved'))
        ) {
            return phys;
        }
        if (p.grievanceRejectedAwaitingTamyeez && p.awaitingCassationEntryBy) {
            return phys;
        }
        return 'rejected';
    }

    return phys;
}

export type CreditorRequestAppealGate =
    | { kind: 'continue' }
    | {
          kind: 'paused';
          message: string;
          showAppealsShortcut: boolean;
          showWaiveCassation: boolean;
      }
    | {
          kind: 'lifecycle_reset';
          message: string;
          showAppealsShortcut: boolean;
      }
    | {
          kind: 'revoked';
          message: string;
          showAppealsShortcut: boolean;
      };

export function isCreditorRequestFlowContinues(
    hub: Decision,
    pipe: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    return resolveCreditorRequestAppealGate(hub, pipe, perspective).kind === 'continue';
}

function isDebtorGrievancePauseState(hub: Decision, pipe: Decision): boolean {
    if (pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation') return false;

    const appealResult = String(pipe.appealResult ?? hub.appealResult ?? '').trim();
    if (appealResult === 'قبول التظلم' && pipe.appealStatus !== 'final') return true;

    if (pipe.awaitingCassationEntryBy === 'lawyer' || hub.awaitingCassationEntryBy === 'lawyer') {
        return true;
    }

    const grievanceOpen =
        pipe.appealStatus === 'tadhallum_filed' ||
        pipe.appealPhase === 'grievance' ||
        hub.appealStatus === 'tadhallum_filed' ||
        hub.appealPhase === 'grievance';
    if (grievanceOpen) return true;

    const actor = pipe.appealActor ?? hub.appealActor;
    if (actor === 'debtor') {
        if (pipe.grievanceAcceptedAwaitingDebtorTamyeez || hub.grievanceAcceptedAwaitingDebtorTamyeez) {
            return true;
        }
    }

    return false;
}

export type CreditorDecisionEnforcementState = {
    visual: DecisionCardEnforcementVisual;
    pillLabel: string;
    pillTone: DecisionHubStatusPillTone;
    enforced: boolean;
};

export function resolveUnderlyingDecisionHub(row: Decision, all: Decision[]): Decision {
    const srcId = String(row.appealSourceDecisionId || '').trim();
    if (!srcId) return row;
    return all.find((d) => String(d.id || '').trim() === srcId) ?? row;
}

function parseDecisionPayloadJson(hub: Decision): Record<string, unknown> | null {
    try {
        const raw = String(hub.payloadJson || '').trim();
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

/** من يقدّم الطلب فعلياً — بمنظور وكيل المدين (لا يعتمد على appealRequestOrigin وحده) */
export function resolveRequestFilerFromDebtorAgentView(
    hub: Decision
): 'creditor' | 'debtor' | 'executor' {
    if (hub.appealRequestOrigin === 'executor_side') return 'executor';

    const payload = parseDecisionPayloadJson(hub);
    if (payload?.source === DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE) return 'creditor';

    const blob = `${String(hub.title || '')} ${String(hub.body || '')}`;
    if (/وكيل\s*الدائن|تقدّ?م\s+وكيل\s+الدائن|مقدّ?م\s+من\s+الدائن/i.test(blob)) {
        return 'creditor';
    }

    if (hub.requestKind === 'guarantor_request') return 'debtor';

    const origin = hub.appealRequestOrigin ?? inferDecisionAppealRequestOrigin(hub);
    if (origin === 'creditor_side') return 'creditor';
    if (origin === 'debtor_side') {
        if (/تحرك\s*الطرف\s*الآخر|طرف\s*آخر\s*—\s*قيد\s*البت/i.test(blob)) return 'creditor';
        if (/قدم\s+المدين|طلب\s+المدين|موكّ?ل\s*المدين/i.test(blob)) return 'debtor';
        return 'debtor';
    }

    const rk = String(hub.requestKind || '').trim();
    if (rk && (EXECUTOR_QUEUE_REQUEST_KINDS as readonly string[]).includes(rk)) return 'creditor';
    return 'creditor';
}

/** من يقدّم الطلب — مع مراعاة منظور وكيل المدين */
export function resolveRequestProponent(
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'creditor' | 'debtor' | 'executor' {
    if (hub.appealRequestOrigin === 'executor_side') return 'executor';
    if (perspective === 'debtor_agent') {
        return resolveRequestFilerFromDebtorAgentView(hub);
    }
    const origin = hub.appealRequestOrigin ?? inferDecisionAppealRequestOrigin(hub);
    if (origin === 'debtor_side') return 'debtor';
    if (origin === 'executor_side') return 'executor';
    return 'creditor';
}

export function isCreditorPartyRequest(
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    return resolveRequestProponent(hub, perspective) === 'creditor';
}

/** طلب مقدّم من الدائن — يشمل مرآة المحضر و`creditor_side` الصريح */
export function isCreditorInitiatedExecutorRequest(hub: Decision): boolean {
    if (resolveRequestFilerFromDebtorAgentView(hub) === 'creditor') return true;
    return isCreditorPartyRequest(hub, 'creditor_agent');
}

/** هل الطلب موضوع مسار طعن الدائن — يشمل مرآة `debtor_side` دون الاعتماد على المنظور وحده */
export function isCreditorExecutorAppealSubject(
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (isCreditorInitiatedExecutorRequest(hub)) return true;
    return resolveRequestProponent(hub, perspective) === 'creditor';
}

/** هل شارة الحالة تعرض مسار الطعن (لا حاجة لسطر مصير مكرر) */
export function debtorAgentAppealStatusInHeaderPill(pillLabel: string): boolean {
    const p = String(pillLabel || '').trim();
    if (!p) return false;
    if (p === 'ضد موكّلنا — قبول المنفذ' || p === 'لصالح موكّلنا — رفض المنفذ') return false;
    if (p === 'القرار نافذ' || p === 'القرار غير نافذ') return false;
    return /الطعن|بانتظار تمييز|تمييز |طعن موكّلنا|طعن الدائن|غير نافذ — مؤقتاً|أُعيدت الدورة/.test(
        p
    );
}

export function shouldHideDebtorAgentFateLine(
    pillLabel: string,
    gate: CreditorRequestAppealGate
): boolean {
    if (gate.kind === 'paused' || gate.kind === 'revoked' || gate.kind === 'lifecycle_reset') {
        return true;
    }
    return debtorAgentAppealStatusInHeaderPill(pillLabel);
}

/** لا تُكرّر شارة نتيجة الطعن — منظور وكيل المدين يكتفي بالشارة العلوية ومسار الطعن */
export function shouldShowAppealResultChipSeparate(
    _pillLabel: string,
    perspective: import('./appealUiLabels').AppealUiPerspective
): boolean {
    return perspective !== 'debtor_agent';
}

export const COMPACT_APPEAL_PROCEEDINGS_MAX = 3;

/** من سجّل الطعن الذي أنتج النتيجة الحالية — تظلم أو تمييز */
export function resolveAppealResultActorForClient(
    pipe: Decision,
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'lawyer' | 'debtor' | null {
    const result = String(pipe.appealResult ?? hub.appealResult ?? '').trim();
    if (result === 'نقض القرار' || result === 'تصديق القرار' || result === 'رد اللائحة') {
        return (
            resolveCassationFilerActor(pipe) ??
            resolveCassationFilerActor(hub) ??
            resolveEffectiveAppealActor(pipe, hub, perspective)
        );
    }
    if (result === 'قبول التظلم' || result === 'رد التظلم') {
        return (
            resolveGrievanceFilerActor(pipe, perspective) ??
            resolveGrievanceFilerActor(hub, perspective) ??
            resolveEffectiveAppealActor(pipe, hub, perspective)
        );
    }
    return resolveEffectiveAppealActor(pipe, hub, perspective);
}

/** سطر مصير الطلب — نافذية من منظور وكيل المدين */
export function resolveDebtorAgentRequestFateLine(
    enforcement: CreditorDecisionEnforcementState,
    gate: CreditorRequestAppealGate
): string {
    if (gate.kind === 'paused') {
        return 'مصير الطلب: غير نافذ مؤقتاً — الطعن يوقف التنفيذ';
    }
    if (gate.kind === 'revoked') {
        return 'مصير الطلب: طلب الدائن غير نافذ — أُغلقت دورته';
    }
    if (gate.kind === 'lifecycle_reset') {
        return 'مصير الطلب: أُعيدت الدورة — ليس بالصيغة السابقة';
    }
    if (
        enforcement.pillLabel.startsWith('طعن موكّلنا') ||
        enforcement.pillLabel.startsWith('بانتظار تمييز موكّلنا')
    ) {
        return 'مصير الطلب: قيد طعن موكّلنا — غير نافذ حتى البت';
    }
    if (
        enforcement.pillLabel.startsWith('طعن الدائن') ||
        enforcement.pillLabel.startsWith('بانتظار تمييز الدائن')
    ) {
        return 'مصير الطلب: قيد طعن الدائن — غير نافذ مؤقتاً';
    }
    if (enforcement.pillLabel.includes('الطعن لصالح موكّلنا')) {
        return 'مصير الطلب: الطعن لصالح موكّلنا — طلب الدائن غير نافذ';
    }
    if (enforcement.pillLabel.includes('الطعن ضد موكّلنا')) {
        return 'مصير الطلب: الطعن ضد موكّلنا';
    }
    if (enforcement.pillLabel.includes('ضد موكّلنا — نافذ') || enforcement.enforced) {
        return 'مصير الطلب: نافذ ضد موكّلنا';
    }
    if (enforcement.pillLabel.includes('لصالح موكّلنا — نافذ')) {
        return 'مصير الطلب: لصالح موكّلنا — نافذ';
    }
    if (enforcement.pillLabel.includes('ضد موكّلنا')) {
        return 'مصير الطلب: ضد موكّلنا — غير نافذ بعد';
    }
    if (enforcement.pillLabel.includes('لصالح موكّلنا')) {
        return 'مصير الطلب: لصالح موكّلنا';
    }
    return `مصير الطلب: ${enforcement.pillLabel}`;
}

function hasActiveAppealTrack(row: Decision): boolean {
    return (
        row.appealActor === 'lawyer' ||
        row.appealActor === 'debtor' ||
        row.appealMethod === 'tadhallum' ||
        row.appealMethod === 'tamyeez' ||
        row.appealStatus === 'tadhallum_filed' ||
        row.appealStatus === 'tamyeez_filed' ||
        row.appealPhase === 'grievance' ||
        row.appealPhase === 'cassation' ||
        Boolean(row.awaitingCassationEntryBy) ||
        Boolean(row.appealResult) ||
        row.appealWorkflowState === 'PENDING_APPEAL_LAWYER' ||
        row.appealWorkflowState === 'PENDING_APPEAL_DEBTOR'
    );
}

function debtorAgentAppealWorkflowPill(
    hub: Decision,
    pipe: Decision,
    all: Decision[],
    opts: { hubTab: 'current' | 'previous' | 'appeals' | 'archive' }
): CreditorDecisionEnforcementState | null {
    const appealRow = pipe.appealSourceDecisionId
        ? pipe
        : hub.appealSourceDecisionId
          ? hub
          : hasActiveAppealTrack(pipe)
            ? pipe
            : hasActiveAppealTrack(hub)
              ? hub
              : null;
    if (!appealRow && opts.hubTab !== 'appeals') return null;

    const row = appealRow ?? pipe;
    if (!hasActiveAppealTrack(row)) return null;

    const actor = resolveEffectiveAppealActor(row, hub, 'debtor_agent');
    const grievanceOpen =
        row.appealStatus === 'tadhallum_filed' || row.appealPhase === 'grievance';
    const cassationOpen =
        row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation';

    if (grievanceOpen) {
        if (actor === 'debtor') {
            return {
                visual: 'neutral',
                pillLabel: 'طعن موكّلنا — تظلم',
                pillTone: 'amber',
                enforced: false,
            };
        }
        if (actor === 'lawyer') {
            return {
                visual: 'neutral',
                pillLabel: 'طعن الدائن — تظلم',
                pillTone: 'red',
                enforced: false,
            };
        }
    }

    if (cassationOpen) {
        if (actor === 'debtor') {
            return {
                visual: 'neutral',
                pillLabel: 'تمييز موكّلنا',
                pillTone: 'amber',
                enforced: false,
            };
        }
        if (actor === 'lawyer') {
            return {
                visual: 'neutral',
                pillLabel: 'تمييز الدائن',
                pillTone: 'red',
                enforced: false,
            };
        }
    }

    const awaitingCassation = resolveEffectiveAwaitingCassationParty(row, hub);
    if (awaitingCassation === 'lawyer') {
        return {
            visual: 'neutral',
            pillLabel: 'بانتظار تمييز الدائن',
            pillTone: 'amber',
            enforced: false,
        };
    }
    if (awaitingCassation === 'debtor') {
        return {
            visual: 'neutral',
            pillLabel: 'بانتظار تمييز موكّلنا',
            pillTone: 'amber',
            enforced: false,
        };
    }

    const result = String(row.appealResult || '').trim();
    if (result) {
        const resultActor =
            resolveAppealResultActorForClient(row, hub, 'debtor_agent') ??
            actor ??
            row.appealActor;
        const favorableToClient = isAppealResultFavorableToDebtorClient(result, resultActor);
        return {
            visual: 'neutral',
            pillLabel: favorableToClient ? 'الطعن لصالح موكّلنا' : 'الطعن ضد موكّلنا',
            pillTone: favorableToClient ? 'emerald' : 'red',
            enforced: false,
        };
    }

    return null;
}

function debtorAgentExecutorOutcomePill(
    underlying: Decision,
    pipe: Decision,
    state: CreditorDecisionEnforcementState,
    opts: { appealLegallyFinal: boolean }
): CreditorDecisionEnforcementState {
    const neutralVisual: DecisionCardEnforcementVisual = 'neutral';
    const filer = resolveRequestFilerFromDebtorAgentView(underlying);
    const eff = effectiveExecutorOutcomeForCreditorHubPill(underlying, pipe, 'debtor_agent');
    const approved = eff === 'approved' || eff === 'alternative';
    const rejected = eff === 'rejected';

    const adverse =
        (filer === 'creditor' && approved) || (filer === 'debtor' && rejected);
    const favorable =
        (filer === 'creditor' && rejected) || (filer === 'debtor' && approved);

    if (adverse) {
        return {
            ...state,
            visual: neutralVisual,
            pillLabel: approved
                ? state.enforced && opts.appealLegallyFinal
                    ? 'ضد موكّلنا — نافذ'
                    : 'ضد موكّلنا — قبول المنفذ'
                : 'ضد موكّلنا — رفض المنفذ',
            pillTone: 'red',
        };
    }
    if (favorable) {
        return {
            ...state,
            visual: neutralVisual,
            pillLabel: rejected
                ? 'لصالح موكّلنا — رفض المنفذ'
                : state.enforced && opts.appealLegallyFinal
                  ? 'لصالح موكّلنا — نافذ'
                  : 'لصالح موكّلنا — قبول المنفذ',
            pillTone: 'emerald',
        };
    }

    return { ...state, visual: neutralVisual };
}

function remapDebtorAgentEnforcementPresentation(
    state: CreditorDecisionEnforcementState,
    hub: Decision,
    pipe: Decision,
    all: Decision[],
    opts: {
        hubTab: 'current' | 'previous' | 'appeals' | 'archive';
        appealLegallyFinal: boolean;
    }
): CreditorDecisionEnforcementState {
    const appealPill = debtorAgentAppealWorkflowPill(hub, pipe, all, opts);
    if (appealPill) return appealPill;

    const neutralVisual: DecisionCardEnforcementVisual = 'neutral';
    const keepLabelVisuals = new Set<DecisionCardEnforcementVisual>([
        'pending',
        'paused',
        'lifecycle_reset',
        'withdrawn',
    ]);
    if (keepLabelVisuals.has(state.visual)) {
        return { ...state, visual: neutralVisual };
    }

    const underlying = resolveUnderlyingDecisionHub(hub, all);
    return debtorAgentExecutorOutcomePill(underlying, pipe, state, opts);
}

/** مصدر واحد لشارة البطاقة ولونها — يعكس النفاذ الفعلي لا الموافقة الظاهرية فقط */
export function resolveCreditorDecisionEnforcementState(
    hub: Decision,
    pipe: Decision,
    opts: {
        hubTab: 'current' | 'previous' | 'appeals' | 'archive';
        appealLegallyFinal: boolean;
        needsExecutor: boolean;
        appealPerspective?: import('./appealUiLabels').AppealUiPerspective;
        allDecisions?: Decision[];
    }
): CreditorDecisionEnforcementState {
    const all = Array.isArray(opts.allDecisions) ? opts.allDecisions : [];
    const finalize = (state: CreditorDecisionEnforcementState): CreditorDecisionEnforcementState =>
        opts.appealPerspective === 'debtor_agent'
            ? remapDebtorAgentEnforcementPresentation(state, hub, pipe, all, opts)
            : state;

    if (opts.needsExecutor) {
        return finalize({
            visual: 'pending',
            pillLabel: 'بانتظار القرار',
            pillTone: 'amber',
            enforced: false,
        });
    }

    if (hub.executorOutcome === 'withdrawn' || hub.lawyerWithdrawn === true) {
        return finalize({
            visual: 'withdrawn',
            pillLabel: 'تنازل / سحب الطلب',
            pillTone: 'slate',
            enforced: false,
        });
    }

    const perspective = opts.appealPerspective ?? 'creditor_agent';
    const gate = resolveCreditorRequestAppealGate(hub, pipe, perspective);
    if (gate.kind === 'paused') {
        return finalize({
            visual: 'paused',
            pillLabel: 'غير نافذ — مؤقتاً',
            pillTone: 'amber',
            enforced: false,
        });
    }
    if (gate.kind === 'lifecycle_reset') {
        return finalize({
            visual: 'lifecycle_reset',
            pillLabel: 'أُعيدت الدورة',
            pillTone: 'violet',
            enforced: false,
        });
    }
    if (gate.kind === 'revoked') {
        const waived = pipe.noAppealChosen === true || hub.noAppealChosen === true;
        return finalize({
            visual: 'not_enforced',
            pillLabel: waived ? 'مختوم — حسوم' : 'غير نافذ',
            pillTone: waived ? 'slate' : 'red',
            enforced: false,
        });
    }

    const phys = hub.executorOutcome;
    const eff = effectiveExecutorOutcomeForCreditorHubPill(hub, pipe, perspective);
    const creditorApproved =
        isCreditorPartyRequest(hub, perspective) &&
        (phys === 'approved' || phys === 'alternative');
    const effApproved = eff === 'approved' || eff === 'alternative';
    const enforced =
        creditorApproved &&
        effApproved &&
        isCreditorRequestFlowContinues(hub, pipe, perspective) &&
        (opts.appealLegallyFinal || effApproved);

    if (creditorApproved) {
        if (enforced && opts.appealLegallyFinal) {
            return finalize({
                visual: 'enforced',
                pillLabel: 'القرار نافذ',
                pillTone: 'emerald',
                enforced: true,
            });
        }
        if (effApproved && isCreditorRequestFlowContinues(hub, pipe, perspective)) {
            return finalize({
                visual: 'enforced',
                pillLabel: opts.hubTab === 'previous' ? 'قرار قبول' : 'قبول المنفذ',
                pillTone: 'emerald',
                enforced: true,
            });
        }
        return finalize({
            visual: 'not_enforced',
            pillLabel: phys === 'rejected' || eff === 'rejected' ? 'رفض المنفذ' : 'غير نافذ',
            pillTone: 'red',
            enforced: false,
        });
    }

    if (phys === 'rejected' || eff === 'rejected') {
        return finalize({
            visual: 'not_enforced',
            pillLabel: 'رفض المنفذ',
            pillTone: 'red',
            enforced: false,
        });
    }

    if (phys === 'approved' || phys === 'alternative') {
        if (opts.appealLegallyFinal) {
            return finalize({
                visual: 'enforced',
                pillLabel: 'القرار نافذ',
                pillTone: 'emerald',
                enforced: true,
            });
        }
        return finalize({
            visual: 'enforced',
            pillLabel: opts.hubTab === 'previous' ? 'قرار قبول' : 'قبول المنفذ',
            pillTone: 'emerald',
            enforced: true,
        });
    }

    return finalize({
        visual: 'not_enforced',
        pillLabel: 'غير نافذ',
        pillTone: 'slate',
        enforced: false,
    });
}

/** شارة حالة القرار على البطاقة — مع مراعاة التوقف المؤقت بعد قبول تظلم المدين */
export function resolveCreditorDecisionHubStatusPill(
    hub: Decision,
    pipe: Decision,
    opts: {
        hubTab: 'current' | 'previous' | 'appeals' | 'archive';
        appealLegallyFinal: boolean;
        phys: Decision['executorOutcome'];
        needsExecutor?: boolean;
        appealPerspective?: AppealUiPerspective;
        allDecisions?: Decision[];
    }
): { label: string; tone: DecisionHubStatusPillTone } | null {
    const state = resolveCreditorDecisionEnforcementState(hub, pipe, {
        hubTab: opts.hubTab,
        appealLegallyFinal: opts.appealLegallyFinal,
        needsExecutor: Boolean(opts.needsExecutor),
        appealPerspective: opts.appealPerspective,
        allDecisions: opts.allDecisions,
    });
    if (
        opts.phys !== 'approved' &&
        opts.phys !== 'alternative' &&
        state.visual === 'not_enforced' &&
        state.pillLabel === 'غير نافذ'
    ) {
        return { label: state.pillLabel, tone: state.pillTone };
    }
    if (opts.phys !== 'approved' && opts.phys !== 'alternative' && state.visual === 'enforced') {
        return null;
    }
    return { label: state.pillLabel, tone: state.pillTone };
}

function isDecisionLikeRow(hub: Decision | null | undefined): hub is Decision {
    return Boolean(hub) && typeof hub === 'object';
}

/** يستنتج مصدر الطلب لطلبات المحامي القديمة التي تفتقد appealRequestOrigin */
export function inferDecisionAppealRequestOrigin(
    hub: Decision | null | undefined
): Decision['appealRequestOrigin'] | undefined {
    if (!isDecisionLikeRow(hub)) return undefined;
    const explicit = hub.appealRequestOrigin;
    if (explicit === 'creditor_side' || explicit === 'debtor_side' || explicit === 'executor_side') {
        return explicit;
    }
    const rk = String(hub.requestKind || '').trim();
    if (rk && (EXECUTOR_QUEUE_REQUEST_KINDS as readonly string[]).includes(rk)) {
        return 'creditor_side';
    }
    const id = String(hub.id || '').trim();
    if (/^(seizure_req_|eviction_req_|enc_req_)/i.test(id)) return 'creditor_side';
    if (rk === 'seizure' || (!rk && /^seizure_req_/i.test(id))) return 'creditor_side';
    return explicit;
}

export function hubWithInferredAppealOrigin(hub: Decision | null | undefined): Decision {
    if (!isDecisionLikeRow(hub)) return {} as Decision;
    const origin = inferDecisionAppealRequestOrigin(hub);
    if (!origin || origin === hub.appealRequestOrigin) return hub;
    return { ...hub, appealRequestOrigin: origin };
}

export type ExecutorRequestFollowupBlock = Exclude<CreditorRequestAppealGate, { kind: 'continue' }>;

export function resolveExecutorRequestFollowupGate(
    hub: Decision | null | undefined,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): CreditorRequestAppealGate {
    if (!isDecisionLikeRow(hub)) return { kind: 'continue' };
    const hubRow = hubWithInferredAppealOrigin(hub);
    const pipe = appealPipelineRowForCard(hubRow, all);
    return resolveCreditorRequestAppealGate(hubRow, pipe, perspective);
}

export function resolveExecutorRequestFollowupBlock(
    hub: Decision | null | undefined,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): ExecutorRequestFollowupBlock | null {
    if (!isDecisionLikeRow(hub)) return null;
    const hubRow = hubWithInferredAppealOrigin(hub);
    if (isExecutorRequestAppealCycleSuperseded(hubRow, all, perspective)) return null;
    const gate = resolveExecutorRequestFollowupGate(hubRow, all, perspective);
    if (gate.kind === 'paused' || gate.kind === 'lifecycle_reset') {
        return gate;
    }
    return null;
}

export function isExecutorRequestFollowupBlocked(
    hub: Decision | null | undefined,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!isDecisionLikeRow(hub)) return false;
    if (isExecutorRequestAppealCycleSuperseded(hub, all, perspective)) return false;
    const kind = resolveExecutorRequestFollowupGate(hub, all, perspective).kind;
    return kind === 'paused' || kind === 'lifecycle_reset';
}

/**
 * أُعيدت دورة الطلب (تمييز / استغناء / نقض) — لا يُحسب الطلب السابق «قائماً» لمنع طلب جديد.
 * يختلف عن الإيقاف المؤقت (قبول تظلم بانتظار تمييز) حيث يبقى الطلب محجوزاً.
 */
export function isExecutorRequestAppealCycleSuperseded(
    hub: Decision | null | undefined,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!isDecisionLikeRow(hub)) return false;
    if ((hub as Decision).requestCycleSuperseded === true) return true;
    const hubRow = hubWithInferredAppealOrigin(hub);
    const gate = resolveExecutorRequestFollowupGate(hubRow, all, perspective);
    if (gate.kind === 'paused') return false;
    if (gate.kind === 'lifecycle_reset' || gate.kind === 'revoked') return true;

    const pipeEarly = appealPipelineRowForCard(hubRow, all);
    const grievanceFinalEarly = String(pipeEarly.appealResult ?? hubRow.appealResult ?? '').trim();
    if (
        grievanceFinalEarly === 'قبول التظلم' &&
        (pipeEarly.appealStatus === 'final' || hubRow.appealStatus === 'final')
    ) {
        return true;
    }

    const pipe = appealPipelineRowForCard(hubRow, all);
    const workflow = String(pipe.appealWorkflowState ?? hubRow.appealWorkflowState ?? '').trim();
    if (workflow === 'REVOKED_BY_APPEAL') return true;

    const appealResult = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    const appealStatus = pipe.appealStatus ?? hubRow.appealStatus;
    if (appealStatus === 'final' && appealResult === 'نقض القرار') {
        if (!isLawyerCassationNaqdResume(pipe, hubRow)) return true;
    }
    if (appealStatus === 'final' && isCassationAffirmResult(appealResult)) {
        if (isLawyerCassationRadReset(pipe, hubRow.executorOutcome)) return true;
    }

    const noAppeal = pipe.noAppealChosen === true || hubRow.noAppealChosen === true;
    const appealFinal = pipe.appealStatus === 'final' || hubRow.appealStatus === 'final';
    const grievanceAccepted =
        pipe.appealResult === 'قبول التظلم' || hubRow.appealResult === 'قبول التظلم';
    if (noAppeal && appealFinal && grievanceAccepted) return true;
    if (
        noAppeal &&
        appealFinal &&
        (hubRow.executorOutcome === 'rejected' || pipe.executorOutcome === 'rejected')
    ) {
        return true;
    }

    const logs = [
        ...(Array.isArray(hubRow.appealTimelineLogs) ? hubRow.appealTimelineLogs : []),
        ...(Array.isArray(pipe.appealTimelineLogs) ? pipe.appealTimelineLogs : []),
    ];
    if (
        logs.some((l) =>
            /دون تمييز|دون طعن|لا حاجة للطعن|لا حاجة للتمييز/.test(String(l.message || ''))
        )
    ) {
        return true;
    }

    /** طعن نهائي والقرار غير نافذ — أُغلقت دورة الطلب (تمييز/تصديق/رفض نهائي) */
    if (
        appealFinal &&
        isCreditorInitiatedExecutorRequest(hubRow)
    ) {
        const state = resolveCreditorDecisionEnforcementState(hubRow, pipe, {
            hubTab: 'previous',
            appealLegallyFinal: true,
            needsExecutor: false,
            appealPerspective: 'debtor_agent',
        });
        if (!state.enforced && state.visual !== 'paused') {
            return true;
        }
    }

    return false;
}

export function isExecutorRequestAppealCycleSupersededFromRecord(
    row: Record<string, unknown> | null | undefined,
    all: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!row || typeof row !== 'object') return false;
    return isExecutorRequestAppealCycleSuperseded(row as Decision, all as Decision[], perspective);
}

export function isExecutorRequestFollowupBlockedFromRecord(
    row: Record<string, unknown> | null | undefined,
    all: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!row || typeof row !== 'object') return false;
    return isExecutorRequestFollowupBlocked(row as Decision, all as Decision[], perspective);
}

export function resolveExecutorRequestFollowupBlockFromRecord(
    row: Record<string, unknown> | null | undefined,
    all: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): ExecutorRequestFollowupBlock | null {
    if (!row || typeof row !== 'object') return null;
    return resolveExecutorRequestFollowupBlock(row as Decision, all as Decision[], perspective);
}

export function isCreditorApprovedDecisionTemporarilyPaused(hub: Decision, all: Decision[]): boolean {
    return resolveCreditorAppealPauseGate(hub, all) !== null;
}

export function resolveCreditorAppealPauseGate(
    hub: Decision,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): Extract<CreditorRequestAppealGate, { kind: 'paused' }> | null {
    const hubRow = hubWithInferredAppealOrigin(hub);
    if (!isCreditorExecutorAppealSubject(hubRow, perspective)) return null;
    if (hubRow.executorOutcome !== 'approved' && hubRow.executorOutcome !== 'alternative') return null;
    const gate = resolveExecutorRequestFollowupGate(hubRow, all, perspective);
    return gate.kind === 'paused' ? gate : null;
}

export function resolveCreditorRequestAppealGate(
    hub: Decision,
    pipe: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): CreditorRequestAppealGate {
    const hubRow = hubWithInferredAppealOrigin(hub);
    const phys = hubRow.executorOutcome;
    const creditorPartyRequest = isCreditorExecutorAppealSubject(hubRow, perspective);
    const debtorAgentView = perspective === 'debtor_agent';

    const grievanceFinalResult = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    if (
        creditorPartyRequest &&
        grievanceFinalResult === 'قبول التظلم' &&
        (pipe.appealStatus === 'final' || hubRow.appealStatus === 'final')
    ) {
        const waived = pipe.noAppealChosen === true || hubRow.noAppealChosen === true;
        return {
            kind: 'revoked',
            message: appealCreditorRequestRevokedGateMessage(perspective, waived),
            showAppealsShortcut: false,
        };
    }

    const creditorApprovedHub =
        creditorPartyRequest && (phys === 'approved' || phys === 'alternative');

    if (!creditorApprovedHub) {
        return { kind: 'continue' };
    }

    if (isDebtorGrievancePauseState(hubRow, pipe)) {
        const cassationFiled =
            pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation';
        const awaitingLawyerCassation =
            resolveEffectiveAwaitingCassationParty(pipe, hubRow) === 'lawyer' &&
            pipe.appealStatus !== 'final' &&
            !cassationFiled;
        return {
            kind: 'paused',
            message: appealCreditorRequestPauseGateMessage(perspective, { cassationFiled }),
            showAppealsShortcut: false,
            showWaiveCassation: !debtorAgentView && awaitingLawyerCassation,
        };
    }

    if (pipe.appealWorkflowState === 'REVOKED_BY_APPEAL') {
        return {
            kind: 'lifecycle_reset',
            message: 'نُقض القرار بالتمييز — أُعيدت دورة حياة الطلب.',
            showAppealsShortcut: false,
        };
    }

    if (pipe.appealResult === 'نقض القرار' && pipe.appealStatus === 'final') {
        if (!isLawyerCassationNaqdResume(pipe, hubRow)) {
            return {
                kind: 'lifecycle_reset',
                message: 'نُقض القرار بالتمييز — أُعيدت دورة حياة الطلب.',
                showAppealsShortcut: false,
            };
        }
    }

    if (isCassationAffirmResult(pipe.appealResult) && pipe.appealStatus === 'final') {
        if (isLawyerCassationRadReset(pipe, phys)) {
            return {
                kind: 'lifecycle_reset',
                message: 'صُدّق القرار بالتمييز — أُعيدت دورة حياة الطلب.',
                showAppealsShortcut: false,
            };
        }
    }

    return { kind: 'continue' };
}

export function buildWaiveCassationAfterDebtorGrievancePatch(d: Decision): Partial<Decision> {
    return {
        noAppealChosen: true,
        appealStatus: 'final',
        appealPhase: null,
        appealWorkflowState: 'FINAL_REJECTED',
        appealResult: 'قبول التظلم',
        executorOutcome: 'rejected',
        status: 'rejected',
        awaitingCassationEntryBy: null,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        grievanceRejectedAwaitingTamyeez: false,
        appealMethod: 'tadhallum',
    };
}

/** هل يُسمح بالاستغناء عن التمييز بعد قبول تظلم المدين على طلب الدائن الموافق عليه */
export function canWaiveCassationAfterDebtorGrievance(hub: Decision, all: Decision[]): boolean {
    const hubRow = hubWithInferredAppealOrigin(hub);
    const pipe = appealPipelineRowForCard(hubRow, all);
    if (pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation') return false;
    if (pipe.appealStatus === 'final' || hubRow.appealStatus === 'final') return false;
    const awaiting =
        pipe.awaitingCassationEntryBy === 'lawyer' || hubRow.awaitingCassationEntryBy === 'lawyer';
    if (!awaiting) return false;
    const result = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    if (result !== 'قبول التظلم') return false;
    if (!isCreditorInitiatedExecutorRequest(hubRow)) return false;
    const phys = hubRow.executorOutcome;
    return phys === 'approved' || phys === 'alternative';
}

/** استغناء وكيل الدائن عن التمييز بعد رد التظلم وقبل تسجيله */
export function canWaiveLawyerCassationAfterGrievanceRejected(hub: Decision, all: Decision[]): boolean {
    const hubRow = hubWithInferredAppealOrigin(hub);
    const pipe = appealPipelineRowForCard(hubRow, all);
    if (pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation') return false;
    if (pipe.appealStatus === 'final' || hubRow.appealStatus === 'final') return false;
    if (pipe.noAppealChosen === true || hubRow.noAppealChosen === true) return false;
    const awaiting =
        pipe.awaitingCassationEntryBy === 'lawyer' || hubRow.awaitingCassationEntryBy === 'lawyer';
    if (!awaiting) return false;
    const result = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    if (result !== 'رد التظلم') return false;
    if (!(pipe.grievanceRejectedAwaitingTamyeez || hubRow.grievanceRejectedAwaitingTamyeez)) {
        return false;
    }
    return (pipe.appealActor ?? hubRow.appealActor) === 'lawyer';
}

/** أي حالة يحقّ فيها لوكيل الدائن الاستغناء عن خطوة التمييز المتبقية */
export function canWaiveLawyerAwaitingCassation(hub: Decision, all: Decision[]): boolean {
    return (
        canWaiveCassationAfterDebtorGrievance(hub, all) ||
        canWaiveLawyerCassationAfterGrievanceRejected(hub, all)
    );
}

export function buildWaiveLawyerCassationAfterGrievanceRejectedPatch(d: Decision): Partial<Decision> {
    const branch = resolveAppealBaseBranch(d);
    return {
        noAppealChosen: true,
        appealStatus: 'final',
        appealPhase: null,
        appealWorkflowState: branch === 'after_rejection' ? 'FINAL_REJECTED' : 'FINAL_ACCEPTED',
        awaitingCassationEntryBy: null,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        grievanceRejectedAwaitingTamyeez: false,
        appealMethod: 'tadhallum',
    };
}

import { executionDecisionAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';

export function decisionAppealPipelineActive(
    d: Decision,
    actorDraft: 'lawyer' | 'debtor' | null | undefined
): boolean {
    return executionDecisionAppealPipelineActive(d, actorDraft ?? null);
}

function decisionSortTimestamp(d: Decision): number {
    let best = 0;
    const bump = (raw: string | undefined | null) => {
        const t = Date.parse(String(raw ?? '').trim());
        if (!Number.isNaN(t) && t > best) best = t;
    };
    bump(d.resolvedAt);
    bump(d.date);
    if (Array.isArray(d.appealTimelineLogs)) {
        for (const log of d.appealTimelineLogs) bump(log.at);
    }
    const idTs = String(d.id || '').match(/(\d{13})/);
    if (idTs) {
        const t = Number(idTs[1]);
        if (!Number.isNaN(t) && t > best) best = t;
    }
    return best;
}

/** الأحدث أولاً — للعرض في مركز القرارات والطعون */
export function compareDecisionsNewestFirst(a: Decision, b: Decision): number {
    const ta = decisionSortTimestamp(a);
    const tb = decisionSortTimestamp(b);
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
}

export function sortDecisionsNewestFirst(list: Decision[]): Decision[] {
    return [...list].sort(compareDecisionsNewestFirst);
}

/** وسم مرحلة بطاقة سجل الطعون — لتمييز البطاقة للمستخدم */
export function resolveAppealWorkflowPhaseLabel(
    row: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    const awaiting = resolveEffectiveAwaitingCassationParty(row);
    if (awaiting === 'lawyer') {
        return perspective === 'debtor_agent' ? 'بانتظار تمييز الدائن' : 'بانتظار تمييز الدائن';
    }
    if (awaiting === 'debtor') {
        return perspective === 'debtor_agent' ? 'بانتظار تمييز موكّلنا' : 'بانتظار تمييز المدين';
    }
    if (row.appealPhase === 'grievance' || row.appealStatus === 'tadhallum_filed') {
        const actor = resolveGrievanceFilerActor(row, perspective);
        if (perspective === 'debtor_agent' && actor === 'debtor') return 'تظلم موكّلنا';
        if (perspective === 'debtor_agent' && actor === 'lawyer') return 'تظلم الدائن';
        return 'مرحلة التظلم';
    }
    if (row.appealPhase === 'cassation' || row.appealStatus === 'tamyeez_filed') {
        const actor = resolveCassationFilerActor(row);
        if (perspective === 'debtor_agent' && actor === 'lawyer') return 'تمييز الدائن';
        if (perspective === 'debtor_agent' && actor === 'debtor') return 'تمييز موكّلنا';
        return 'مرحلة التمييز';
    }
    if (row.appealStatus === 'final' || row.appealResult) return 'طعن منتهٍ';
    return 'مسار طعن';
}

export type DecisionCardEnforcementVisual =
    | 'enforced'
    | 'paused'
    | 'not_enforced'
    | 'lifecycle_reset'
    | 'pending'
    | 'withdrawn'
    | 'neutral';

export const DECISION_CARD_LAYOUT =
    'flex h-full flex-col justify-between rounded-xl p-2.5 text-right shadow-lg backdrop-blur-xl transition-all duration-300';

export function resolveDecisionCardEnforcementVisual(
    hub: Decision,
    all: Decision[],
    needsExecutor: boolean,
    hubTab: 'current' | 'previous' | 'appeals' | 'archive' = 'previous',
    appealLegallyFinal = false,
    appealPerspective: AppealUiPerspective = 'creditor_agent'
): DecisionCardEnforcementVisual {
    const pipe = appealPipelineRowForCard(hub, all);
    return resolveCreditorDecisionEnforcementState(hub, pipe, {
        hubTab,
        appealLegallyFinal,
        needsExecutor,
        appealPerspective,
        allDecisions: all,
    }).visual;
}

export function decisionCardSurfaceClasses(
    visual: DecisionCardEnforcementVisual | null,
    hubTab: 'current' | 'previous' | 'appeals' | 'archive'
): string {
    if (hubTab !== 'previous' && hubTab !== 'archive' && hubTab !== 'current') {
        return DECISION_GLASS_CARD;
    }
    if (!visual) return DECISION_GLASS_CARD;

    return decisionCardGlassClasses(visual);
}
