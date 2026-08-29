import type { Decision } from '../types';
import {
    EXECUTOR_QUEUE_REQUEST_KINDS,
    appealWindowsForDecision,
    deriveDecisionHubStatus,
    isCassationAffirmResult,
    resolveCassationFilerActor,
} from '../utils';

/** يُطبَّق على كل صف قرار عند التحميل من التخزين */
export function normalizeLoadedDecisionRow(d: Decision): Decision {
    const row = { ...d } as Decision;
    if (!row.requestKind && /طلب حجز|حجز راتب|حجز عقار|منقول/.test(row.title)) {
        row.requestKind = 'seizure';
    }
    if (!row.requestKind && /مصاريف إضبارة|طلب تثبيت مصاريف/.test(row.title)) {
        row.requestKind = 'case_expense';
    }
    if (!row.requestKind && /طلب تنفيذي خاص/.test(String(row.title))) {
        row.requestKind = 'special_followup';
    }
    if (!row.requestKind && /^guarantor_req_/i.test(String(row.id || ''))) {
        row.requestKind = 'guarantor_request';
    }
    if (!row.requestKind && /طلب إدخال كفيل ضامن|طلب كفيل/i.test(String(row.title || ''))) {
        row.requestKind = 'guarantor_request';
    }
    if (!row.requestKind && /^personal_coercive_/i.test(String(row.id || ''))) {
        row.requestKind = 'personal_coercive';
    }
    if (row.requestKind === 'personal_coercive' && !row.personalCoerciveSubtype) {
        const t = String(row.title || '');
        if (/منع سفر|إشارة منع سفر/i.test(t)) row.personalCoerciveSubtype = 'travel_ban';
        else if (/إحضار جبري/i.test(t)) row.personalCoerciveSubtype = 'forced_bring_in';
        else if (/مفاتحة|أمر قبض|تحقيق/i.test(t)) {
            row.personalCoerciveSubtype =
                /تكليف حضور|موظف/i.test(t)
                    ? 'employee_assignment_investigation'
                    : 'arrest_warrant_investigation';
        } else if (/عرض الإضبارة|عرض الاضباره/i.test(t)) {
            row.personalCoerciveSubtype = 'executive_dossier_presentation';
        } else if (/حبس تنفيذي/i.test(t)) row.personalCoerciveSubtype = 'executive_detention';
        else if (/قرار قاضي البداءة/i.test(t)) row.personalCoerciveSubtype = 'executive_detention_judge';
        else if (/إخلاء سبيل/i.test(t)) row.personalCoerciveSubtype = 'release_debtor';
    }
    if (row.personalCoerciveSubtype === 'executive_detention_judge') {
        row.cassationOnlyAppeal = true;
    }
    if (row.personalCoerciveSubtype === 'release_debtor') {
        row.appealStatus = 'final';
        row.noAppealChosen = true;
        if (!row.executorOutcome || row.executorOutcome === 'pending') {
            row.executorOutcome = 'approved';
            row.status = 'accepted';
            row.resolvedAt = row.resolvedAt || new Date().toISOString();
        }
    }
    if (!row.requestKind) {
        const t = String(row.title || '');
        const rid = String(row.id || '');
        if (
            /طلب — إحلال الورثة محل الدائن|طلب — إبلاغ وفاة الدائن|طلب — وفاة الدائن دون ورثة|طلب — تسجيل وريث بعد مسار|وفاة الدائن \/ إحلال الورثة|إضافة مورث \/ وفاة الدائن/.test(
                t
            ) ||
            /^creditor_death_req_/.test(rid)
        ) {
            row.requestKind = 'creditor_party_death';
        }
        if (
            /طلب — إحلال الورثة محل المدين|وفاة المدين|إحلال ورثة المدين/.test(t) ||
            /^debtor_heir_req_/.test(rid)
        ) {
            row.requestKind = 'debtor_party_death';
        }
    }
    if (row.requestKind && !row.executorOutcome && !row.manualExecutorLedgerEntry) {
        row.executorOutcome = 'pending';
    }
    if (row.appealPhase === undefined) row.appealPhase = null;
    if (row.grievanceRejectedAwaitingTamyeez === undefined) {
        row.grievanceRejectedAwaitingTamyeez = false;
    }
    if (row.grievanceAcceptedAwaitingDebtorTamyeez === undefined) {
        row.grievanceAcceptedAwaitingDebtorTamyeez = false;
    }
    if (row.awaitingCassationEntryBy === undefined) row.awaitingCassationEntryBy = null;
    if (!row.awaitingCassationEntryBy && !row.manualExecutorLedgerEntry) {
        if (row.grievanceAcceptedAwaitingDebtorTamyeez) {
            row.awaitingCassationEntryBy =
                row.executorOutcome === 'approved' || row.executorOutcome === 'alternative'
                    ? 'lawyer'
                    : 'debtor';
        } else if (row.grievanceRejectedAwaitingTamyeez) {
            row.awaitingCassationEntryBy =
                row.executorOutcome === 'approved' || row.executorOutcome === 'alternative'
                    ? 'debtor'
                    : 'lawyer';
        }
    }
    if (row.appealRequestOrigin !== 'debtor_side' && row.appealRequestOrigin !== 'executor_side') {
        const titleBlob = `${String(row.title || '')} ${String(row.body || '')}`;
        if (row.requestKind === 'guarantor_request') {
            row.appealRequestOrigin = 'debtor_side';
        } else if (
            row.requestKind === 'special_followup' &&
            /تحرك\s*الطرف\s*الآخر|طرف\s*آخر\s*—\s*قيد\s*البت/i.test(titleBlob)
        ) {
            row.appealRequestOrigin = 'debtor_side';
        } else {
            row.appealRequestOrigin = 'creditor_side';
        }
    }
    if (row.appealActor === undefined) row.appealActor = null;
    if (row.appealMethod === undefined) row.appealMethod = null;
    if (
        row.appealRequestOrigin === 'creditor_side' &&
        row.appealActor === 'debtor' &&
        row.appealResult === 'قبول التظلم' &&
        row.appealStatus !== 'tamyeez_filed' &&
        row.appealPhase !== 'cassation' &&
        row.executorOutcome === 'rejected'
    ) {
        row.executorOutcome = 'approved';
        row.status = 'accepted';
    }
    if (row.noAppealChosen !== true) {
        row.noAppealChosen = false;
    }
    if (!Array.isArray(row.appealTimelineLogs)) row.appealTimelineLogs = [];
    const hasAppealActivity =
        row.appealActor === 'lawyer' ||
        row.appealActor === 'debtor' ||
        row.appealMethod === 'tadhallum' ||
        row.appealMethod === 'tamyeez' ||
        row.appealStatus === 'tadhallum_filed' ||
        row.appealStatus === 'tamyeez_filed' ||
        row.appealPhase === 'grievance' ||
        row.appealPhase === 'cassation' ||
        Boolean(row.awaitingCassationEntryBy) ||
        Boolean(row.grievanceRejectedAwaitingTamyeez) ||
        Boolean(row.grievanceAcceptedAwaitingDebtorTamyeez) ||
        Boolean(row.appealResult) ||
        (Array.isArray(row.appealTimelineLogs) && row.appealTimelineLogs.length > 0);
    if (hasAppealActivity) {
        if (!row.appealActor) {
            if (row.appealResult === 'تصديق القرار') {
                row.appealActor = row.executorOutcome === 'approved' ? 'debtor' : 'lawyer';
            } else if (
                row.appealResult === 'نقض القرار' ||
                isCassationAffirmResult(row.appealResult) ||
                row.appealStatus === 'tamyeez_filed' ||
                row.appealPhase === 'cassation'
            ) {
                row.appealActor = resolveCassationFilerActor(row);
            } else if (row.appealStatus === 'tadhallum_filed' || row.appealPhase === 'grievance') {
                row.appealActor = row.executorOutcome === 'approved' ? 'debtor' : 'lawyer';
            }
        } else if (
            row.appealResult === 'نقض القرار' ||
            isCassationAffirmResult(row.appealResult) ||
            row.appealStatus === 'tamyeez_filed' ||
            row.appealPhase === 'cassation'
        ) {
            const cassationFiler = resolveCassationFilerActor(row);
            if (cassationFiler) row.appealActor = cassationFiler;
        }
        if (!row.appealMethod) {
            if (row.appealStatus === 'tadhallum_filed' || row.appealPhase === 'grievance') {
                row.appealMethod = 'tadhallum';
            } else if (row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation') {
                row.appealMethod = 'tamyeez';
            }
        }
    }
    if (!hasAppealActivity) {
        row.appealWorkflowState = 'NONE';
    } else {
        const pendingAppeal =
            row.appealStatus === 'tadhallum_filed' ||
            row.appealStatus === 'tamyeez_filed' ||
            row.appealPhase === 'grievance' ||
            row.appealPhase === 'cassation' ||
            row.grievanceRejectedAwaitingTamyeez ||
            row.grievanceAcceptedAwaitingDebtorTamyeez ||
            row.awaitingCassationEntryBy === 'lawyer' ||
            row.awaitingCassationEntryBy === 'debtor';
        if (pendingAppeal) {
            row.appealWorkflowState =
                row.appealActor === 'debtor'
                    ? 'PENDING_APPEAL_DEBTOR'
                    : row.appealActor === 'lawyer'
                      ? 'PENDING_APPEAL_LAWYER'
                      : row.awaitingCassationEntryBy === 'debtor'
                        ? 'PENDING_APPEAL_DEBTOR'
                        : row.awaitingCassationEntryBy === 'lawyer'
                          ? 'PENDING_APPEAL_LAWYER'
                          : 'NONE';
        } else if (row.appealResult) {
            if (row.appealStatus === 'final') {
                if (row.appealWorkflowState === 'REVOKED_BY_APPEAL') {
                    /* يُبقى */
                } else {
                    row.appealWorkflowState =
                        row.status === 'accepted'
                            ? 'FINAL_ACCEPTED'
                            : row.status === 'rejected'
                              ? 'FINAL_REJECTED'
                              : row.appealWorkflowState ?? 'NONE';
                }
            } else if (row.appealResult === 'تصديق القرار') {
                row.appealWorkflowState =
                    row.executorOutcome === 'approved' ? 'FINAL_ACCEPTED' : 'FINAL_REJECTED';
            } else if (row.appealResult === 'نقض القرار') {
                row.appealWorkflowState =
                    row.executorOutcome === 'approved' ? 'REVOKED_BY_APPEAL' : 'FINAL_ACCEPTED';
            } else if (row.appealResult === 'قبول التظلم' || row.appealResult === 'رد التظلم') {
                row.appealWorkflowState = 'NONE';
            } else {
                row.appealWorkflowState = 'FINAL_ACCEPTED';
            }
        } else {
            row.appealWorkflowState = 'NONE';
        }
    }
    const execDecidedForAppealClock =
        Boolean(
            row.requestKind &&
                EXECUTOR_QUEUE_REQUEST_KINDS.includes(row.requestKind) &&
                (row.executorOutcome === 'approved' ||
                    row.executorOutcome === 'rejected' ||
                    row.executorOutcome === 'alternative')
        );
    const noOpenAppealPipeline =
        row.appealStatus !== 'tadhallum_filed' &&
        row.appealStatus !== 'tamyeez_filed' &&
        !row.awaitingCassationEntryBy &&
        !row.appealMethod &&
        !row.appealResult &&
        !row.appealActor &&
        row.appealPhase == null;
    /** لم يُثبَّت طعن فعلي: لا تظلم/تمييز مفتوح */
    const shouldAutoCloseIdleAppeal = noOpenAppealPipeline;
    if (
        execDecidedForAppealClock &&
        row.appealStatus !== 'final' &&
        shouldAutoCloseIdleAppeal
    ) {
        const wClock = appealWindowsForDecision(row);
        if (wClock.isPastTamyeezDeadline) {
            row.appealStatus = 'final';
            row.appealWorkflowState =
                row.executorOutcome === 'rejected' ? 'FINAL_REJECTED' : 'FINAL_ACCEPTED';
        }
    }
    const executorSideNoBranchYet =
        row.appealRequestOrigin === 'executor_side' &&
        row.appealStatus !== 'final' &&
        noOpenAppealPipeline;
    if (executorSideNoBranchYet) {
        const wEx = appealWindowsForDecision(row);
        if (wEx.isPastTamyeezDeadline) {
            row.appealStatus = 'final';
            row.appealWorkflowState = 'FINAL_ACCEPTED';
        }
    }
    /** قرار منفذ يدوي: بعد اختيار مسار دائن/مدين دون إجراء طعن فعلي خلال 8 أيام */
    const manualExecutorPathAwaitingRealAppeal =
        !row.requestKind &&
        row.appealStatus !== 'final' &&
        (row.appealRequestOrigin === 'creditor_side' ||
            row.appealRequestOrigin === 'debtor_side') &&
        row.executorOutcome === 'rejected' &&
        row.appealBaseBranch === 'after_rejection' &&
        shouldAutoCloseIdleAppeal;
    if (manualExecutorPathAwaitingRealAppeal) {
        const wMan = appealWindowsForDecision(row);
        if (wMan.isPastTamyeezDeadline) {
            row.appealStatus = 'final';
            row.appealWorkflowState =
                row.status === 'rejected' || row.executorOutcome === 'rejected'
                    ? 'FINAL_REJECTED'
                    : 'FINAL_ACCEPTED';
        }
    }
    if (row.status == null || row.status === undefined) {
        const tmpNeeds = (x: Decision) =>
            Boolean(
                x.requestKind &&
                    EXECUTOR_QUEUE_REQUEST_KINDS.includes(x.requestKind) &&
                    (x.executorOutcome === undefined || x.executorOutcome === 'pending')
            );
        row.status = deriveDecisionHubStatus(row, tmpNeeds);
    }
    return row;
}
