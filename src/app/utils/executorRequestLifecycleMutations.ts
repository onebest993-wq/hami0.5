import { isExecutorRowRejectedAndFinal } from '@/app/utils/executorDecisionSelectors';
import {
    buildPersonalCoerciveDecisionRow,
    buildSeizureDecisionRow,
    type PersonalCoerciveSubtypeBuilder,
    type SeizureRequestSubtypeBuilder,
    type SeizureRequestTargetBuilder,
} from '@/app/utils/executorRequestDecisionBuilders';
import {
    getGoverningPersonalCoerciveSubtypeRowFromRows,
    isExecutorHubRowInactiveForGoverning,
    isExecutorHubRowSuperseded,
    isPersonalCoerciveSubtypeRowPending,
    type PersonalCoerciveSubtypeSelector,
    type SeizureRequestSubtypeSelector,
} from '@/app/utils/executorRequestGoverningSelectors';

type ExecutorLifecycleRow = Record<string, unknown>;

type PersonalCoerciveScope = {
    debtorKey?: string;
    primaryDebtorKey?: string;
};

const EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES: readonly PersonalCoerciveSubtypeSelector[] = [
    'executive_dossier_presentation',
    'executive_detention',
] as const;

function normalizeText(value: unknown): string {
    return String(value ?? '').trim();
}

function isExecutiveDossierPresentationSubtype(
    subtype: string | null | undefined,
): subtype is PersonalCoerciveSubtypeSelector {
    return EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES.includes(
        normalizeText(subtype) as PersonalCoerciveSubtypeSelector,
    );
}

function rowMatchesDebtorScope(
    row: ExecutorLifecycleRow,
    opts?: PersonalCoerciveScope,
): boolean {
    const targetDebtorKey = normalizeText(opts?.debtorKey);
    if (!targetDebtorKey) return true;
    const rowDebtorKey = normalizeText(row.personalCoerciveDebtorKey);
    if (rowDebtorKey) return rowDebtorKey === targetDebtorKey;
    const primaryDebtorKey = normalizeText(opts?.primaryDebtorKey);
    return Boolean(primaryDebtorKey) && targetDebtorKey === primaryDebtorKey;
}

export function buildPersonalCoerciveSubtypeMatcher(input: {
    subtype: PersonalCoerciveSubtypeSelector;
    debtorKey?: string;
    primaryDebtorKey?: string;
}): (row: ExecutorLifecycleRow) => boolean {
    return (row) =>
        normalizeText(row.requestKind) === 'personal_coercive' &&
        normalizeText(row.personalCoerciveSubtype) === input.subtype &&
        rowMatchesDebtorScope(row, input);
}

export function buildSeizureSubtypeMatcher(
    subtype: SeizureRequestSubtypeSelector,
): (row: ExecutorLifecycleRow) => boolean {
    const targetSubtype = normalizeText(subtype);
    return (row) =>
        normalizeText(row.requestKind) === 'seizure' &&
        normalizeText(row.seizureSubtype) === targetSubtype;
}

export function supersedeRejectedFinalExecutorHubRows(
    rows: ExecutorLifecycleRow[],
    matches: (row: ExecutorLifecycleRow) => boolean,
    nowIso: string,
): ExecutorLifecycleRow[] {
    return rows.map((row) => {
        if (!matches(row)) return row;
        if (isExecutorHubRowSuperseded(row)) return row;
        if (!isExecutorRowRejectedAndFinal(row)) return row;
        return {
            ...row,
            requestCycleSuperseded: true,
            requestCycleSupersededAt: nowIso,
        };
    });
}

export function supersedePriorExecutorHubRows(
    rows: ExecutorLifecycleRow[],
    matches: (row: ExecutorLifecycleRow) => boolean,
    nowIso: string,
): ExecutorLifecycleRow[] {
    return rows.map((row) => {
        if (!matches(row)) return row;
        if (isExecutorHubRowSuperseded(row)) return row;
        const pending =
            row.executorOutcome === 'pending' ||
            row.executorOutcome === undefined ||
            row.executorOutcome === '';
        if (pending) return row;
        return {
            ...row,
            requestCycleSuperseded: true,
            requestCycleSupersededAt: nowIso,
        };
    });
}

export function closeSeizureSubtypeDecisionCycleRows(input: {
    rows: ExecutorLifecycleRow[];
    subtype: SeizureRequestSubtypeSelector;
    nowIso: string;
}): ExecutorLifecycleRow[] {
    return supersedePriorExecutorHubRows(
        input.rows,
        buildSeizureSubtypeMatcher(input.subtype),
        input.nowIso,
    );
}

export function closePersonalCoerciveSubtypeDecisionCycleRows(input: {
    rows: ExecutorLifecycleRow[];
    subtype: PersonalCoerciveSubtypeSelector;
    debtorKey?: string;
    primaryDebtorKey?: string;
    nowIso: string;
}): ExecutorLifecycleRow[] {
    return supersedePriorExecutorHubRows(
        input.rows,
        buildPersonalCoerciveSubtypeMatcher(input),
        input.nowIso,
    );
}

function matchesPersonalCoerciveSubmissionScope(
    row: ExecutorLifecycleRow,
    input: {
        subtype: PersonalCoerciveSubtypeSelector;
        debtorKey?: string;
        primaryDebtorKey?: string;
    },
): boolean {
    if (normalizeText(row.requestKind) !== 'personal_coercive') return false;
    if (!rowMatchesDebtorScope(row, input)) return false;
    const rowSubtype = normalizeText(row.personalCoerciveSubtype);
    if (rowSubtype === input.subtype) return true;
    if (
        (input.subtype === 'executive_detention' ||
            input.subtype === 'executive_dossier_presentation') &&
        (rowSubtype === 'executive_detention_judge' ||
            rowSubtype === 'executive_detention' ||
            rowSubtype === 'executive_dossier_presentation')
    ) {
        return (
            rowSubtype === 'executive_detention_judge' ||
            isExecutiveDossierPresentationSubtype(rowSubtype)
        );
    }
    return false;
}

export function appendPersonalCoerciveExecutorRequestRows(input: {
    rows: ExecutorLifecycleRow[];
    subtype: PersonalCoerciveSubtypeBuilder;
    title: string;
    body: string;
    debtorKey?: string;
    primaryDebtorKey?: string;
    todayYmd: string;
    decisionId: string;
    nowIso: string;
}): { rows: ExecutorLifecycleRow[]; ok: boolean; decisionId?: string } {
    let rows = supersedePriorExecutorHubRows(
        input.rows,
        (row) => matchesPersonalCoerciveSubmissionScope(row, input),
        input.nowIso,
    );

    const duplicatePending = rows.find(
        (row) =>
            row.executorOutcome !== 'approved' &&
            (row.executorOutcome === 'pending' || row.executorOutcome === undefined) &&
            normalizeText(row.requestKind) === 'personal_coercive' &&
            normalizeText(row.personalCoerciveSubtype) === input.subtype &&
            rowMatchesDebtorScope(row, input),
    ) as { id?: string } | undefined;
    const duplicatePendingId = normalizeText(duplicatePending?.id);
    if (duplicatePendingId) {
        return { rows, ok: true, decisionId: duplicatePendingId };
    }
    if (duplicatePending) {
        return { rows, ok: false };
    }

    const row = buildPersonalCoerciveDecisionRow({
        id: input.decisionId,
        title: input.title,
        body: input.body,
        date: input.todayYmd,
        subtype: input.subtype,
        debtorKey: normalizeText(input.debtorKey),
    });
    rows = [row, ...rows];
    return { rows, ok: true, decisionId: input.decisionId };
}

export function appendPersonalCoerciveByExecutorOrderRows(input: {
    rows: ExecutorLifecycleRow[];
    subtype: PersonalCoerciveSubtypeBuilder;
    title: string;
    body: string;
    debtorKey?: string;
    primaryDebtorKey?: string;
    todayYmd: string;
    decisionId: string;
    nowIso: string;
}): { rows: ExecutorLifecycleRow[]; ok: boolean; decisionId?: string } {
    const governing = getGoverningPersonalCoerciveSubtypeRowFromRows(input.rows, input.subtype, {
        debtorKey: input.debtorKey,
        primaryDebtorKey: input.primaryDebtorKey,
    });
    if (governing && isPersonalCoerciveSubtypeRowPending(governing)) {
        return { rows: input.rows, ok: false };
    }

    let rows = supersedePriorExecutorHubRows(
        input.rows,
        buildPersonalCoerciveSubtypeMatcher(input),
        input.nowIso,
    );
    rows = supersedeRejectedFinalExecutorHubRows(
        rows,
        buildPersonalCoerciveSubtypeMatcher(input),
        input.nowIso,
    );

    const row = {
        id: input.decisionId,
        title: input.title,
        body: input.body,
        date: input.todayYmd,
        resolvedAt: input.nowIso,
        appealStatus: 'pending' as const,
        executorOutcome: 'approved' as const,
        status: 'accepted' as const,
        appealBaseBranch: 'after_approval' as const,
        appealRequestOrigin: 'executor_side' as const,
        activatedByExecutorOrder: true,
        requestKind: 'personal_coercive' as const,
        personalCoerciveSubtype: input.subtype,
        appealPhase: null,
        ...(normalizeText(input.debtorKey)
            ? { personalCoerciveDebtorKey: normalizeText(input.debtorKey) }
            : {}),
    };

    return {
        rows: [row, ...rows],
        ok: true,
        decisionId: input.decisionId,
    };
}

function parseSeizedMovableIdFromPayloadJson(raw: string | undefined): string {
    const rawJson = normalizeText(raw);
    if (!rawJson) return '';
    try {
        const payload = JSON.parse(rawJson) as { seizedMovableId?: string };
        return normalizeText(payload?.seizedMovableId);
    } catch {
        return '';
    }
}

function readSeizureRequestTarget(
    row: ExecutorLifecycleRow | null | undefined,
): SeizureRequestTargetBuilder {
    if (!row) return 'debtor';
    const direct = normalizeText(row.seizureTarget);
    if (direct === 'guarantor' || direct === 'debtor') return direct;
    const rawJson = normalizeText(row.seizurePayloadJson);
    if (rawJson) {
        try {
            const payload = JSON.parse(rawJson) as { seizureTarget?: string };
            if (payload?.seizureTarget === 'guarantor') return 'guarantor';
            if (payload?.seizureTarget === 'debtor') return 'debtor';
        } catch {
            /* ignore */
        }
    }
    const blob = `${String(row.title ?? '')}\n${String(row.body ?? '')}`;
    if (/الكفيل|كفيل|الضامن/i.test(blob) && /حجز/i.test(blob)) return 'guarantor';
    return 'debtor';
}

export function appendPendingExecutorSeizureDecisionRows(input: {
    rows: ExecutorLifecycleRow[];
    requestTitle: string;
    requestBody: string;
    seizureSubtype?: SeizureRequestSubtypeBuilder;
    seizureTarget?: SeizureRequestTargetBuilder;
    seizurePayloadJson?: string;
    todayYmd: string;
    decisionId: string;
    nowIso: string;
}): { rows: ExecutorLifecycleRow[]; decisionId?: string | null } {
    const target = normalizeText(input.seizureTarget || 'debtor') as SeizureRequestTargetBuilder;
    const subtype = normalizeText(input.seizureSubtype);

    let rows = supersedeRejectedFinalExecutorHubRows(
        input.rows,
        (row) => {
            if (normalizeText(row.requestKind) !== 'seizure') return false;
            if (readSeizureRequestTarget(row) !== target) return false;
            const rowSubtype = normalizeText(row.seizureSubtype);
            if (subtype && rowSubtype && rowSubtype !== subtype) return false;
            if (subtype && !rowSubtype) return false;
            const rowTitle = normalizeText(row.title);
            const requestTitle = normalizeText(input.requestTitle);
            if (subtype) return true;
            if (!rowTitle || !requestTitle) return false;
            return rowTitle === requestTitle;
        },
        input.nowIso,
    );

    const inputMovableId = parseSeizedMovableIdFromPayloadJson(input.seizurePayloadJson);
    const duplicate = rows.find((row) => {
        if (isExecutorHubRowInactiveForGoverning(row, rows)) return false;
        if (normalizeText(row.requestKind) !== 'seizure') return false;
        if (normalizeText(row.executorOutcome || 'pending') !== 'pending') return false;
        if (readSeizureRequestTarget(row) !== target) return false;
        const rowSubtype = normalizeText(row.seizureSubtype);
        if (subtype && rowSubtype && rowSubtype !== subtype) return false;
        if (subtype && !rowSubtype) return false;
        const rowMovableId = parseSeizedMovableIdFromPayloadJson(
            String(row.seizurePayloadJson || ''),
        );
        if (inputMovableId && rowMovableId && inputMovableId !== rowMovableId) return false;
        const rowTitle = normalizeText(row.title);
        const requestTitle = normalizeText(input.requestTitle);
        if (subtype) {
            if (inputMovableId || rowMovableId) {
                return Boolean(inputMovableId) && inputMovableId === rowMovableId;
            }
            return true;
        }
        if (!rowTitle || !requestTitle) return false;
        return rowTitle === requestTitle;
    });

    if (duplicate && normalizeText(duplicate.id)) {
        return { rows, decisionId: null };
    }

    const row = buildSeizureDecisionRow({
        id: input.decisionId,
        title: input.requestTitle,
        body: input.requestBody,
        date: input.todayYmd,
        seizurePayloadJson: input.seizurePayloadJson,
        seizureSubtype: input.seizureSubtype,
        seizureTarget: input.seizureTarget,
    });
    rows = [row, ...rows];
    return { rows, decisionId: input.decisionId };
}
