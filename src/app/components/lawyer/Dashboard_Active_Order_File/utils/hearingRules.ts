import type { CaseHearing, PreDecisionHearingOutcomeKind } from '../types';
import {
    PRE_DECISION_CLOSURE_TOKENS,
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from '../constants/hearingOutcomes';

/** يرفض أسباب التأجيل المكوّنة من أرقام فقط */
export function isAdjournReasonValid(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^[\d\s\u0660-\u0669]+$/.test(trimmed)) return false;
    return /[a-zA-Z\u0600-\u06FF]/.test(trimmed);
}

export function isPreDecisionNullifyNotes(notes: string): boolean {
    const n = String(notes || '');
    return (
        n.includes(PRE_DECISION_OUTCOME_NULLIFY) ||
        n.includes('إبطال الطلب') ||
        n.includes('إنهاء الطلب')
    );
}

export function isPreDecisionCloseNotes(notes: string): boolean {
    const n = String(notes || '');
    if (isPreDecisionNullifyNotes(n)) return false;
    return PRE_DECISION_CLOSURE_TOKENS.some((t) => n.includes(t));
}

export function getPreDecisionSessionOutcome(notes: string, nextSessionDate?: string): string {
    if (isPreDecisionNullifyNotes(notes)) return PRE_DECISION_OUTCOME_NULLIFY;
    if (isPreDecisionCloseNotes(notes)) return PRE_DECISION_OUTCOME_CLOSE;
    if (String(nextSessionDate || '').trim()) return PRE_DECISION_OUTCOME_ADJOURN;
    return String(notes || '').trim();
}

export function getPreDecisionHearingOutcome(h: CaseHearing): PreDecisionHearingOutcomeKind {
    const notes = String(h.notes || '');
    if (isPreDecisionNullifyNotes(notes)) return 'terminate';
    if (isPreDecisionCloseNotes(notes)) return 'close';
    if (String(h.nextSessionDate || '').trim()) return 'adjourn';
    return 'close';
}

/** أحدث جلسة تظلم أُقفلت بها المرافعة (معادل «ختام المرافعة» لمرحلة التظلم) */
export function isGrievancePleadingClosedSession(h: CaseHearing): boolean {
    const notes = String(h.notes || '');
    if (isPreDecisionNullifyNotes(notes)) return false;
    if (isPreDecisionCloseNotes(notes)) return true;
    return !String(h.nextSessionDate || '').trim();
}
