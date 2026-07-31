import type {
    JudicialCassationAppealPath,
    JudicialDecision,
    JudicialDecisionAppeal,
} from '@/app/types/criminal';
import {
    buildCassationHistoricalBadgeLite,
    formatCassationResultShortLabelLite,
    normalizeCassationAppealResultLite,
} from './cassationResultSummary';
import { parseEventDateKey } from './stageJourneyRuntimeCore';

export function normalizeJudicialAppealPath(raw: unknown): JudicialCassationAppealPath {
    const v = String(raw ?? '').trim();
    if (v === 'intervention_264b' || v === 'correction_266') return v;
    return 'ordinary';
}

export function formatJudicialAppealPathLabel(path: JudicialCassationAppealPath | undefined): string {
    if (path === 'intervention_264b') return 'طلب تدخل تمييزي (م 264-ب)';
    if (path === 'correction_266') return 'طلب تصحيح قرار تمييزي (م 266)';
    return 'طعن تمييزي';
}

export function formatJudicialAppealAppellantLabel(
    appeal: JudicialDecisionAppeal,
    partyLabel: (id: string) => string,
): string {
    const manual = String(appeal.appellantManualLabel ?? '').trim();
    if (manual) return manual;
    const ids = (Array.isArray(appeal.appellantIds) ? appeal.appellantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const names = ids.map(partyLabel).filter((n) => n && n !== '—');
    return names.length ? names.join('، ') : '—';
}

export function decisionHasActiveAppealOfPath(
    decision: JudicialDecision,
    path: JudicialCassationAppealPath,
): boolean {
    return (Array.isArray(decision.appeals) ? decision.appeals : []).some((a) => {
        if (normalizeJudicialAppealPath(a.appealPath) !== path) return false;
        if (isCassationAppealResultFinalized(a)) return false;
        if (a.cassationStatus === 'concluded') return false;
        return String(a.filedAt ?? '').trim().length > 0;
    });
}

export function decisionAlreadyHasCassationAppeal(decision: JudicialDecision): boolean {
    return decisionHasActiveAppealOfPath(decision, 'ordinary');
}

export function isCassationAppealResultFinalized(appeal: JudicialDecisionAppeal): boolean {
    if (appeal.cassationStatus !== 'concluded') return false;
    return Boolean(
        normalizeCassationAppealResultLite(typeof appeal.result === 'string' ? appeal.result : undefined),
    );
}

export function isRecordedCassationAppealConcluded(appeal: JudicialDecisionAppeal): boolean {
    if (!isCassationAppealResultFinalized(appeal)) return false;
    return Boolean(String(appeal.filedAt ?? '').trim());
}

export function filterRecordedCassationAppeals(
    appeals: JudicialDecisionAppeal[] | undefined,
): JudicialDecisionAppeal[] {
    return (Array.isArray(appeals) ? appeals : []).filter(isRecordedCassationAppealConcluded);
}

export function getPendingCassationAppealForResult(
    decision: JudicialDecision,
): JudicialDecisionAppeal | undefined {
    const appeals = Array.isArray(decision.appeals) ? decision.appeals : [];
    const pathPriority: JudicialCassationAppealPath[] = ['intervention_264b', 'correction_266', 'ordinary'];
    for (const path of pathPriority) {
        const hit = appeals.find((a) => isPendingJudicialAppealForResult(a, path));
        if (hit) return hit;
    }
    return undefined;
}

export function getJudicialDecisionAppealsOfPath(
    decision: JudicialDecision,
    path: JudicialCassationAppealPath,
): JudicialDecisionAppeal[] {
    return (Array.isArray(decision.appeals) ? decision.appeals : []).filter(
        (a) => normalizeJudicialAppealPath(a.appealPath) === path,
    );
}

export function isPendingJudicialAppealForResult(
    appeal: JudicialDecisionAppeal,
    path?: JudicialCassationAppealPath,
): boolean {
    if (path && normalizeJudicialAppealPath(appeal.appealPath) !== path) return false;
    if (isCassationAppealResultFinalized(appeal)) return false;
    if (appeal.cassationStatus === 'concluded') return false;
    const hasResult = Boolean(
        normalizeCassationAppealResultLite(typeof appeal.result === 'string' ? appeal.result : undefined),
    );
    if (hasResult) return false;
    return appeal.cassationStatus === 'pending' || appeal.cassationStatus === 'under_review';
}

export function getLatestJudicialAppealOfPath(
    decision: JudicialDecision,
    path: JudicialCassationAppealPath,
): JudicialDecisionAppeal | undefined {
    const list = getJudicialDecisionAppealsOfPath(decision, path);
    return list.length ? list[list.length - 1] : undefined;
}

export function resolveJudicialInterventionAppealStatusLabel(
    appeal: JudicialDecisionAppeal | undefined,
): string {
    if (!appeal) return 'قيد النظر — بانتظار النتيجة';
    if (isCassationAppealResultFinalized(appeal)) {
        const normalizedResult = normalizeCassationAppealResultLite(
            typeof appeal.result === 'string' ? appeal.result : undefined,
        );
        const resultLabel = normalizedResult
            ? formatCassationResultShortLabelLite(normalizedResult)
            : '';
        return resultLabel ? `منتهٍ — ${resultLabel}` : 'منتهٍ — نتيجة مسجّلة';
    }
    if (isPendingJudicialAppealForResult(appeal)) {
        return 'قيد التدقيق التمييزي — بانتظار النتيجة';
    }
    return 'قيد النظر — بانتظار النتيجة';
}

export function sortJudicialDecisionsChronologically(list: JudicialDecision[]): JudicialDecision[] {
    return [...list].sort((a, b) => parseEventDateKey(a.issuedAt) - parseEventDateKey(b.issuedAt));
}

export function sortJudicialDecisionsNewestFirst(list: JudicialDecision[]): JudicialDecision[] {
    return [...list].sort((a, b) => parseEventDateKey(b.issuedAt) - parseEventDateKey(a.issuedAt));
}

export function formatRectificationBadge(
    appeal: JudicialDecisionAppeal,
    partyLabelById: (id: string) => string,
    decisionTitle?: string,
): string | null {
    if (!isRecordedCassationAppealConcluded(appeal)) return null;
    return buildCassationHistoricalBadgeLite(appeal, partyLabelById, decisionTitle);
}

export function latestConcludedAppealWithBeneficiary(
    decision: JudicialDecision,
): JudicialDecisionAppeal | null {
    const concluded = filterRecordedCassationAppeals(decision.appeals);
    return concluded.length ? concluded[concluded.length - 1]! : null;
}

export function formatJudicialLedgerDate(iso: string | undefined): string {
    const raw = String(iso ?? '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return raw || '—';
}
