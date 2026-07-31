import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import {
    parseCreditorPartyDeathPayload,
    type CreditorPartyDeathStoredAction,
} from '@/app/utils/creditorPartyDeathPersistence';
import { parseDebtorPartyDeathPayload } from '@/app/utils/executorPartyDeathDecisionBuilders';

export type ExecutorDispatcherRoute = 'Notification' | 'BreakLocks' | 'SalaryGarnishment';
export type HeirSubstitutionRequestStatus =
    | 'none'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'alternative';

export type PendingExecutorDecisionHit = {
    decisionId: string;
    requestTitle: string;
};

export type ExecutorDecisionRowLite = {
    id?: string;
    title?: string;
    body?: string;
    requestKind?: string;
    dispatcherRoute?: string;
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
    executorScheduleLabel?: string;
    breakInventoryFurnitureFinalizedAt?: string;
    judicialCustodianDetailsSavedAt?: string;
    executorOutcome?: string;
    appealStatus?: string;
    appealResult?: string;
    appealWorkflowState?: string;
    resolvedAt?: string;
    date?: string;
    creditorPartyDeathPayloadJson?: string;
    debtorPartyDeathPayloadJson?: string;
};

function asText(value: unknown): string {
    return String(value ?? '').trim();
}

function isEvictionProcedureRow(row: ExecutorDecisionRowLite): boolean {
    return asText(row.requestKind) === 'eviction_procedure';
}

function buildPendingExecutorDecisionHit(
    row: ExecutorDecisionRowLite,
): PendingExecutorDecisionHit | null {
    const decisionId = asText(row.id);
    if (!decisionId) return null;
    return {
        decisionId,
        requestTitle: String(row.title ?? ''),
    };
}

function compareDecisionRowRecency(a: ExecutorDecisionRowLite, b: ExecutorDecisionRowLite): number {
    const aDate = asText(a.resolvedAt || a.date);
    const bDate = asText(b.resolvedAt || b.date);
    return bDate.localeCompare(aDate, undefined, { numeric: true });
}

function hasResolvedExecutorOutcome(row: ExecutorDecisionRowLite): boolean {
    const outcome = asText(row.executorOutcome);
    return outcome !== '' && outcome !== 'pending';
}

function matchesExecutorApprovalBranch(
    row: ExecutorDecisionRowLite,
    branch: ReturnType<typeof inferExecutorApprovalDecisionType>,
): boolean {
    if (!isEvictionProcedureRow(row)) return false;
    return (
        inferExecutorApprovalDecisionType({
            title: String(row.title ?? ''),
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: row.evictionWorkflowKey,
        }) === branch
    );
}

export function isGuarantorRequestDecisionRow(row: ExecutorDecisionRowLite): boolean {
    const kind = asText(row.requestKind);
    if (kind === 'guarantor_request') return true;
    const id = asText(row.id);
    if (/^guarantor_req_/i.test(id)) return true;
    const title = String(row.title ?? '');
    if (/طلب إدخال كفيل ضامن|إدخال كفيل ضامن|طلب كفيل/i.test(title)) return true;
    const body = String(row.body ?? '');
    return /كفيل ضامن في الإضبارة|طلباً لإدخال كفيل/i.test(body);
}

export function inferExecutorDispatcherRoute(
    row: ExecutorDecisionRowLite,
): ExecutorDispatcherRoute | null {
    const explicit = row.dispatcherRoute;
    if (
        explicit === 'Notification' ||
        explicit === 'BreakLocks' ||
        explicit === 'SalaryGarnishment'
    ) {
        return explicit;
    }
    const kind = asText(row.requestKind);
    const title = String(row.title ?? '');
    const body = String(row.body ?? '');
    const blob = `${title} ${body}`;
    if (kind === 'seizure' && /راتب|خُمس|خمس|الراتب|salary|garnish|حجز راتب/i.test(blob)) {
        return 'SalaryGarnishment';
    }
    if (kind === 'eviction_procedure' && /كسر|أقفال|قفل|جرد|أثاث|محرر كسر|كسر أقفال/i.test(blob)) {
        return 'BreakLocks';
    }
    if (
        /تبليغ|إخبار|إخطار|بلاغ تنفيذ|notification|إشعار المدين/i.test(blob) ||
        (kind === 'special_followup' && /تبليغ|إخبار|إخطار/i.test(blob))
    ) {
        return 'Notification';
    }
    return null;
}

export function isExecutorRowAppealOverturned(row: ExecutorDecisionRowLite): boolean {
    return asText(row.appealStatus) === 'overturned';
}

function executorRowAppealOverturnsRejection(row: ExecutorDecisionRowLite): boolean {
    if (isExecutorRowAppealOverturned(row)) return true;
    const result = asText(row.appealResult);
    if (result !== 'نقض القرار') return false;
    const outcome = asText(row.executorOutcome);
    if (outcome === 'approved' || outcome === 'alternative') return true;
    const workflowState = asText(row.appealWorkflowState);
    if (workflowState === 'FINAL_ACCEPTED' || workflowState === 'REVOKED_BY_APPEAL') return true;
    const appealStatus = asText(row.appealStatus);
    return appealStatus === 'final' && outcome === 'rejected';
}

export function isExecutorRowEffectivelyApproved(row: ExecutorDecisionRowLite): boolean {
    const outcome = asText(row.executorOutcome);
    if (outcome === 'approved') return true;
    return outcome === 'rejected' && executorRowAppealOverturnsRejection(row);
}

export function isExecutorRowRejectedAndFinal(row: ExecutorDecisionRowLite): boolean {
    return asText(row.executorOutcome) === 'rejected' && !executorRowAppealOverturnsRejection(row);
}

export function latestExecutorDecisionRow(
    rows: ExecutorDecisionRowLite[],
): ExecutorDecisionRowLite | undefined {
    if (rows.length === 0) return undefined;
    return rows.reduce((acc, cur) => (compareDecisionRowRecency(acc, cur) > 0 ? cur : acc), rows[0]);
}

export function sortExecutorDecisionRowsNewestFirst(
    rows: ExecutorDecisionRowLite[],
): ExecutorDecisionRowLite[] {
    return [...rows].sort(compareDecisionRowRecency);
}

export function pickPreferredExecutorDecisionRow(
    a: ExecutorDecisionRowLite,
    b: ExecutorDecisionRowLite,
): ExecutorDecisionRowLite {
    const aResolved = hasResolvedExecutorOutcome(a);
    const bResolved = hasResolvedExecutorOutcome(b);
    if (aResolved !== bResolved) return bResolved ? b : a;
    return compareDecisionRowRecency(a, b) > 0 ? b : a;
}

export function isDebtorHeirSubstitutionDecisionRow(row: ExecutorDecisionRowLite): boolean {
    if (asText(row.requestKind) !== 'debtor_party_death') return false;
    const payload = parseDebtorPartyDeathPayload(String(row.debtorPartyDeathPayloadJson ?? ''));
    if (payload?.action === 'heir_substitution') return true;
    return String(row.title ?? '').includes('إحلال');
}

function resolveHeirSubstitutionStatus(row: ExecutorDecisionRowLite | undefined): HeirSubstitutionRequestStatus {
    if (!row) return 'none';
    const outcome = asText(row.executorOutcome);
    if (outcome === '' || outcome === 'pending') return 'pending';
    if (outcome === 'alternative') return 'alternative';
    if (isExecutorRowEffectivelyApproved(row)) return 'approved';
    if (isExecutorRowRejectedAndFinal(row)) return 'rejected';
    return 'none';
}

export function hasPendingCreditorDeathOnlyReportFromRows(rows: ExecutorDecisionRowLite[]): boolean {
    return rows.some((row) => {
        if (asText(row.requestKind) !== 'creditor_party_death') return false;
        const outcome = String(row.executorOutcome ?? 'pending');
        if (outcome !== 'pending' && row.executorOutcome !== undefined) return false;
        const raw =
            asText(row.creditorPartyDeathPayloadJson) ||
            String(row.body ?? '');
        const payload = parseCreditorPartyDeathPayload(raw);
        return payload?.action === 'death_only';
    });
}

export function hasPendingCreditorPartyDeathRequestFromRows(
    rows: ExecutorDecisionRowLite[],
): boolean {
    return rows.some((row) => {
        const outcome = String(row.executorOutcome ?? 'pending');
        return asText(row.requestKind) === 'creditor_party_death' &&
            (outcome === 'pending' || row.executorOutcome === undefined);
    });
}

export function getCreditorHeirSubstitutionRequestStatusFromRows(
    rows: ExecutorDecisionRowLite[],
): HeirSubstitutionRequestStatus {
    const matches = rows.filter((row) => {
        if (asText(row.requestKind) !== 'creditor_party_death') return false;
        const raw =
            asText(row.creditorPartyDeathPayloadJson) ||
            String(row.body ?? '');
        const payload = parseCreditorPartyDeathPayload(raw);
        return payload?.action === ('heir_substitution' satisfies CreditorPartyDeathStoredAction);
    });
    return resolveHeirSubstitutionStatus(latestExecutorDecisionRow(matches));
}

export function getDebtorHeirSubstitutionRequestStatusFromRows(
    rows: ExecutorDecisionRowLite[],
): HeirSubstitutionRequestStatus {
    return resolveHeirSubstitutionStatus(
        latestExecutorDecisionRow(rows.filter((row) => isDebtorHeirSubstitutionDecisionRow(row))),
    );
}

export function mergeExecutorDecisionRows(
    targetRows: ExecutorDecisionRowLite[],
    sourceRowsGroups: ExecutorDecisionRowLite[][],
): { mergedRows: ExecutorDecisionRowLite[]; touched: boolean } {
    const byId = new Map<string, ExecutorDecisionRowLite>();
    for (const row of targetRows) {
        const id = asText(row.id);
        if (!id) continue;
        byId.set(id, row);
    }

    let touched = false;
    for (const sourceRows of sourceRowsGroups) {
        for (const row of sourceRows) {
            const id = asText(row.id);
            if (!id) continue;
            const previous = byId.get(id);
            if (!previous) {
                byId.set(id, row);
                touched = true;
                continue;
            }
            const next = pickPreferredExecutorDecisionRow(previous, row);
            if (next !== previous) {
                byId.set(id, next);
                touched = true;
            }
        }
    }

    return {
        mergedRows: sortExecutorDecisionRowsNewestFirst(Array.from(byId.values())),
        touched,
    };
}

export function findApprovedFieldVisitNeedingScheduleFromRows(
    rows: ExecutorDecisionRowLite[],
): PendingExecutorDecisionHit | null {
    for (const row of rows) {
        if (!isExecutorRowEffectivelyApproved(row)) continue;
        if (asText(row.executorScheduleLabel) !== '') continue;
        if (!matchesExecutorApprovalBranch(row, 'Field Visit Date')) continue;
        return buildPendingExecutorDecisionHit(row);
    }
    return null;
}

export function findApprovedBreakInventoryNeedingLedgerFromRows(
    rows: ExecutorDecisionRowLite[],
): PendingExecutorDecisionHit | null {
    for (const row of rows) {
        if (!isExecutorRowEffectivelyApproved(row)) continue;
        if (asText(row.breakInventoryFurnitureFinalizedAt) !== '') continue;
        if (!matchesExecutorApprovalBranch(row, 'Lock Breaking & Inventory')) continue;
        return buildPendingExecutorDecisionHit(row);
    }
    return null;
}

export function findApprovedCustodianNeedingDetailsFromRows(
    rows: ExecutorDecisionRowLite[],
): PendingExecutorDecisionHit | null {
    for (const row of rows) {
        if (!isExecutorRowEffectivelyApproved(row)) continue;
        if (asText(row.judicialCustodianDetailsSavedAt) !== '') continue;
        if (!matchesExecutorApprovalBranch(row, 'Judicial Custodian')) continue;
        return buildPendingExecutorDecisionHit(row);
    }
    return null;
}
