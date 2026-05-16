/**
 * هل انتهى مسار الطعن نهائياً؟ (يُزال من تبويب الطعون ويُعرض كقرار عادي في السابقة)
 */
export function isExecutionAppealTerminal(row: {
    appealStatus?: string | null;
    appealWorkflowState?: string | null;
}): boolean {
    if (row.appealStatus === 'final') return true;
    const ws = row.appealWorkflowState;
    return ws === 'FINAL_ACCEPTED' || ws === 'FINAL_REJECTED' || ws === 'REVOKED_BY_APPEAL';
}

type AppealPipelineRow = {
    appealStatus?: string | null;
    appealWorkflowState?: string | null;
    appealActor?: string | null;
    appealMethod?: string | null;
    appealPhase?: string | null;
    awaitingCassationEntryBy?: string | null;
    grievanceRejectedAwaitingTamyeez?: boolean;
    grievanceAcceptedAwaitingDebtorTamyeez?: boolean;
};

/**
 * طعن «مادّي»: تظلم/تمييز مُسجَّل أو مرحلة لاحقة — لا يكفي مجرد وجود appealActor أو كون القرار في الذاكرة.
 */
export function executionRowHasSubstantiveAppealPipeline(row: AppealPipelineRow): boolean {
    if (isExecutionAppealTerminal(row)) return false;
    return (
        row.appealStatus === 'tadhallum_filed' ||
        row.appealStatus === 'tamyeez_filed'
    );
}

export type ExecutionAppealBannerKind = 'tadhallum' | 'tamyeez';

function rowPointsToTamyeezPhase(p: AppealPipelineRow): boolean {
    return (
        p.appealStatus === 'tamyeez_filed'
    );
}

function rowPointsToTadhallumPhase(p: AppealPipelineRow): boolean {
    return (
        p.appealStatus === 'tadhallum_filed'
    );
}

/**
 * لشارات الإضبارة: أولوية التمييز إن دخل الملف مرحلته، وإلا التظلم.
 */
export function computeExecutionAppealBannerKind(
    rows: Record<string, unknown>[]
): ExecutionAppealBannerKind | null {
    let seenTamyeez = false;
    let seenTadhallum = false;
    for (const r of rows) {
        if (!executionRowAppealPipelineActive(r)) continue;
        const p = rowAppealPipelineFields(r);
        if (isExecutionAppealTerminal(p)) continue;
        if (!executionRowHasSubstantiveAppealPipeline(p)) continue;
        if (rowPointsToTamyeezPhase(p)) seenTamyeez = true;
        if (rowPointsToTadhallumPhase(p)) seenTadhallum = true;
    }
    if (seenTamyeez) return 'tamyeez';
    if (seenTadhallum) return 'tadhallum';
    return null;
}

export function decisionsRowsAppealBannerState(rows: Record<string, unknown>[]): {
    show: boolean;
    kind: ExecutionAppealBannerKind | null;
} {
    const activeSubstantiveRows = rows.filter((r) => {
        const p = rowAppealPipelineFields(r);
        if (isExecutionAppealTerminal(p)) return false;
        if (!executionRowAppealPipelineActive(r)) return false;
        return executionRowHasSubstantiveAppealPipeline(p);
    });
    if (activeSubstantiveRows.length === 0) return { show: false, kind: null };
    const kind = computeExecutionAppealBannerKind(activeSubstantiveRows);
    if (!kind) return { show: false, kind: null };
    return { show: true, kind };
}

/**
 * مسار طعن «مفتوح» — يظهر في تبويب الطعون؛ مسودة اختيار الطريقة تُحسب نشطة عند تمرير actorDraft.
 * لا يُفعَّل لمجرد appealActor أو قبول/رفض المنفذ دون تسجيل تظلم/تمييز.
 */
export function executionDecisionAppealPipelineActive(
    row: AppealPipelineRow,
    actorDraft?: 'lawyer' | 'debtor' | null
): boolean {
    if (isExecutionAppealTerminal(row)) return false;
    if (actorDraft === 'lawyer' || actorDraft === 'debtor') return true;
    return executionRowHasSubstantiveAppealPipeline(row);
}

function rowAppealPipelineFields(r: Record<string, unknown>): AppealPipelineRow {
    return {
        appealStatus: r.appealStatus as string | undefined,
        appealWorkflowState: r.appealWorkflowState as string | undefined,
        appealActor: r.appealActor as string | undefined,
        appealMethod: r.appealMethod as string | undefined,
        appealPhase: r.appealPhase as string | undefined,
        awaitingCassationEntryBy: r.awaitingCassationEntryBy as string | undefined,
        grievanceRejectedAwaitingTamyeez: Boolean(r.grievanceRejectedAwaitingTamyeez),
        grievanceAcceptedAwaitingDebtorTamyeez: Boolean(r.grievanceAcceptedAwaitingDebtorTamyeez),
    };
}

export function executionRowAppealPipelineActive(r: Record<string, unknown>): boolean {
    const p = rowAppealPipelineFields(r);
    if (isExecutionAppealTerminal(p)) return false;
    if (typeof r.activeAppealCopyId === 'string' && r.activeAppealCopyId.trim()) {
        return true;
    }
    if (r.appealSourceDecisionId) {
        return executionRowHasSubstantiveAppealPipeline(p);
    }
    return executionDecisionAppealPipelineActive(p, null);
}
