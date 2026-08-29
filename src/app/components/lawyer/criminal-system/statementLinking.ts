import type { Statement } from './criminalStore';
import type { TrialDeposition, TrialDepositionComparison, TrialDepositionLinkKind } from './trialDepositionsEngine';
import { resolveTrialDepositionPersonName } from './trialDepositionsEngine';
import { resolveStatementPersonName } from './statementGiverDisplay';

export type LinkableStatementEntry =
    | { kind: 'statement'; phase: 'investigation' | 'trial'; record: Statement }
    | { kind: 'trial_deposition'; phase: 'trial'; record: TrialDeposition };

export function buildLinkableStatementEntries(input: {
    investigationStatements: Statement[];
    trialStatements: Statement[];
    trialDepositions: TrialDeposition[];
    excludeDepositionId?: string;
}): LinkableStatementEntry[] {
    const out: LinkableStatementEntry[] = [];
    for (const record of input.investigationStatements) {
        out.push({ kind: 'statement', phase: 'investigation', record });
    }
    for (const record of input.trialStatements) {
        out.push({ kind: 'statement', phase: 'trial', record });
    }
    for (const record of input.trialDepositions) {
        if (input.excludeDepositionId && record.id === input.excludeDepositionId) continue;
        out.push({ kind: 'trial_deposition', phase: 'trial', record });
    }
    return out;
}

export function linkableEntryId(entry: LinkableStatementEntry): string {
    return entry.kind === 'statement' ? `st:${entry.record.id}` : `td:${entry.record.id}`;
}

export function parseLinkableEntryId(raw: string): { kind: TrialDepositionLinkKind; id: string } | null {
    const v = String(raw ?? '').trim();
    if (v.startsWith('st:')) return { kind: 'statement', id: v.slice(3) };
    if (v.startsWith('td:')) return { kind: 'trial_deposition', id: v.slice(3) };
    return null;
}

export function resolveLinkableEntryLabel(entry: LinkableStatementEntry): string {
    if (entry.kind === 'statement') {
        const name = resolveStatementPersonName(entry.record);
        return `${name} ┬╖ ${entry.record.date}`;
    }
    return `${resolveTrialDepositionPersonName(entry.record)} ┬╖ ${entry.record.date}`;
}

export function resolveComparisonLinkedEntry(
    comparison: TrialDepositionComparison,
    entries: LinkableStatementEntry[],
): LinkableStatementEntry | null {
    if (!comparison.linkedKind || !comparison.linkedId) return null;
    const prefix = comparison.linkedKind === 'statement' ? 'st:' : 'td:';
    return entries.find((e) => linkableEntryId(e) === `${prefix}${comparison.linkedId}`) ?? null;
}

export function resolveComparisonTrialExcerpt(
    deposition: TrialDeposition,
    comparison: TrialDepositionComparison,
): string {
    const excerpt = String(comparison.trialExcerpt ?? comparison.trialText ?? '').trim();
    return excerpt || deposition.content;
}

export function linkedEntryContent(entry: LinkableStatementEntry): string {
    return entry.record.content;
}

export function linkedEntryHighlights(entry: LinkableStatementEntry) {
    return entry.kind === 'statement' ? entry.record.contentHighlights : entry.record.contentHighlights;
}

export function linkedEntryPersonName(entry: LinkableStatementEntry): string {
    if (entry.kind === 'statement') return resolveStatementPersonName(entry.record);
    return resolveTrialDepositionPersonName(entry.record);
}

export function linkedEntryGiverType(entry: LinkableStatementEntry) {
    return entry.record.giverType;
}

export function linkedEntryDate(entry: LinkableStatementEntry): string {
    return entry.record.date;
}

export function phaseLabelForEntry(entry: LinkableStatementEntry): string {
    if (entry.phase === 'investigation') return '╪د┘╪ز╪ص┘é┘è┘é ╪د┘╪د╪ذ╪ز╪»╪د╪خ┘è';
    return '┘à╪ص┘â┘à╪ر ╪د┘┘à┘ê╪╢┘ê╪╣';
}
