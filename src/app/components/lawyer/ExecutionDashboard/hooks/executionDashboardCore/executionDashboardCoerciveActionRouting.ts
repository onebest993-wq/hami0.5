/** توجيه الإجراء الجبري — منطق نقي قابل للاختبار (موجة 7) */

export type DebtorUnifiedRow = {
    id: string;
    name: string;
    cleared?: boolean;
};

export type CoerciveActionRouteResult =
    | { kind: 'toast'; message: string; type: 'warning' | 'info' }
    | { kind: 'redirect_followup'; decisionId: string }
    | { kind: 'save'; subject: { id: string; name: string } };

export function actionTypeToSeizureSubtype(actionType: string): string | null {
    if (actionType === 'vehicle') return 'movable_auction';
    if (actionType === 'salary' || actionType === 'property') return actionType;
    return null;
}

export function isSeizureActionType(actionType: string): boolean {
    return actionType === 'salary' || actionType === 'property' || actionType === 'vehicle';
}

export function isApprovedExecutorSeizureDecision(row: Record<string, unknown>): boolean {
    const o = String(row.executorOutcome || '').trim();
    const appealStatus = String(row.appealStatus || '').trim();
    const appealResult = String(row.appealResult || '').trim();
    const appealWorkflowState = String(row.appealWorkflowState || '').trim();
    return (
        o === 'approved' ||
        o === 'alternative' ||
        (o === 'rejected' &&
            (appealStatus === 'overturned' ||
                appealResult === 'نقض القرار' ||
                appealWorkflowState === 'REVOKED_BY_APPEAL'))
    );
}

export function inferSeizureSubtypeFromRow(row: Record<string, unknown>): string {
    let subtype = String(row.seizureSubtype || '').trim();
    if (subtype) return subtype;
    const t = `${String(row.title || '')}\n${String(row.body || '')}`;
    if (/لدى الغير/i.test(t)) return 'third_party';
    if (/إشارة|اشارة/i.test(t)) return 'notice';
    if (/راتب|مخصصات|مكاف/i.test(t)) return 'salary';
    if (/مال منقول|منقول|مركبة/i.test(t)) return 'movable_auction';
    if (/عقار/i.test(t)) return 'property';
    return 'property';
}

export function findAwaitingSeizureDecisionId(
    actionType: string,
    rows: Array<Record<string, unknown>>,
): string | null {
    const wantedSubtype = actionTypeToSeizureSubtype(actionType);
    if (!wantedSubtype) return null;

    const awaiting = rows.find((r) => {
        if (String(r.requestKind || '') !== 'seizure') return false;
        if (String(r.seizureRequestSavedAt || '').trim()) return false;
        if (!isApprovedExecutorSeizureDecision(r)) return false;
        return inferSeizureSubtypeFromRow(r) === wantedSubtype;
    });

    const decisionId = String(awaiting?.id || '').trim();
    return decisionId || null;
}

export function routeCoerciveAction(params: {
    actionType: string;
    coerciveUiLocked: boolean;
    activeDebtorIsEmployee: boolean;
    awaitingSeizureDecisionId: string | null;
    allDebtorsUnified: DebtorUnifiedRow[];
    executionDebtorTabIndex: number;
    isSolidaryLiability: boolean;
    resolveDebtorSolidaryFlag: (row: DebtorUnifiedRow) => boolean;
    fallbackDebtorName: string;
}): CoerciveActionRouteResult {
    const {
        actionType,
        coerciveUiLocked,
        activeDebtorIsEmployee,
        awaitingSeizureDecisionId,
        allDebtorsUnified,
        executionDebtorTabIndex,
        isSolidaryLiability,
        resolveDebtorSolidaryFlag,
        fallbackDebtorName,
    } = params;

    if (coerciveUiLocked) {
        return {
            kind: 'toast',
            type: 'warning',
            message: '⏸️ الإضبارة موقوفة قانونياً. يجب استئناف التنفيذ أولاً.',
        };
    }

    if (actionType === 'salary' && !activeDebtorIsEmployee) {
        return {
            kind: 'toast',
            type: 'info',
            message: 'حجز الراتب متاح للمدين الموظف فقط.',
        };
    }

    if (awaitingSeizureDecisionId) {
        return { kind: 'redirect_followup', decisionId: awaitingSeizureDecisionId };
    }

    const multi = allDebtorsUnified.length > 1;
    const activeRow = allDebtorsUnified[executionDebtorTabIndex];
    const activeSolidary = activeRow ? resolveDebtorSolidaryFlag(activeRow) : isSolidaryLiability;

    if (activeSolidary && multi) {
        const selectable = allDebtorsUnified.filter(
            (r) => !r.cleared && resolveDebtorSolidaryFlag(r),
        );
        if (selectable.length === 0) {
            return {
                kind: 'toast',
                type: 'warning',
                message: 'لا يوجد مدين نشط لتوجيه الإجراء ضده.',
            };
        }
        const preferred = allDebtorsUnified[executionDebtorTabIndex];
        const picked =
            preferred && !preferred.cleared && resolveDebtorSolidaryFlag(preferred)
                ? preferred
                : selectable[0];
        return { kind: 'save', subject: { id: picked.id, name: picked.name } };
    }

    if (!activeSolidary && multi) {
        const row = allDebtorsUnified[executionDebtorTabIndex];
        if (!row || row.cleared) {
            return {
                kind: 'toast',
                type: 'warning',
                message: 'براءة ذمة هذا المدين — الإجراءات الجبرية معطّلة له في هذا التبويب.',
            };
        }
        return { kind: 'save', subject: { id: row.id, name: row.name } };
    }

    const sole = allDebtorsUnified[0];
    return {
        kind: 'save',
        subject: sole
            ? { id: sole.id, name: sole.name }
            : { id: '', name: fallbackDebtorName },
    };
}
