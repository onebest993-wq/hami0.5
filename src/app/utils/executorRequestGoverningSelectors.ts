import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    type ExecutorDecisionRowLite,
} from '@/app/utils/executorDecisionSelectors';
import {
    isExecutorRequestAppealCycleSupersededFromRecord,
    isExecutorRequestFollowupBlockedFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';

export type PersonalCoerciveSubtypeSelector =
    | 'forced_bring_in'
    | 'arrest_warrant_investigation'
    | 'employee_assignment_investigation'
    | 'travel_ban'
    | 'executive_detention'
    | 'executive_dossier_presentation'
    | 'executive_detention_judge'
    | 'release_debtor';

export type SeizureRequestSubtypeSelector =
    | 'movable'
    | 'movable_auction'
    | 'property'
    | 'salary'
    | 'notice'
    | 'third_party';

type GoverningDecisionRow = ExecutorDecisionRowLite & {
    requestKind?: string;
    seizureSubtype?: string;
    executorOutcome?: string;
    personalCoerciveSubtype?: string;
    personalCoerciveDebtorKey?: string;
    domainIsolationSuppressed?: boolean;
    isArchived?: boolean;
    lawyerWithdrawn?: boolean;
    requestCycleSuperseded?: boolean;
    dossierPresentationClosed?: boolean;
};

type PersonalCoerciveScope = {
    debtorKey?: string;
    primaryDebtorKey?: string;
};

const DOSSIER_PRESENTATION_SUBTYPES: readonly PersonalCoerciveSubtypeSelector[] = [
    'executive_dossier_presentation',
    'executive_detention',
] as const;

function asTrimmed(value: unknown): string {
    return String(value ?? '').trim();
}

function sortRowsNewestFirst(rows: GoverningDecisionRow[]): GoverningDecisionRow[] {
    return [...rows].sort((a, b) =>
        asTrimmed(b.resolvedAt ?? b.date).localeCompare(asTrimmed(a.resolvedAt ?? a.date), undefined, {
            numeric: true,
        }),
    );
}

function normalizeDebtorKey(value: unknown): string {
    return asTrimmed(value);
}

function rowMatchesPersonalCoerciveScope(
    row: GoverningDecisionRow,
    opts?: PersonalCoerciveScope,
): boolean {
    const targetDebtorKey = normalizeDebtorKey(opts?.debtorKey);
    if (!targetDebtorKey) return true;
    const rowDebtorKey = normalizeDebtorKey(row.personalCoerciveDebtorKey);
    if (rowDebtorKey) return rowDebtorKey === targetDebtorKey;
    const primaryDebtorKey = normalizeDebtorKey(opts?.primaryDebtorKey);
    return Boolean(primaryDebtorKey) && targetDebtorKey === primaryDebtorKey;
}

function filterPersonalCoerciveSubtypeRowsFromRows(
    rows: GoverningDecisionRow[],
    subtype: PersonalCoerciveSubtypeSelector,
    opts?: PersonalCoerciveScope,
): GoverningDecisionRow[] {
    return rows.filter(
        (row) =>
            asTrimmed(row.requestKind) === 'personal_coercive' &&
            asTrimmed(row.personalCoerciveSubtype) === subtype &&
            rowMatchesPersonalCoerciveScope(row, opts),
    );
}

function buildSeizureSubtypeMatcher(
    subtype: SeizureRequestSubtypeSelector,
): (row: GoverningDecisionRow) => boolean {
    const targetSubtype = asTrimmed(subtype);
    return (row) =>
        asTrimmed(row.requestKind) === 'seizure' && asTrimmed(row.seizureSubtype) === targetSubtype;
}

export function isExecutorHubRowSuperseded(
    row: GoverningDecisionRow | null | undefined,
): boolean {
    return row?.requestCycleSuperseded === true;
}

export function isExecutorHubRowInactiveForGoverning(
    row: GoverningDecisionRow | null | undefined,
    allDecisions: GoverningDecisionRow[] = [],
): boolean {
    if (!row) return true;
    if (isExecutorHubRowSuperseded(row)) return true;
    if (row.domainIsolationSuppressed === true) return true;
    if (row.isArchived === true) return true;
    if (row.lawyerWithdrawn === true) return true;

    const outcome = asTrimmed(row.executorOutcome);
    if (outcome === 'withdrawn') return true;

    const subtype = asTrimmed(row.personalCoerciveSubtype);
    if (subtype === 'executive_dossier_presentation') {
        if (row.dossierPresentationClosed === true) return true;
        if (isExecutorRowEffectivelyApproved(row)) return true;
    }
    if (subtype === 'travel_ban' && isExecutorRowEffectivelyApproved(row)) return true;
    if (subtype === 'executive_detention' && isExecutorRowEffectivelyApproved(row)) return false;

    if (
        allDecisions.length > 0 &&
        isExecutorRequestAppealCycleSupersededFromRecord(row, allDecisions)
    ) {
        return true;
    }
    return false;
}

export function isPersonalCoerciveSubtypeRowPending(row: GoverningDecisionRow): boolean {
    const outcome = asTrimmed(row.executorOutcome || 'pending');
    return outcome === 'pending' || outcome === '';
}

export function getPersonalCoerciveSubtypeAppealRowFromRows(
    allDecisions: GoverningDecisionRow[],
    subtype: PersonalCoerciveSubtypeSelector,
    opts?: PersonalCoerciveScope,
): GoverningDecisionRow | null {
    const sorted = sortRowsNewestFirst(
        filterPersonalCoerciveSubtypeRowsFromRows(allDecisions, subtype, opts).filter((row) => {
            if (isExecutorHubRowSuperseded(row)) return false;
            if (row.lawyerWithdrawn === true) return false;
            return asTrimmed(row.executorOutcome) !== 'withdrawn';
        }),
    );
    const pending = sorted.find((row) => isPersonalCoerciveSubtypeRowPending(row));
    return pending ?? sorted[0] ?? null;
}

export function getGoverningPersonalCoerciveSubtypeRowFromRows(
    allDecisions: GoverningDecisionRow[],
    subtype: PersonalCoerciveSubtypeSelector,
    opts?: PersonalCoerciveScope,
): GoverningDecisionRow | null {
    const sorted = sortRowsNewestFirst(
        filterPersonalCoerciveSubtypeRowsFromRows(allDecisions, subtype, opts).filter(
            (row) => !isExecutorHubRowInactiveForGoverning(row, allDecisions),
        ),
    );
    const pending = sorted.find((row) => isPersonalCoerciveSubtypeRowPending(row));
    return pending ?? sorted[0] ?? null;
}

export function getGoverningDossierPresentationRowFromRows(
    allDecisions: GoverningDecisionRow[],
    opts?: PersonalCoerciveScope,
): GoverningDecisionRow | null {
    const merged = DOSSIER_PRESENTATION_SUBTYPES.flatMap((subtype) =>
        filterPersonalCoerciveSubtypeRowsFromRows(allDecisions, subtype, opts).filter(
            (row) => !isExecutorHubRowInactiveForGoverning(row, allDecisions),
        ),
    );
    const sorted = sortRowsNewestFirst(merged);
    const pending = sorted.find((row) => isPersonalCoerciveSubtypeRowPending(row));
    return pending ?? sorted[0] ?? null;
}

export function getNewestPersonalCoerciveSubtypeRowFromRows(
    rows: GoverningDecisionRow[],
    subtype: PersonalCoerciveSubtypeSelector,
    opts?: PersonalCoerciveScope,
): GoverningDecisionRow | null {
    return sortRowsNewestFirst(filterPersonalCoerciveSubtypeRowsFromRows(rows, subtype, opts))[0] ?? null;
}

export function getGoverningSeizureDecisionBySubtypeFromRows(
    allDecisions: GoverningDecisionRow[],
    subtype: SeizureRequestSubtypeSelector,
): GoverningDecisionRow | null {
    const active = allDecisions.filter(
        (row) =>
            buildSeizureSubtypeMatcher(subtype)(row) &&
            !isExecutorHubRowInactiveForGoverning(row, allDecisions),
    );
    const sorted = sortRowsNewestFirst(active);
    const pending = sorted.find((row) => isPersonalCoerciveSubtypeRowPending(row));
    return pending ?? sorted[0] ?? null;
}

export function hasActivePersonalCoerciveSubtypeCardFromRows(
    allDecisions: GoverningDecisionRow[],
    subtype: PersonalCoerciveSubtypeSelector,
    opts?: PersonalCoerciveScope,
): boolean {
    const row = getGoverningPersonalCoerciveSubtypeRowFromRows(allDecisions, subtype, opts);
    if (!row) return false;
    if (row.lawyerWithdrawn === true) return false;
    if (asTrimmed(row.executorOutcome) === 'withdrawn') return false;
    if (isExecutorHubRowInactiveForGoverning(row, allDecisions)) return false;
    if (isPersonalCoerciveSubtypeRowPending(row)) return true;
    if (isExecutorRowRejectedAndFinal(row)) return true;
    if (isExecutorRequestAppealCycleSupersededFromRecord(row, allDecisions)) return false;
    if (isExecutorRequestFollowupBlockedFromRecord(row, allDecisions)) return true;
    return false;
}
