import type {
    CriminalComplainant,
    CriminalDefendant,
    Statement,
    StatementHighlightColor,
} from '../../criminalStore';
import { isPartyDeceased } from '../../partyContextFilter';
import { sanitizeContentHighlights } from '../../statementContentHighlights';

export type PersonOption = CriminalComplainant | CriminalDefendant;

/** صفات المُدلي — حصراً لسجل الإفادات (منفصل عن المسار الإجرائي). */
export const STATEMENT_GIVER_TYPE_OPTIONS = [
    { value: 'complainant' as const, label: 'مشتكي/مجني عليه' },
    { value: 'defendant' as const, label: 'مشكو منه/متهم' },
    { value: 'witness' as const, label: 'شاهد' },
] as const;

export function resolveGiverNameLabel(giverType: Statement['giverType'] | ''): string {
    if (giverType === 'complainant') return 'الاسم الكامل (الرباعي) *';
    if (giverType === 'defendant') return 'الاسم الكامل (الرباعي) *';
    if (giverType === 'witness') return 'الاسم الكامل (الرباعي) *';
    return 'الاسم الكامل (الرباعي) *';
}

export const createId = () => {
    return globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export function applyStatementContentHighlight(input: {
    selectionStart: number;
    selectionEnd: number;
    color: StatementHighlightColor;
    contentHighlights: Statement['contentHighlights'];
    contentLength: number;
}):
    | { ok: false; hint: string }
    | { ok: true; next: NonNullable<Statement['contentHighlights']>; hint: string } {
    const { selectionStart, selectionEnd, color, contentHighlights, contentLength } = input;
    if (selectionEnd <= selectionStart) {
        return { ok: false, hint: 'حدّد كلمة أو سطراً في نص الإفادة أولاً.' };
    }
    const next = sanitizeContentHighlights(
        [...(contentHighlights ?? []), { start: selectionStart, end: selectionEnd, color }],
        contentLength,
    );
    return { ok: true, next, hint: '✓ تم تمييز المقطع.' };
}

export function resolveStatementPartyOptionsForGiver(input: {
    statementGiverType: Statement['giverType'] | '';
    complainants: PersonOption[];
    eligibleDefendants: CriminalDefendant[];
    isMutualComplaint: boolean;
}): PersonOption[] {
    const { statementGiverType, complainants, eligibleDefendants, isMutualComplaint } = input;
    if (statementGiverType === 'complainant') {
        const hasCrossInCase =
            isMutualComplaint ||
            complainants.some((c) => (c as { isCrossComplaint?: boolean }).isCrossComplaint === true);
        const aliveComplainants = complainants.filter((c) => !isPartyDeceased(c));
        if (!hasCrossInCase) return aliveComplainants;
        return [...aliveComplainants, ...eligibleDefendants.filter((d) => !isPartyDeceased(d))];
    }
    if (statementGiverType === 'defendant') {
        const accusedComplainants = complainants.filter((c) => {
            if (isPartyDeceased(c)) return false;
            const flag = (c as { isCrossComplaint?: boolean }).isCrossComplaint === true;
            return isMutualComplaint || flag;
        });
        return [...eligibleDefendants.filter((d) => !isPartyDeceased(d)), ...accusedComplainants];
    }
    return [];
}
