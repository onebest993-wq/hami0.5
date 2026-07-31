import { executionDecisionAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';
import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    inferDecisionAppealRequestOrigin,
    isCreditorInitiatedExecutorRequest,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';
import { resolveManualExecutorWorkflowPhase } from './manualExecutorIdentity';
import {
    resolveGrievanceFilerActor,
    resolveCassationFilerActor,
} from './appealWorkflowActors';
import { resolveEffectiveAwaitingCassationParty } from './appealProceedings';

export function decisionAppealPipelineActive(
    d: Decision,
    actorDraft: 'lawyer' | 'debtor' | null | undefined
): boolean {
    return executionDecisionAppealPipelineActive(d, actorDraft ?? null);
}

/** قرار «إضافة قرار» داخل مسار طعن نشط (علم 2) */
export function manualExecutorAppealPipelineActive(d: Decision): boolean {
    if (isAppealDeadlinePerpetuallyEnforced(d) || d.isArchived) return false;
    return (
        isManualExecutorLedgerDecision(d) && resolveExecutorDecisionStatusFlag(d) === 2
    );
}

/** الأصل يُعرض في سجل الطعون فقط — لا في القرارات السابقة */
export function hubHasActiveAppealLedgerEntry(hub: Decision): boolean {
    // قرار «إضافة قرار» يبقى في القرارات السابقة طوال مسار الطعن اليدوي
    if (hub.manualExecutorLedgerEntry === true) return false;
    if (hub.appealSourceDecisionId) return false;
    if (hub.activeAppealCopyId) return true;
    return decisionAppealPipelineActive(hub, null);
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

/** قرارات «إضافة قرار» الملغاة (علم 3) تُدفع لأسفل القائمة */
export function compareDecisionsTerminatedManualLast(a: Decision, b: Decision): number {
    const aTerminated =
        isManualExecutorLedgerDecision(a) && resolveExecutorDecisionStatusFlag(a) === 3;
    const bTerminated =
        isManualExecutorLedgerDecision(b) && resolveExecutorDecisionStatusFlag(b) === 3;
    if (aTerminated !== bTerminated) return aTerminated ? 1 : -1;
    return compareDecisionsNewestFirst(a, b);
}

export function sortDecisionsNewestFirstTerminatedManualLast(list: Decision[]): Decision[] {
    return [...list].sort(compareDecisionsTerminatedManualLast);
}

export type AppealsHubProponentFilter = 'all' | 'creditor' | 'debtor' | 'executor';

/** تصنيف بطاقة سجل الطعون — يعتمد على القرار الأصلي لا نسخة المسار */
export function resolveAppealHubProponentCategory(
    appealRow: Decision,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): 'creditor' | 'debtor' | 'executor' {
    const hub = resolveUnderlyingDecisionHub(appealRow, all);
    if (hub.manualExecutorLedgerEntry === true) return 'executor';
    if (isCreditorInitiatedExecutorRequest(hub)) return 'creditor';
    const origin = hub.appealRequestOrigin ?? inferDecisionAppealRequestOrigin(hub);
    if (origin === 'debtor_side') return 'debtor';
    if (resolveRequestProponent(hub, perspective) === 'debtor') return 'debtor';
    return 'creditor';
}

/** خيارات التصنيف — تُخفى إن كان نوع واحد فقط؛ «من المنفذ» يظهر عند وجود قرار يدوي */
export function resolveAppealsHubFilterOptions(
    cards: Decision[],
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): AppealsHubProponentFilter[] {
    const categories = new Set<'creditor' | 'debtor' | 'executor'>();
    for (const d of cards) {
        categories.add(resolveAppealHubProponentCategory(d, all, perspective));
    }
    if (categories.size <= 1) return [];
    const opts: AppealsHubProponentFilter[] = ['all'];
    if (categories.has('creditor')) opts.push('creditor');
    if (categories.has('debtor')) opts.push('debtor');
    if (categories.has('executor')) opts.push('executor');
    return opts;
}

export function appealsHubProponentFilterLabel(filter: AppealsHubProponentFilter): string {
    if (filter === 'all') return 'الكل';
    if (filter === 'creditor') return 'من قبلنا';
    if (filter === 'debtor') return 'من الطرف الآخر';
    return 'من المنفذ';
}

/** آخر نشاط طعن — للترتيب في سجل الطعون (لا يُعادل تاريخ القرار الأصلي بنشاط الطعن) */
export function decisionAppealActivityTimestamp(d: Decision): number {
    let best = 0;
    const bump = (raw: string | undefined | null) => {
        const t = Date.parse(String(raw ?? '').trim());
        if (!Number.isNaN(t) && t > best) best = t;
    };
    if (Array.isArray(d.appealTimelineLogs)) {
        for (const log of d.appealTimelineLogs) bump(log.at);
    }
    const copyTs = String(d.id || '').match(/appeal_copy_(\d{13})/);
    if (copyTs) {
        const t = Number(copyTs[1]);
        if (!Number.isNaN(t) && t > best) best = t;
    }
    if (best > 0) return best;
    bump(d.resolvedAt);
    bump(d.date);
    const idTs = String(d.id || '').match(/(\d{13})/);
    if (idTs) {
        const t = Number(idTs[1]);
        if (!Number.isNaN(t) && t > best) best = t;
    }
    return best;
}

export function compareDecisionsAppealActivityNewestFirst(a: Decision, b: Decision): number {
    const ta = decisionAppealActivityTimestamp(a);
    const tb = decisionAppealActivityTimestamp(b);
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
}

export function sortDecisionsAppealActivityNewestFirst(list: Decision[]): Decision[] {
    return [...list].sort(compareDecisionsAppealActivityNewestFirst);
}

/** وسم مرحلة بطاقة سجل الطعون — لتمييز البطاقة للمستخدم */
export function resolveAppealWorkflowPhaseLabel(
    row: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    if (manualExecutorAppealPipelineActive(row)) {
        const phase = resolveManualExecutorWorkflowPhase(row);
        if (phase === 'grievance_pending') return 'تظلم معلّق';
        if (phase === 'cassation_unlocked') return 'مهلة التمييز';
        if (phase === 'cassation_pending') return 'تمييز معلّق';
        return 'مسار طعن';
    }
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

