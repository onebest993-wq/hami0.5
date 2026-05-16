import { stripEmojisFromText } from '@/app/utils/timelineSmartDisplay';
import type { ExecutionDecisionAppealPhase, ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { Decision } from './types';

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

export function formatRegisteredAppealPathForDecision(row: Decision): string | null {
    const logs = Array.isArray(row.appealTimelineLogs) ? [...row.appealTimelineLogs] : [];
    logs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const parts: string[] = [];
    for (const log of logs) {
        const m = String(log.message || '')
            .replace(/\s+/g, ' ')
            .trim();
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

export function appealEntryShowsDebtorFirst(d: Decision): boolean {
    const origin = d.appealRequestOrigin ?? 'creditor_side';
    const ex = d.executorOutcome;
    if (ex === 'approved' || ex === 'alternative') {
        return origin === 'creditor_side';
    }
    if (ex === 'rejected') {
        return origin === 'debtor_side';
    }
    return false;
}

export function petitionGrantedAfterCassation(d: Decision, choice: 'rad_laheeza' | 'naqd'): boolean {
    const filerIsDebtor = d.appealActor === 'debtor';
    const rad = choice === 'rad_laheeza';
    const debtorOrigin = d.appealRequestOrigin === 'debtor_side';

    if (!debtorOrigin) {
        return filerIsDebtor ? rad : !rad;
    }

    const branch: 'after_approval' | 'after_rejection' =
        d.appealBaseBranch === 'after_rejection' || d.appealBaseBranch === 'after_approval'
            ? d.appealBaseBranch
            : d.executorOutcome === 'rejected'
              ? 'after_rejection'
              : 'after_approval';

    if (branch === 'after_approval') {
        if (filerIsDebtor) return !rad;
        return rad;
    }
    if (filerIsDebtor) return !rad;
    return rad;
}

export function cassationButtonTitles(decision: Decision): { rad: string; naqd: string } {
    const debtorRow = decision.appealRequestOrigin === 'debtor_side';
    if (!debtorRow) {
        return {
            rad: 'رد اللائحة يعني تثبيت طلبنا وما سجّله المنفذ لصالح طلب التنفيذ الذي قدّمناه.',
            naqd: 'نقض هذا القرار يعني رفض طلب المدين وإيقاف الإجراء — بحسب ما ينطبق على هذه الإضبارة.',
        };
    }
    return {
        rad: 'رد اللائحة يعني تثبيت ما قرره المنفذ بشأن طلب الطرف الآخر (المدين).',
        naqd: 'نقض القرار يعني تغيير نتيجة المنفذ في شأن طلب المدين — قبولاً أو رفضاً نهائياً وفق مسار التمييز.',
    };
}

export function inferAppealMethodsUsed(d: Decision): { tadhallum: boolean; tamyeez: boolean } {
    const logs = Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : [];
    const logText = logs.map((l) => l.message).join('\n');
    const tamyeez =
        d.appealMethod === 'tamyeez' ||
        d.appealPhase === 'cassation' ||
        d.appealStatus === 'tamyeez_filed' ||
        Boolean(String(d.tamyeezDecisionNumber || '').trim()) ||
        Boolean(d.appealResult) ||
        /تمييز/.test(logText);
    const tadhallum =
        d.appealMethod === 'tadhallum' ||
        d.appealPhase === 'grievance' ||
        d.appealStatus === 'tadhallum_filed' ||
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
    if (d.executorOutcome === 'rejected') return 'rejected';
    if (d.executorOutcome === 'approved' || d.executorOutcome === 'alternative') return 'accepted';
    if (needsExecutor(d)) return 'pending';
    if (d.status === 'accepted' || d.status === 'rejected') return d.status;
    if (d.appealStatus === 'pending' && !d.executorOutcome) return 'pending';
    return 'accepted';
}

export function getActiveAppealCopyForOriginal(original: Decision, all: Decision[]): Decision | null {
    if (original.appealSourceDecisionId) return null;
    if (original.activeAppealCopyId) {
        const linked = all.find((d) => d.id === original.activeAppealCopyId);
        if (linked) return linked;
    }
    return all.find((d) => d.appealSourceDecisionId === original.id) ?? null;
}

export function appealPipelineRowForCard(row: Decision, all: Decision[]): Decision {
    return getActiveAppealCopyForOriginal(row, all) ?? row;
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

export function effectiveExecutorOutcomeForCreditorHubPill(
    hubRow: Decision,
    pipeline: Decision
): Decision['executorOutcome'] | undefined {
    const phys = hubRow.executorOutcome;
    if (hubRow.appealRequestOrigin !== 'creditor_side') return phys;
    if (phys !== 'approved' && phys !== 'alternative') return phys;

    const p = pipeline;

    if (p.appealWorkflowState === 'REVOKED_BY_APPEAL' || p.appealResult === 'نقض القرار') {
        return 'rejected';
    }
    if (p.executorOutcome === 'rejected' && p.appealStatus === 'final') {
        return 'rejected';
    }

    const debtorGrievanceAcceptedAwaitingOurCassation =
        p.appealActor === 'debtor' &&
        p.awaitingCassationEntryBy === 'lawyer' &&
        p.appealStatus === 'pending' &&
        p.appealPhase == null;

    const cassationOpenAfterDebtorGrievance =
        p.appealActor === 'debtor' &&
        (p.appealStatus === 'tamyeez_filed' || p.appealPhase === 'cassation') &&
        !p.appealResult;

    if (debtorGrievanceAcceptedAwaitingOurCassation || cassationOpenAfterDebtorGrievance) {
        return 'rejected';
    }

    if (p.appealResult === 'رد اللائحة' || p.appealResult === 'تصديق القرار') {
        return phys;
    }

    return phys;
}

import { executionDecisionAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';

export function decisionAppealPipelineActive(
    d: Decision,
    actorDraft: 'lawyer' | 'debtor' | null | undefined
): boolean {
    return executionDecisionAppealPipelineActive(d, actorDraft ?? null);
}

export function sortDecisionsWithAppealPinnedFirst(
    list: Decision[],
    appealActorDraftById: Record<string, 'lawyer' | 'debtor' | null>
): Decision[] {
    return [...list].sort((a, b) => {
        const aPin = decisionAppealPipelineActive(a, appealActorDraftById[a.id]) ? 1 : 0;
        const bPin = decisionAppealPipelineActive(b, appealActorDraftById[b.id]) ? 1 : 0;
        if (aPin !== bPin) return bPin - aPin;
        return String(b.date).localeCompare(String(a.date), undefined, { numeric: true });
    });
}
