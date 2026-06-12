import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { X, Plus, Scale, Send } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type {
    ExecutionFile,
    SeizedAsset,
    TimelineEvent,
} from '@/app/types/execution';
import { useDecisionDispatcher } from '@/app/hooks/useDecisionDispatcher';
import type { ExecutorApprovalActions } from '@/app/utils/executorApprovalWorkflow';
import {
    dispatchDecisionsReload,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import {
    applyWaiveInitialAppealForExecution,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import { isSeizureDecisionFollowupComplete } from '@/app/components/lawyer/DecisionsAndAppealsEngine/seizureFollowupComplete';
import {
    isExecutionAppealTerminal,
} from '@/app/utils/executionDecisionAppealActive';
import {
    formatCreditorPartyDeathSummaryAr,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import {
    filterDecisionsForDomainContext,
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import SecureStoreService from '@/app/services/SecureStoreService';
import { useExecutionDashboardStore, INABA_SUB_FILE_ID, makeInabaSubFileId, isInabaSubFileId } from '@/app/stores/executionDashboardStore';
import { loadExecutionFilesRaw, saveExecutionFilesRaw, EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { applyDossierSpecialFollowupOutcome } from '@/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome';
import { storageCache } from '@/app/utils/storageCache';
import GlowingDot from './DecisionsAndAppealsEngine/components/GlowingDot';
import DecisionHintTooltip from './DecisionsAndAppealsEngine/components/DecisionHintTooltip';
import DecisionCard from './DecisionsAndAppealsEngine/components/DecisionCard';
import { ExecutorSideAppealEntryPanel } from './DecisionsAndAppealsEngine/components/ExecutorSideAppealEntryPanel';
import type { ManualAppealAppellantActor } from './DecisionsAndAppealsEngine/utils';
import AppealWorkflowCard from './DecisionsAndAppealsEngine/components/AppealWorkflowCard';
import type { Decision } from './DecisionsAndAppealsEngine/types';
import {
    DECISION_APPEAL_TOOLBAR_BTN_PRIMARY,
    DECISION_APPEAL_TOOLBAR_BTN_SECONDARY,
    DECISION_APPEAL_TOOLBAR_ROW,
    DECISION_BTN_DEBTOR_APPEAL_NOTICE,
    DECISION_BTN_GRIEVANCE_ACCEPT,
    DECISION_BTN_GRIEVANCE_REJECT,
    DECISION_NOTICE_GLASS,
} from './DecisionsAndAppealsEngine/decisionCardPresentation';
import {
    newEventId,
    DECISIONS_APPEALS_TOOLTIP_DELAY_MS,
    DECISION_GLASS_CARD,
    formatDateNumeric,
    cleanTitle,
    shouldShowDecisionHubBody,
    stripRedundantLeadingLinesFromHubBody,
    appealWindowsFromClockYmd,
    resolveHarmedPartyAppealActor,
    isCassationAffirmResult,
    petitionGrantedAfterCassation,
    buildGrievanceResolutionPatch,
    grievancePetitionGranted,
    decisionAppealClockYmd,
    inferAppealMethodsUsed,
    deriveDecisionHubStatus,
    getActiveAppealCopyForOriginal,
    appealPipelineRowForCard,
    formatRegisteredAppealPathForDecision,
    resolveCreditorDecisionEnforcementState,
    EXECUTOR_QUEUE_REQUEST_KINDS,
    decisionAppealPipelineActive,
    hubHasActiveAppealLedgerEntry,
    sortDecisionsNewestFirst,
    sortDecisionsAppealActivityNewestFirst,
    resolveAppealHubProponentCategory,
    resolveAppealsHubFilterOptions,
    appealsHubProponentFilterLabel,
    type AppealsHubProponentFilter,
    isExecutorDecisionAppealFinal,
    canWaiveCassationAfterDebtorGrievance,
    canWaiveLawyerAwaitingCassation,
    resolveCassationFilerActor,
    resolveEffectiveAwaitingCassationParty,
    resolveUnderlyingDecisionHub,
    isLawyerCassationNaqdResume,
    hubWithInferredAppealOrigin,
    buildExecutorSideAppealCommitPatch,
    executorSideAppealTimelineMessage,
    purgeManualExecutorAppealArtifacts,
    creditorAgentDebtorIsSoleAppellant,
    isCreditorInitiatedExecutorRequest,
    renderDecisionHubStatusPill,
    type AppealDeadlineWindows,
    type DecisionsAppealsAppealSlot,
} from './DecisionsAndAppealsEngine/utils';
import { scrollToDomIdWhenReady } from '@/app/utils/decisionsModalScroll';
import { applyLawyerCassationEntryForExecution } from '@/app/utils/lawyerCassationEntry';
import {
    appealCassationEntryLabels,
    appealDirectCassationButtonLabel,
    appealInitialCassationEntryButtonLabel,
    appealInitialGrievanceEntryButtonLabel,
    appealInitialCassationTimeline,
    appealInitialGrievanceTimeline,
    appealLawyerCassationAutoEntryDescription,
    resolveAppealUiPerspective,
} from './DecisionsAndAppealsEngine/appealUiLabels';

function normalizeBaseDossierIdFromDecisionsKey(rawKey: string | undefined): string {
    const key = String(rawKey || '').trim();
    if (!key) return '';
    const childIdx = key.indexOf('__child__');
    const subIdx = key.indexOf('__sub__');
    const idx =
        childIdx >= 0 && subIdx >= 0 ? Math.min(childIdx, subIdx) : childIdx >= 0 ? childIdx : subIdx;
    const base = (idx >= 0 ? key.slice(0, idx) : key).trim();
    if (!base || base === 'default' || base === 'undefined' || base === 'null') return '';
    return base;
}




/** شارة مصدر الطلب بجانب عنوان القرار */
/** تلميحات hover على أزرار التمييز — توجيه المحامي */

function dispatchHeirSubstitutionOutcomeIfAny(
    executionId: string | undefined,
    d: { requestKind?: Decision['requestKind']; executorOutcome?: Decision['executorOutcome'] }
) {
    void executionId;
    void d;
}

/** تكامل مركز القرارات مع محضر المتابعة وملف التنفيذ (useDecisionDispatcher) */
export interface DecisionsDispatcherHubProps {
    executionData: ExecutionFile | null;
    seizedAssets: SeizedAsset[];
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimeline: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    syncSeizedAssets?: (assets: SeizedAsset[]) => void;
    syncSeizureDrafts?: (drafts: Record<string, SeizedAsset>) => void;
    syncActiveCoerciveActions?: (actions: string[]) => void;
    /** لقطة إضبارة للسجل عند قرار المنفذ (pushTimeline) */
    getTimelineSnapshot?: () => unknown;
}

interface DecisionsAndAppealsEngineProps {
    executionId: string | undefined;
    onTimelineUpdate: (event: TimelineEvent) => void;
    dispatcherHub?: DecisionsDispatcherHubProps;
    /**
     * عند التفعيل: بعد «قبول المنفذ» على طلب eviction_procedure يُستدعى handleExecutorApproval
     * (موعد ميداني، مهمة شرطة، أو الانتقال لمحضر التنفيذ).
     */
    evictionExecutorWorkflow?: {
        dossierId: string;
        actions: ExecutorApprovalActions;
    };
    /** عند فتح مركز القرارات من شارة الإضبارة: التبويب الابتدائي */
    bootHubTab?: 'current' | 'previous' | 'appeals' | null;
    /** تمرير لبطاقة القرار في تبويب الطلبات/القرارات */
    decisionsScrollToIdOnBoot?: string | null;
    /** بعد فتح تبويب الطعون: تمرير لبطاقة القرار */
    appealsScrollToIdOnBoot?: string | null;
    /** معاينة لقطة ماضية — تعطيل الإضافة والتعديل على القرارات والطعون */
    isHistoricalMode?: boolean;
    /** لقطات عند إضافة قرار / فتح مسار طعن */
    getMilestoneTimelineSnapshot?: () => unknown;
}



export const DecisionsAndAppealsEngine: React.FC<DecisionsAndAppealsEngineProps> = ({
    executionId,
    onTimelineUpdate,
    evictionExecutorWorkflow,
    dispatcherHub,
    bootHubTab,
    decisionsScrollToIdOnBoot,
    appealsScrollToIdOnBoot,
    isHistoricalMode = false,
    getMilestoneTimelineSnapshot,
}) => {
    const [decisions, setDecisions] = useState<Decision[]>([]);

    const executionDataForSync = dispatcherHub?.executionData ?? null;

    const persistDecisionsToStorage = React.useCallback(
        (next: Decision[]) => {
            writeExecutorDecisionsArray(
                executionId,
                next as unknown as Record<string, unknown>[],
                executionDataForSync as Record<string, unknown> | null | undefined
            );
        },
        [executionId, executionDataForSync]
    );

    const appealPerspective = useMemo(
        () => resolveAppealUiPerspective(executionDataForSync),
        [executionDataForSync]
    );

    const executionDomainContext = useMemo(
        () => resolveExecutionDomainContext(executionDataForSync, executionId),
        [executionDataForSync, executionId]
    );

    const domainVisibleDecisions = useMemo(
        () => filterDecisionsForDomainContext(executionDomainContext, decisions),
        [executionDomainContext, decisions]
    );

    const reloadFromStorage = React.useCallback(() => {
        let raw: Decision[] = readExecutorDecisionsArray(executionId) as Decision[];
        /** إصلاح كارثي: ضمان عدم تكرار IDs — لأن التحديث يعتمد على id (وإلا تتغير عدة بطاقات معاً) */
        if (Array.isArray(raw) && raw.length > 0) {
            const seen = new Set<string>();
            let mutated = false;
            raw = raw.map((d, idx) => {
                const current = d as unknown as Record<string, unknown>;
                const idRaw = String(current.id ?? '').trim();
                if (!idRaw || seen.has(idRaw)) {
                    mutated = true;
                    const uuid = (globalThis as any).crypto?.randomUUID?.() as string | undefined;
                    const nextId = uuid
                        ? `${idRaw || 'decision'}_${uuid}`
                        : `${idRaw || 'decision'}_${Date.now()}_${idx}_${Math.random().toString(16).slice(2)}`;
                    return { ...(d as Decision), id: nextId };
                }
                seen.add(idRaw);
                return d;
            });
            if (mutated) {
                try {
                    persistDecisionsToStorage(raw);
                } catch {
                    /* ignore */
                }
            }
        }
        let normalized = raw.map((d) => {
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
            const storedWaivedAppeal =
                row.noAppealChosen === true &&
                (row.appealStatus === 'final' ||
                    (Array.isArray(row.appealTimelineLogs) &&
                        row.appealTimelineLogs.some((l) =>
                            /دون تظلم|دون طعن|لا حاجة للطعن|لا حاجة للتمييز/.test(String(l.message || ''))
                        )));
            if (!storedWaivedAppeal) {
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
                        row.appealWorkflowState =
                            row.appealStatus === 'final'
                                ? row.status === 'accepted'
                                    ? 'FINAL_ACCEPTED'
                                    : 'FINAL_REJECTED'
                                : 'NONE';
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
            /** لم يُثبَّت طعن فعلي: لا تظلم/تمييز، أو تمييز دون حفظ رقم القرار التمييزي */
            const tamyeezFiledWithoutNumber =
                row.appealStatus === 'tamyeez_filed' &&
                row.appealMethod === 'tamyeez' &&
                !String(row.tamyeezDecisionNumber || '').trim();
            const shouldAutoCloseIdleAppeal = noOpenAppealPipeline || tamyeezFiledWithoutNumber;
            if (
                execDecidedForAppealClock &&
                row.appealStatus !== 'final' &&
                shouldAutoCloseIdleAppeal
            ) {
                const wClock = appealWindowsFromClockYmd(decisionAppealClockYmd(row));
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
                const wEx = appealWindowsFromClockYmd(decisionAppealClockYmd(row));
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
                const wMan = appealWindowsFromClockYmd(decisionAppealClockYmd(row));
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
        });
        const purgedManual = purgeManualExecutorAppealArtifacts(normalized);
        normalized = purgedManual.rows;
        if (purgedManual.mutated) {
            try {
                persistDecisionsToStorage(normalized);
            } catch {
                /* ignore */
            }
        }
        if (executionDataForSync) {
            let backfillMutated = false;
            normalized = normalized.map((row) => {
                if (String(row.seizureRequestSavedAt || '').trim()) return row;
                if (!isSeizureDecisionFollowupComplete(row, executionDataForSync)) return row;
                backfillMutated = true;
                const ts = String(row.resolvedAt || row.date || new Date().toISOString()).trim();
                return { ...row, seizureRequestSavedAt: ts || new Date().toISOString() };
            });
            if (backfillMutated) {
                try {
                    persistDecisionsToStorage(normalized);
                } catch {
                    /* ignore */
                }
            }
        }
        setDecisions(normalized);
    }, [executionDataForSync, executionId, persistDecisionsToStorage]);

    useEffect(() => {
        reloadFromStorage();
    }, [executionDataForSync, reloadFromStorage]);

    useEffect(() => {
        const storedCount = readExecutorDecisionsArray(executionId).length;
        const currentCount = decisions.length;
        if (currentCount === 0 || storedCount > currentCount) {
            reloadFromStorage();
        }
    }, [decisions.length, executionId, reloadFromStorage]);

    useEffect(() => {
        const onExternalReload = () => {
            reloadFromStorage();
        };
        const onDecisionOutcome = () => {
            onExternalReload();
        };
        window.addEventListener('hami-decisions-reload', onExternalReload);
        window.addEventListener('hami-execution-decision-outcome', onDecisionOutcome);
        window.addEventListener('hami-seizure-decision-step-saved', onExternalReload);
        window.addEventListener('hami-guarantor-followup-committed', onExternalReload);
        return () => {
            window.removeEventListener('hami-decisions-reload', onExternalReload);
            window.removeEventListener('hami-execution-decision-outcome', onDecisionOutcome);
            window.removeEventListener('hami-seizure-decision-step-saved', onExternalReload);
            window.removeEventListener('hami-guarantor-followup-committed', onExternalReload);
        };
    }, [reloadFromStorage]);

    useEffect(() => {
        if (isHistoricalMode) setShowAddModal(false);
    }, [isHistoricalMode]);

    const { resolveDecision } = useDecisionDispatcher({
        executionId,
        executionData: dispatcherHub?.executionData ?? null,
        seizedAssets: dispatcherHub?.seizedAssets ?? [],
        seizureDraftsByDecisionId: dispatcherHub?.seizureDraftsByDecisionId,
        persistExecutionMerge: dispatcherHub?.persistExecutionMerge ?? (() => {}),
        pushTimeline: dispatcherHub?.pushTimeline ?? (() => {}),
        nextTimelineId: dispatcherHub?.nextTimelineId ?? (() => newEventId()),
        syncSeizedAssets: dispatcherHub?.syncSeizedAssets,
        syncSeizureDrafts: dispatcherHub?.syncSeizureDrafts,
        syncActiveCoerciveActions: dispatcherHub?.syncActiveCoerciveActions,
        evictionExecutorWorkflow,
        getTimelineSnapshot:
            dispatcherHub?.getTimelineSnapshot ?? getMilestoneTimelineSnapshot,
    });

    const [hubNoteById, setHubNoteById] = useState<Record<string, string>>({});
    const [tamyeezNumberDraftById, setTamyeezNumberDraftById] = useState<Record<string, string>>({});
    const [tamyeezEditOpenById, setTamyeezEditOpenById] = useState<Record<string, boolean>>({});

    const [showAddModal, setShowAddModal] = useState(false);
    /** تبويب القائمة: طلبات حالية | قرارات سابقة | سجل الطعون */
    const [decisionsHubTab, setDecisionsHubTab] = useState<'current' | 'previous' | 'appeals' | 'archive'>('current');
    const [previousFilter, setPreviousFilter] = useState<'all' | 'approved' | 'rejected'>('all');
    const [previousProponentFilter, setPreviousProponentFilter] =
        useState<AppealsHubProponentFilter>('all');
    const [appealsProponentFilter, setAppealsProponentFilter] =
        useState<AppealsHubProponentFilter>('all');
    const [decisionsScrollTargetId, setDecisionsScrollTargetId] = useState<string | null>(null);
    const [appealsScrollTargetId, setAppealsScrollTargetId] = useState<string | null>(null);
    const [appealDetailDecision, setAppealDetailDecision] = useState<Decision | null>(null);

    const goToAppealsWithScroll = React.useCallback((decisionId: string) => {
        setDecisionsHubTab('appeals');
        setAppealsScrollTargetId(decisionId);
    }, []);

    useEffect(() => {
        if (bootHubTab) setDecisionsHubTab(bootHubTab);
        if (decisionsScrollToIdOnBoot) setDecisionsScrollTargetId(decisionsScrollToIdOnBoot);
        if (appealsScrollToIdOnBoot) setAppealsScrollTargetId(appealsScrollToIdOnBoot);
    }, [bootHubTab, decisionsScrollToIdOnBoot, appealsScrollToIdOnBoot]);

    useLayoutEffect(() => {
        if ((decisionsHubTab !== 'current' && decisionsHubTab !== 'previous') || !decisionsScrollTargetId)
            return;
        return scrollToDomIdWhenReady(`hami-decision-card-${decisionsScrollTargetId}`, () =>
            setDecisionsScrollTargetId(null)
        );
    }, [decisionsHubTab, decisionsScrollTargetId, domainVisibleDecisions.length]);

    useLayoutEffect(() => {
        if (decisionsHubTab !== 'appeals' || !appealsScrollTargetId) return;
        return scrollToDomIdWhenReady(`hami-appeal-card-${appealsScrollTargetId}`, () =>
            setAppealsScrollTargetId(null)
        );
    }, [decisionsHubTab, appealsScrollTargetId, domainVisibleDecisions.length]);

    // Form state
    const [newTitle, setNewTitle] = useState('');
    const [newBody, setNewBody] = useState('');
    const [newDate, setNewDate] = useState('');
    const resetAddDecisionForm = React.useCallback(() => {
        setNewTitle('');
        setNewBody('');
        setNewDate('');
    }, []);

    const requestNeedsExecutorOutcome = React.useCallback(
        (d: Decision) => {
            if (d.executorOutcome === 'withdrawn' || d.lawyerWithdrawn === true) return false;
            return (
                Boolean(d.requestKind && EXECUTOR_QUEUE_REQUEST_KINDS.includes(d.requestKind)) &&
                (d.executorOutcome === undefined || d.executorOutcome === 'pending')
            );
        },
        []
    );

    /** لا يُعرض «الطعن بالقرار» قبل بتّ المنفذ لطلبات الطابور فقط؛ غير ذلك يبقى السلوك السابق */
    const canShowAppealInitialForDecision = React.useCallback(
        (d: Decision): boolean => {
            if (d.noAppealChosen === true) return false;
            if (d.personalCoerciveSubtype === 'release_debtor') return false;
            if (
                (d.personalCoerciveSubtype === 'executive_detention' ||
                    d.personalCoerciveSubtype === 'executive_dossier_presentation') &&
                d.executorDetentionHandedToJudge === true
            ) {
                return false;
            }
            if (d.manualExecutorLedgerEntry) return false;
            if (d.appealRequestOrigin === 'executor_side') return true;
            if (!d.requestKind || !EXECUTOR_QUEUE_REQUEST_KINDS.includes(d.requestKind)) return true;
            if (requestNeedsExecutorOutcome(d)) return false;
            const ex = d.executorOutcome;
            return ex === 'approved' || ex === 'rejected' || ex === 'alternative';
        },
        [requestNeedsExecutorOutcome]
    );

    // Calculate appeal deadlines and status (4 أيام تظلم، 8 أيام تمييز من تاريخ بتّ المنفذ)
    const getAppealStatus = React.useCallback(
        (decision: Decision) => {
            if (decision.appealStatus === 'final') {
                return {
                    tadhallumDeadline: new Date(),
                    tamyeezDeadline: new Date(),
                    daysToTadhallum: 0,
                    daysToTamyeez: 0,
                    canFileTadhallum: false,
                    canFileTamyeez: false,
                    isFinal: true,
                };
            }
            if (requestNeedsExecutorOutcome(decision)) {
                return {
                    tadhallumDeadline: new Date(),
                    tamyeezDeadline: new Date(),
                    daysToTadhallum: 999,
                    daysToTamyeez: 999,
                    canFileTadhallum: false,
                    canFileTamyeez: false,
                    isFinal: false,
                };
            }
            const clockYmd = decisionAppealClockYmd(decision);
            const w = appealWindowsFromClockYmd(clockYmd);
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(clockYmd || '').trim());
            const base = m
                ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
                : new Date(NaN);
            const tadhallumDeadline = Number.isNaN(base.getTime())
                ? new Date()
                : new Date(base.getFullYear(), base.getMonth(), base.getDate() + 4);
            const tamyeezDeadline = Number.isNaN(base.getTime())
                ? new Date()
                : new Date(base.getFullYear(), base.getMonth(), base.getDate() + 8);
            const daysToTadhallum = w.canTadhallum ? Math.max(0, 4 - w.daysElapsed) : 0;
            const daysToTamyeez = w.canTamyeez ? Math.max(0, 8 - w.daysElapsed) : 0;

            return {
                tadhallumDeadline,
                tamyeezDeadline,
                daysToTadhallum,
                daysToTamyeez,
                canFileTadhallum: w.canTadhallum,
                canFileTamyeez: w.canTamyeez,
                isFinal: w.isPastTamyeezDeadline && decision.appealStatus === 'pending',
            };
        },
        [requestNeedsExecutorOutcome]
    );

    const patchDecisionRow = React.useCallback(
        (decisionId: string, patch: Partial<Decision>) => {
            setDecisions((prev) => {
                const next = prev.map((d) => (d.id === decisionId ? { ...d, ...patch } : d));
                persistDecisionsToStorage(next);
                queueMicrotask(() => dispatchDecisionsReload());
                return next;
            });
        },
        [persistDecisionsToStorage]
    );


    const applyCassationCourtDecision = React.useCallback(
        (decision: Decision, choice: 'rad_laheeza' | 'naqd') => {
            const petitionGranted = petitionGrantedAfterCassation(decision, choice);
            const labelAr: NonNullable<Decision['appealResult']> =
                choice === 'rad_laheeza' ? 'تصديق القرار' : 'نقض القرار';
            const origPetitionGranted =
                decision.appealBaseBranch === 'after_approval' ||
                (decision.appealBaseBranch == null &&
                    (decision.executorOutcome === 'approved' ||
                        decision.executorOutcome === 'alternative'));
            const appealWorkflowState =
                !petitionGranted && origPetitionGranted
                    ? ('REVOKED_BY_APPEAL' as const)
                    : petitionGranted
                      ? ('FINAL_ACCEPTED' as const)
                      : ('FINAL_REJECTED' as const);
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            const hub = hubWithInferredAppealOrigin(decision);
            const creditorPartyRequest = isCreditorInitiatedExecutorRequest(hub);
            const outcomeLine = (() => {
                if (appealPerspective === 'debtor_agent') {
                    if (creditorPartyRequest) {
                        return petitionGranted
                            ? 'النتيجة: طلب الدائن غير مقبول نهائياً — لصالح موكّلك.'
                            : 'النتيجة: طلب الدائن مُثبَّت نهائياً — ضد موكّلك.';
                    }
                    return petitionGranted
                        ? 'النتيجة: طلب موكّلك مقبول نهائياً وقُفل القرار.'
                        : 'النتيجة: طلب موكّلك مرفوض نهائياً وقُفل القرار.';
                }
                if (!creditorPartyRequest) {
                    return petitionGranted
                        ? 'النتيجة: طلب المدين مقبول نهائياً وقُفل القرار.'
                        : 'النتيجة: طلب المدين مرفوض نهائياً وقُفل القرار.';
                }
                return petitionGranted
                    ? 'النتيجة: طلب الدائن/تنفيذ مقبول نهائياً وقُفل القرار.'
                    : 'النتيجة: طلب الدائن/تنفيذ مرفوض نهائياً وقُفل القرار.';
            })();
            const cassationFiler = resolveCassationFilerActor(decision);
            const resolvedAppealPatch: Partial<Decision> = {
                appealPhase: null,
                appealStatus: 'final',
                appealResult: labelAr,
                appealMethod: 'tamyeez',
                appealActor: cassationFiler ?? decision.appealActor ?? null,
                status: petitionGranted ? 'accepted' : 'rejected',
                executorOutcome: petitionGranted ? 'approved' : 'rejected',
                appealWorkflowState,
                awaitingCassationEntryBy: null,
                grievanceRejectedAwaitingTamyeez: false,
                grievanceAcceptedAwaitingDebtorTamyeez: false,
                noAppealChosen: false,
            };

            /** عند نقض القرار: نقلب حالة الطلب الأصلي — إلا عند استئناف نفاذ طلب الدائن بعد تمييز المحامي */
            const isNaqd = choice === 'naqd';
            const srcId = decision.appealSourceDecisionId;
            const parentDecision =
                typeof srcId === 'string' && srcId.trim()
                    ? decisions.find((d) => d.id === srcId)
                    : decision;
            const hubParent = hubWithInferredAppealOrigin(parentDecision ?? decision);
            const targetExecutorOutcome = parentDecision?.executorOutcome ?? decision.executorOutcome;
            const previewPipe: Decision = { ...decision, ...resolvedAppealPatch };
            const lawyerNaqdResume =
                isNaqd && petitionGranted && isLawyerCassationNaqdResume(previewPipe, hubParent);
            const forceFlipParentRequestPatch: Partial<Decision> | null = isNaqd
                ? lawyerNaqdResume
                    ? null
                    : (() => {
                          if (
                              targetExecutorOutcome === 'approved' ||
                              targetExecutorOutcome === 'alternative'
                          ) {
                              return {
                                  executorOutcome: 'rejected' as const,
                                  status: 'rejected' as const,
                              };
                          }
                          if (targetExecutorOutcome === 'rejected') {
                              return {
                                  executorOutcome: 'approved' as const,
                                  status: 'accepted' as const,
                              };
                          }
                          return null;
                      })()
                : null;

            let next: Decision[];
            if (typeof srcId === 'string' && srcId.trim()) {
                const orig = decisions.find((d) => d.id === srcId);
                const mergedOriginal: Decision = {
                    ...(orig ?? decision),
                    ...resolvedAppealPatch,
                    ...(forceFlipParentRequestPatch ?? {}),
                    id: srcId,
                    activeAppealCopyId: null,
                    appealTimelineLogs: [
                        ...(Array.isArray(orig?.appealTimelineLogs) ? orig.appealTimelineLogs : []),
                        ...(Array.isArray(decision.appealTimelineLogs) ? decision.appealTimelineLogs : []),
                    ],
                };
                next = decisions
                    .filter((d) => d.id !== decision.id)
                    .map((d) => (d.id === srcId ? mergedOriginal : d));
            } else {
                next = decisions.map((d): Decision => {
                    if (d.id !== decision.id) return d;
                    return {
                        ...d,
                        ...resolvedAppealPatch,
                        ...(forceFlipParentRequestPatch ?? {}),
                    };
                });
            }

            setDecisions(next);
            persistDecisionsToStorage(next);
            queueMicrotask(() => dispatchDecisionsReload());
            const mergedRowId =
                typeof srcId === 'string' && srcId.trim() ? srcId : decision.id;
            const mergedRow = next.find((x) => x.id === mergedRowId);
            if (mergedRow) {
                dispatchHeirSubstitutionOutcomeIfAny(executionId, mergedRow);
                applyPersonalCoerciveAppealClosure({
                    executionId,
                    row: mergedRow as unknown as Record<string, unknown>,
                    allDecisions: next as unknown as Record<string, unknown>[],
                });
                applyEvictionAppealClosure({
                    executionId,
                    row: mergedRow as unknown as Record<string, unknown>,
                    allDecisions: next as unknown as Record<string, unknown>[],
                });
            }
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: `قرار محكمة التمييز: ${labelAr}`,
                description: [`القرار: ${decision.title}`, outcomeLine, `التوقيت: ${when}`].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
        },
        [appealPerspective, decisions, executionId, onTimelineUpdate, persistDecisionsToStorage]
    );

    const applyGrievanceCourtOutcome = React.useCallback(
        (decision: Decision, grievanceAccepted: boolean) => {
            const resolvedAppealPatch = buildGrievanceResolutionPatch(
                decision,
                grievanceAccepted,
                decisions
            );
            const granted = grievancePetitionGranted(decision, grievanceAccepted);
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            const title = grievanceAccepted ? 'قبول التظلم' : 'رد التظلم';
            const hubGrievance = hubWithInferredAppealOrigin(decision);
            const creditorPartyGrievance = isCreditorInitiatedExecutorRequest(hubGrievance);
            const outcomeLine = (() => {
                if (appealPerspective === 'debtor_agent') {
                    if (grievanceAccepted && granted) {
                        return resolvedAppealPatch.awaitingCassationEntryBy
                            ? creditorPartyGrievance
                                ? 'النتيجة: قُبل تظلم موكّلنا — الطلب مغلق مؤقتاً بانتظار تمييز الدائن.'
                                : 'النتيجة: قُبل تظلم موكّلنا — يتاح للدائن التمييز قبل البت النهائي.'
                            : 'النتيجة: قُبل تظلم موكّلنا — القرار أصبح نافذاً وفق مسار الطعن.';
                    }
                    if (!grievanceAccepted) {
                        return resolvedAppealPatch.appealStatus === 'final'
                            ? creditorPartyGrievance
                                ? 'النتيجة: رُد تظلم موكّلنا — الطلب لصالح الدائن.'
                                : 'النتيجة: رُد التظلم — بقي القرار الأصلي نافذاً.'
                            : creditorPartyGrievance
                              ? 'النتيجة: رُد تظلم موكّلنا — يمكن للدائن التمييز ضمن المهلة.'
                              : 'النتيجة: رُد التظلم — يبقى القرار مرفوضاً ويمكن التمييز ضمن المهلة.';
                    }
                }
                if (granted) {
                    return resolvedAppealPatch.awaitingCassationEntryBy
                        ? 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز قبل نفاذ القرار نهائياً.'
                        : 'النتيجة: قُبل التظلم — القرار أصبح نافذاً وفق مسار الطعن.';
                }
                return resolvedAppealPatch.appealStatus === 'final'
                    ? 'النتيجة: رُد التظلم — بقي القرار الأصلي نافذاً.'
                    : 'النتيجة: رُد التظلم — يبقى القرار مرفوضاً ويمكن التمييز ضمن المهلة.';
            })();
            const srcId = decision.appealSourceDecisionId;
            const logEntry = {
                id: newEventId(),
                at: now,
                message: outcomeLine,
                tone: (granted ? 'emerald' : 'rose') as 'emerald' | 'rose',
            };

            let next: Decision[];
            if (typeof srcId === 'string' && srcId.trim()) {
                const orig = decisions.find((d) => d.id === srcId);
                const mergedOriginal: Decision = {
                    ...(orig ?? decision),
                    ...resolvedAppealPatch,
                    id: srcId,
                    activeAppealCopyId:
                        resolvedAppealPatch.appealStatus === 'final' ? null : orig?.activeAppealCopyId ?? null,
                    appealTimelineLogs: [
                        ...(Array.isArray(orig?.appealTimelineLogs) ? orig.appealTimelineLogs : []),
                        ...(Array.isArray(decision.appealTimelineLogs) ? decision.appealTimelineLogs : []),
                        logEntry,
                    ],
                };
                if (resolvedAppealPatch.appealStatus === 'final') {
                    next = decisions
                        .filter((d) => d.id !== decision.id)
                        .map((d) => (d.id === srcId ? mergedOriginal : d));
                } else {
                    const mergedCopy: Decision = {
                        ...decision,
                        ...resolvedAppealPatch,
                        appealTimelineLogs: [
                            ...(Array.isArray(decision.appealTimelineLogs) ? decision.appealTimelineLogs : []),
                            logEntry,
                        ],
                    };
                    next = decisions.map((d) => {
                        if (d.id === srcId) {
                            return {
                                ...mergedOriginal,
                                activeAppealCopyId: decision.id,
                            };
                        }
                        if (d.id === decision.id) return mergedCopy;
                        return d;
                    });
                }
            } else {
                next = decisions.map((d): Decision => {
                    if (d.id !== decision.id) return d;
                    return {
                        ...d,
                        ...resolvedAppealPatch,
                        appealTimelineLogs: [
                            ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                            logEntry,
                        ],
                    };
                });
            }

            setDecisions(next);
            persistDecisionsToStorage(next);
            queueMicrotask(() => dispatchDecisionsReload());
            const mergedRowId =
                typeof srcId === 'string' && srcId.trim() ? srcId : decision.id;
            const mergedRow = next.find((x) => x.id === mergedRowId);
            if (mergedRow) {
                dispatchHeirSubstitutionOutcomeIfAny(executionId, mergedRow);
                if (resolvedAppealPatch.appealStatus === 'final') {
                    applyPersonalCoerciveAppealClosure({
                        executionId,
                        row: mergedRow as unknown as Record<string, unknown>,
                        allDecisions: next as unknown as Record<string, unknown>[],
                    });
                    applyEvictionAppealClosure({
                        executionId,
                        row: mergedRow as unknown as Record<string, unknown>,
                        allDecisions: next as unknown as Record<string, unknown>[],
                    });
                }
            }
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title,
                description: [`القرار: ${decision.title}`, outcomeLine, `التوقيت: ${when}`].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
            if (resolvedAppealPatch.appealStatus === 'final') {
                queueMicrotask(() => setDecisionsHubTab('previous'));
            } else if (!granted) {
                queueMicrotask(() => {
                    setDecisionsHubTab('appeals');
                    setAppealsScrollTargetId(
                        typeof srcId === 'string' && srcId.trim() ? decision.id : mergedRowId
                    );
                });
            }
        },
        [appealPerspective, decisions, executionId, onTimelineUpdate, persistDecisionsToStorage]
    );

    const applyWaiveCassationAfterDebtorGrievance = React.useCallback(
        (decision: Decision) => {
            if (!canWaiveLawyerAwaitingCassation(decision, decisions)) return;
            const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
                executionId,
                decisionId: decision.id,
            });
            if (!result.ok) return;
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            reloadFromStorage();
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'لا حاجة للتمييز',
                description: [
                    `القرار: ${decision.title}`,
                    result.message ?? 'قُبل التظلم دون تمييز — انتهت دورة الطلب.',
                    `التوقيت: ${when}`,
                ].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
            queueMicrotask(() => setDecisionsHubTab('archive'));
        },
        [decisions, executionId, onTimelineUpdate, reloadFromStorage]
    );

    const applyWaiveInitialAppeal = React.useCallback(
        (decision: Decision) => {
            if (!canWaiveInitialAppeal(decision, decisions, appealPerspective)) return;
            const result = applyWaiveInitialAppealForExecution({
                executionId,
                decisionId: decision.id,
                appealPerspective,
            });
            if (!result.ok) return;
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            reloadFromStorage();
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'لا حاجة للطعن',
                description: [
                    `القرار: ${decision.title}`,
                    result.message ?? 'قُبل قرار المنفذ دون طعن — أُغلقت دورة الطلب.',
                    `التوقيت: ${when}`,
                ].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
            queueMicrotask(() => setDecisionsHubTab('archive'));
        },
        [appealPerspective, decisions, executionId, onTimelineUpdate, reloadFromStorage]
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ executionId?: string; decisionId?: string }>).detail;
            if (executionId && detail?.executionId && detail.executionId !== executionId) return;
            const decisionId = String(detail?.decisionId || '').trim();
            if (!decisionId) return;
            const row = decisions.find((d) => d.id === decisionId);
            if (!row) return;
            applyWaiveCassationAfterDebtorGrievance(row);
        };
        window.addEventListener('hami-waive-cassation-for-decision', handler as EventListener);
        return () => window.removeEventListener('hami-waive-cassation-for-decision', handler as EventListener);
    }, [applyWaiveCassationAfterDebtorGrievance, decisions, executionId]);

    const logAppealTimeline = React.useCallback(
        (title: string, description?: string) => {
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title,
                description: [description, `التوقيت: ${when}`].filter(Boolean).join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
        },
        [onTimelineUpdate]
    );

    const handleExecutorResolveById = React.useCallback(
        (id: string, resolution: 'approved' | 'rejected') => {
            const row = decisions.find((d) => d.id === id);
            if (!row) return;
            resolveDecision({
                row,
                resolution,
                executorNote: hubNoteById[id],
            });
            queueMicrotask(() => reloadFromStorage());
            setHubNoteById((p) => {
                const n = { ...p };
                delete n[id];
                return n;
            });
            if (resolution === 'approved') {
                queueMicrotask(() => setDecisionsHubTab('previous'));
            }
            if (resolution === 'approved' && row.requestKind === 'seizure') {
                const dossierId =
                    normalizeBaseDossierIdFromDecisionsKey(executionId) || String(executionId || '').trim();
                const dispatchToast = (msg: string, type: 'success' | 'warning' | 'info' = 'success') => {
                    try {
                        window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message: msg, type } }));
                    } catch {}
                };
                const subtype = String((row as any).seizureSubtype || '').trim();
                const resolvedSubtype = subtype
                    ? subtype
                    : /عقار/i.test(`${String(row.title || '')}\n${String(row.body || '')}`)
                      ? 'property'
                      : '';
                if (resolvedSubtype === 'property') {
                    const decisionId = String(row.id || '').trim();
                    if (!decisionId) return;
                    if (String((row as any).seizureRequestSavedAt || '').trim()) return;
                    try {
                        window.dispatchEvent(
                            new CustomEvent('hami-open-seized-property-init', {
                                detail: {
                                    executionId: dossierId,
                                    decisionId,
                                    subject: String(row.title || '').trim() || 'طلب حجز عقار',
                                },
                            })
                        );
                    } catch {}
                    dispatchToast('موافقة المنفذ على وضع إشارة الحجز — أكمل بيانات العقار.', 'success');
                }
                if (
                    resolvedSubtype === 'property_expert' ||
                    resolvedSubtype === 'property_auction' ||
                    resolvedSubtype === 'property_final_award' ||
                    resolvedSubtype === 'property_reauction_default'
                ) {
                    const rawJson = String((row as any).seizurePayloadJson || '').trim();
                    let seizedPropertyId = '';
                    let step: 'experts' | 'auction' | 'award' | 'reauction_default' | '' = '';
                    if (rawJson) {
                        try {
                            const v = JSON.parse(rawJson) as any;
                            seizedPropertyId = String(v?.seizedPropertyId ?? '').trim();
                        } catch {}
                    }
                    const rowId = String(row.id || '').trim();
                    if (!rowId) return;
                    if (String((row as any).seizureRequestSavedAt || '').trim()) return;
                    if (!seizedPropertyId) {
                        dispatchToast('طلب عقاري بدون ربط seizedPropertyId داخل القرار.', 'warning');
                        return;
                    }
                    step =
                        resolvedSubtype === 'property_expert'
                            ? 'experts'
                            : resolvedSubtype === 'property_auction'
                              ? 'auction'
                              : resolvedSubtype === 'property_final_award'
                                ? 'award'
                                : 'reauction_default';
                    try {
                        window.dispatchEvent(
                            new CustomEvent('hami-open-seized-property-step', {
                                detail: {
                                    executionId: dossierId,
                                    decisionId: rowId,
                                    seizedPropertyId,
                                    step,
                                },
                            })
                        );
                    } catch {}
                    dispatchToast('موافقة المنفذ على خطوة عقارية — أكمل بيانات النتيجة.', 'success');
                }
            }

            /** التوجيه الذكي: طلبات تبويب «التحكم في الإضبارة» */
            if (row.requestKind === 'special_followup') {
                applyDossierSpecialFollowupOutcome({
                    executionId,
                    row: row as Record<string, unknown>,
                    resolution,
                });
            }
        },
        [decisions, executionId, hubNoteById, resolveDecision, reloadFromStorage]
    );

    const handleDeleteDecision = React.useCallback((id: string) => {
        setDecisions((prev) => {
            const next = prev.filter((d) => d.id !== id);
            persistDecisionsToStorage(next);
            queueMicrotask(() => dispatchDecisionsReload());
            return next;
        });
    }, [persistDecisionsToStorage]);

    const handleArchiveDecision = React.useCallback((id: string) => {
        setDecisions((prev) => {
            const now = new Date().toISOString();
            const next = prev.map((d) =>
                d.id === id
                    ? {
                          ...d,
                          isArchived: true,
                          requestCycleSuperseded: true,
                          requestCycleSupersededAt: now,
                      }
                    : d
            );
            persistDecisionsToStorage(next);
            queueMicrotask(() => dispatchDecisionsReload());
            const archived = next.find((d) => d.id === id);
            if (archived) {
                applyPersonalCoerciveAppealClosure({
                    executionId,
                    row: archived as unknown as Record<string, unknown>,
                    allDecisions: next as unknown as Record<string, unknown>[],
                    forceClose: true,
                });
                applyEvictionAppealClosure({
                    executionId,
                    row: archived as unknown as Record<string, unknown>,
                    allDecisions: next as unknown as Record<string, unknown>[],
                    forceClose: true,
                });
            }
            return next;
        });
    }, [executionId, persistDecisionsToStorage]);

    const handleAddDecision = () => {
        if (!newTitle.trim() || !newDate) {
            SmartToast.error('يرجى تعبئة العنوان والتاريخ على الأقل');
            return;
        }
        const newDecision: Decision = {
            id: (globalThis as any).crypto?.randomUUID?.() ? (globalThis as any).crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            title: newTitle,
            body: newBody,
            date: newDate,
            appealRequestOrigin: 'executor_side',
            appealStatus: 'pending',
            status: 'accepted',
            appealPhase: null,
            manualExecutorLedgerEntry: true,
            manualExecutorEnforced: false,
        };
        
        const updated = [newDecision, ...decisions];
        setDecisions(updated);
        persistDecisionsToStorage(updated);
        dispatchDecisionsReload();
        
        const now = new Date().toISOString();
        const milestoneSnap = getMilestoneTimelineSnapshot?.();
        onTimelineUpdate({
            id: newEventId(),
            date: newDate,
            timestamp: now,
            title: `إضافة قرار منفذ العدل: ${newTitle}`,
            description: `تاريخ القرار: ${new Date(newDate).toLocaleDateString('ar-EG')}${newBody.trim() ? `\n${newBody.trim()}` : ''}`,
            type: 'decision',
            source: 'القرارات والطعون',
            ...(milestoneSnap !== undefined ? { snapshot: milestoneSnap } : {}),
        });
        
        resetAddDecisionForm();
        setShowAddModal(false);
        setDecisionsHubTab('previous');
    };
    
    /** قرارات أصلية فقط (ليس نسخ طعن) — طابور المنفذ ثم الباقي زمنياً */
    const archiveHubDecisions = useMemo(() => {
        const originals = domainVisibleDecisions.filter(
            (d) =>
                !d.appealSourceDecisionId &&
                !d.isArchived &&
                !hubHasActiveAppealLedgerEntry(d)
        );
        const pending = originals.filter((d) => requestNeedsExecutorOutcome(d));
        const rest = originals.filter((d) => !requestNeedsExecutorOutcome(d));
        
        const sortedPending = sortDecisionsNewestFirst(pending);
        const sortedRest = sortDecisionsNewestFirst(rest);

        return [...sortedPending, ...sortedRest];
    }, [domainVisibleDecisions, requestNeedsExecutorOutcome]);

    const archivePendingDecisions = useMemo(
        () => archiveHubDecisions.filter((d) => requestNeedsExecutorOutcome(d)),
        [archiveHubDecisions]
    );
    const archiveSettledDecisions = useMemo(
        () => archiveHubDecisions.filter((d) => !requestNeedsExecutorOutcome(d)),
        [archiveHubDecisions]
    );

    /** القرارات المؤرشفة */
    const archivedDecisions = useMemo(
        () =>
            sortDecisionsNewestFirst(
                domainVisibleDecisions.filter((d) => !d.appealSourceDecisionId && d.isArchived)
            ),
        [domainVisibleDecisions]
    );

    /** سجل الطعون: نسخ مسار الطعن + (للبيانات القديمة) صف واحد يضم مساراً مفتوحاً */
    const appealsHubDecisions = useMemo(
        () =>
            sortDecisionsAppealActivityNewestFirst(
                domainVisibleDecisions.filter((d) => {
                    if (d.manualExecutorLedgerEntry === true) return false;
                    if (d.appealSourceDecisionId) {
                        const src = domainVisibleDecisions.find(
                            (x) => String(x.id) === String(d.appealSourceDecisionId)
                        );
                        if (src?.manualExecutorLedgerEntry === true) return false;
                        return true;
                    }
                    return decisionAppealPipelineActive(d, null);
                })
            ),
        [domainVisibleDecisions]
    );

    const previousHubFilterOptions = useMemo(
        () =>
            resolveAppealsHubFilterOptions(
                archiveSettledDecisions,
                domainVisibleDecisions,
                appealPerspective
            ),
        [appealPerspective, archiveSettledDecisions, domainVisibleDecisions]
    );

    const appealsHubFilterOptions = useMemo(
        () =>
            resolveAppealsHubFilterOptions(
                appealsHubDecisions,
                domainVisibleDecisions,
                appealPerspective
            ),
        [appealPerspective, appealsHubDecisions, domainVisibleDecisions]
    );

    const filteredPreviousSettledDecisions = useMemo(() => {
        return archiveSettledDecisions.filter((d) => {
            if (previousFilter === 'approved') {
                if (
                    d.executorOutcome !== 'approved' &&
                    d.executorOutcome !== 'alternative'
                ) {
                    return false;
                }
            } else if (previousFilter === 'rejected') {
                if (d.executorOutcome !== 'rejected') return false;
            }
            if (previousProponentFilter !== 'all') {
                if (
                    resolveAppealHubProponentCategory(
                        d,
                        domainVisibleDecisions,
                        appealPerspective
                    ) !== previousProponentFilter
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [
        appealPerspective,
        archiveSettledDecisions,
        domainVisibleDecisions,
        previousFilter,
        previousProponentFilter,
    ]);

    const filteredAppealsHubDecisions = useMemo(() => {
        if (appealsProponentFilter === 'all') return appealsHubDecisions;
        return appealsHubDecisions.filter(
            (d) =>
                resolveAppealHubProponentCategory(
                    d,
                    domainVisibleDecisions,
                    appealPerspective
                ) === appealsProponentFilter
        );
    }, [
        appealPerspective,
        appealsHubDecisions,
        appealsProponentFilter,
        domainVisibleDecisions,
    ]);

    useEffect(() => {
        if (
            previousProponentFilter !== 'all' &&
            previousHubFilterOptions.length > 0 &&
            !previousHubFilterOptions.includes(previousProponentFilter)
        ) {
            setPreviousProponentFilter('all');
        }
    }, [previousHubFilterOptions, previousProponentFilter]);

    useEffect(() => {
        if (
            appealsProponentFilter !== 'all' &&
            appealsHubFilterOptions.length > 0 &&
            !appealsHubFilterOptions.includes(appealsProponentFilter)
        ) {
            setAppealsProponentFilter('all');
        }
    }, [appealsHubFilterOptions, appealsProponentFilter]);

    const transitionAppealWorkflow = React.useCallback(
        (
            decision: Decision,
            patch: Partial<Decision>,
            timelineTitle: string,
            timelineDescription: string,
            tone: 'emerald' | 'rose' | 'amber' | 'slate'
        ) => {
            const nowIso = new Date().toISOString();
            const logEntry = {
                id: newEventId(),
                at: nowIso,
                message: timelineDescription,
                tone,
            };
            const target = decisions.find((d) => d.id === decision.id);
            if (!target) return;
            const appealHub = resolveUnderlyingDecisionHub(target, decisions);
            if (
                target.manualExecutorLedgerEntry === true ||
                appealHub.manualExecutorLedgerEntry === true
            ) {
                return;
            }
            const hasMeaningfulChange = Object.entries(patch).some(([k, v]) => {
                const prevVal = (target as any)[k];
                if (Array.isArray(prevVal) || Array.isArray(v)) {
                    return JSON.stringify(prevVal) !== JSON.stringify(v);
                }
                return prevVal !== v;
            });
            if (!hasMeaningfulChange) return;

            const opensAppealCopy =
                !target.appealSourceDecisionId &&
                (patch.appealStatus === 'tadhallum_filed' || patch.appealStatus === 'tamyeez_filed');

            if (opensAppealCopy) {
                /** إن وُجدت بالفعل نسخة طعن للأصل (مثلاً بعد تظلم) لا نُنشئ نسخة ثانية — ندمج التمييز فيها */
                const linkedId = target.activeAppealCopyId;
                if (linkedId) {
                    const linked = decisions.find((d) => d.id === linkedId);
                    if (
                        linked &&
                        !isExecutionAppealTerminal(linked) &&
                        String(linked.appealSourceDecisionId ?? '') === String(target.id)
                    ) {
                        const nextLinked = decisions.map((d) =>
                            d.id === linked.id
                                ? {
                                      ...d,
                                      ...patch,
                                      appealTimelineLogs: [
                                          logEntry,
                                          ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                                      ],
                                  }
                                : d
                        );
                        setDecisions(nextLinked);
                        persistDecisionsToStorage(nextLinked);
                        queueMicrotask(() => dispatchDecisionsReload());
                        const appealOpenSnap = getMilestoneTimelineSnapshot?.();
                        onTimelineUpdate({
                            id: newEventId(),
                            date: nowIso.slice(0, 10),
                            timestamp: nowIso,
                            title: timelineTitle,
                            description: timelineDescription,
                            type: 'appeal',
                            source: 'القرارات والطعون',
                            ...(appealOpenSnap !== undefined ? { snapshot: appealOpenSnap } : {}),
                        });
                        goToAppealsWithScroll(linked.id);
                        return;
                    }
                }
                const copyId = `appeal_copy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                const baseLogs = Array.isArray(target.appealTimelineLogs) ? target.appealTimelineLogs : [];
                const {
                    appealSourceDecisionId: _dropSrc,
                    activeAppealCopyId: _dropAct,
                    ...restTarget
                } = target;
                const copy: Decision = {
                    ...restTarget,
                    id: copyId,
                    appealSourceDecisionId: target.id,
                    ...patch,
                    appealTimelineLogs: [logEntry, ...baseLogs],
                };
                const cleanedOriginal: Decision = {
                    ...target,
                    appealActor: null,
                    appealMethod: null,
                    appealPhase: null,
                    appealWorkflowState: 'NONE',
                    appealStatus: 'pending',
                    appealResult: undefined,
                    awaitingCassationEntryBy: null,
                    grievanceRejectedAwaitingTamyeez: false,
                    grievanceAcceptedAwaitingDebtorTamyeez: false,
                    manualGrievanceAppellants: undefined,
                    manualCassationAppellants: undefined,
                    activeAppealCopyId: copyId,
                    appealTimelineLogs: baseLogs,
                };
                const next = decisions.map((d) => (d.id === target.id ? cleanedOriginal : d)).concat([copy]);
                setDecisions(next);
                persistDecisionsToStorage(next);
                queueMicrotask(() => dispatchDecisionsReload());
                const appealOpenSnap = getMilestoneTimelineSnapshot?.();
                onTimelineUpdate({
                    id: newEventId(),
                    date: nowIso.slice(0, 10),
                    timestamp: nowIso,
                    title: timelineTitle,
                    description: timelineDescription,
                    type: 'appeal',
                    source: 'القرارات والطعون',
                    ...(appealOpenSnap !== undefined ? { snapshot: appealOpenSnap } : {}),
                });
                goToAppealsWithScroll(copyId);
                return;
            }

            let next = decisions.map((d) =>
                d.id === decision.id
                    ? {
                          ...d,
                          ...patch,
                          appealTimelineLogs: [
                              logEntry,
                              ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                          ],
                      }
                    : d
            );
            const merged = next.find((x) => x.id === decision.id);
            if (merged?.appealSourceDecisionId && isExecutionAppealTerminal(merged)) {
                const src = merged.appealSourceDecisionId;
                next = next.map((d) =>
                    d.id === src ? { ...d, activeAppealCopyId: null } : d
                );
            }
            setDecisions(next);
            persistDecisionsToStorage(next);
            queueMicrotask(() => dispatchDecisionsReload());
            onTimelineUpdate({
                id: newEventId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: timelineTitle,
                description: timelineDescription,
                type: 'appeal',
                source: 'القرارات والطعون',
            });
        },
        [decisions, goToAppealsWithScroll, getMilestoneTimelineSnapshot, onTimelineUpdate, persistDecisionsToStorage]
    );

    /** تسجيل طعن على قرار منفذ من البطاقة — مرحلة + طاعن (أو أكثر) */
    const commitExecutorSideAppealEntry = React.useCallback(
        (
            decision: Decision,
            stage: 'grievance' | 'cassation',
            appellants: ManualAppealAppellantActor[]
        ) => {
            if (appellants.length === 0) {
                SmartToast.error('اختر طرفاً واحداً على الأقل');
                return;
            }
            const appealHub = resolveUnderlyingDecisionHub(decision, decisions);
            if (
                decision.manualExecutorLedgerEntry === true ||
                appealHub.manualExecutorLedgerEntry === true
            ) {
                return;
            }
            const patch = buildExecutorSideAppealCommitPatch(stage, appellants);
            const timelineTitle = stage === 'grievance' ? 'تسجيل تظلم' : 'تسجيل تمييز';
            const timelineDescription = executorSideAppealTimelineMessage(
                stage,
                appellants,
                appealPerspective
            );
            transitionAppealWorkflow(decision, patch, timelineTitle, timelineDescription, 'amber');
        },
        [appealPerspective, decisions, transitionAppealWorkflow]
    );

    const applyLawyerCassationEntry = React.useCallback(
        (decision: Decision) => {
            const result = applyLawyerCassationEntryForExecution({
                executionId,
                decisionId: decision.id,
                appealPerspective,
                appendTimeline: false,
            });
            if (!result.ok) return;
            reloadFromStorage();
            const nowIso = new Date().toISOString();
            const appealOpenSnap = getMilestoneTimelineSnapshot?.();
            onTimelineUpdate({
                id: newEventId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: result.timelineTitle ?? 'تمييز القرار',
                description: result.timelineDescription ?? '',
                type: 'appeal',
                source: 'القرارات والطعون',
                ...(appealOpenSnap !== undefined ? { snapshot: appealOpenSnap } : {}),
            });
            queueMicrotask(() =>
                goToAppealsWithScroll(result.scrollDecisionId ?? decision.id)
            );
        },
        [
            appealPerspective,
            executionId,
            getMilestoneTimelineSnapshot,
            goToAppealsWithScroll,
            onTimelineUpdate,
            reloadFromStorage,
        ]
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ executionId?: string; decisionId?: string }>).detail;
            if (executionId && detail?.executionId && detail.executionId !== executionId) return;
            const decisionId = String(detail?.decisionId || '').trim();
            if (!decisionId) return;
            const row = decisions.find((d) => d.id === decisionId);
            if (!row) return;
            applyLawyerCassationEntry(row);
        };
        window.addEventListener('hami-start-cassation-for-decision', handler as EventListener);
        return () => window.removeEventListener('hami-start-cassation-for-decision', handler as EventListener);
    }, [applyLawyerCassationEntry, decisions, executionId]);

    const APPEAL_ORIGINAL_LOCKED_HINT =
        'مسار الطعن يُكمل حالياً على النسخة في «سجل الطعون». لا يُفتح مسار ثانٍ من القرار الأصل حتى يُغلق المسار على النسخة. استخدم زر «فتح مسار الطعن» أعلاه.';

    /** زر «الطعن بالقرار» — زجاجي بنفسجي */
    const DECISION_BTN_APPEAL_CHALLENGE =
        'w-full rounded-lg border border-purple-500/20 bg-purple-500/10 py-1.5 px-3 text-center text-sm font-semibold text-purple-300 backdrop-blur-sm transition-all duration-200 hover:bg-purple-500/20 focus:outline-none disabled:pointer-events-none disabled:opacity-40';
    /** زر ثانوي — زجاجي محايد */
    const DECISION_BTN_SECONDARY =
        'rounded-xl border border-white/10 bg-white/[0.04] py-2 px-3 text-center text-[11px] font-semibold text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-white/18 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/15 disabled:pointer-events-none disabled:opacity-40';
    const DECISION_BTN_SECONDARY_WFULL = `w-full ${DECISION_BTN_SECONDARY}`;
    const DECISION_BTN_SECONDARY_FLEX = `min-w-0 flex-1 ${DECISION_BTN_SECONDARY}`;
    /** زر أساسي — زجاجي ذهبي هادئ */
    const DECISION_BTN_PRIMARY =
        'rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/[0.08] py-2 px-3 text-center text-[11px] font-bold text-[#E6C673] backdrop-blur-md transition-all duration-200 hover:border-[#E6C673]/40 hover:bg-[#E6C673]/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/30 disabled:pointer-events-none disabled:opacity-40';
    const DECISION_BTN_PRIMARY_WFULL = `w-full ${DECISION_BTN_PRIMARY}`;
    const DECISION_BTN_PRIMARY_FLEX = `min-w-0 flex-1 ${DECISION_BTN_PRIMARY}`;

    /** أزرار الطعن المباشرة: تظلم + تمييز للطرف المتضرر — دون خطوة وسيطة */
    const renderAppealEntryButtons = (
        decision: Decision,
        windows: AppealDeadlineWindows,
        opts?: { pathLockedOnOriginal?: boolean; lockedBecauseActiveCopy?: boolean }
    ) => {
        const pathLocked = Boolean(opts?.pathLockedOnOriginal);
        const locked = Boolean(opts?.lockedBecauseActiveCopy);
        const debtorOnlyForCreditorAgent = creditorAgentDebtorIsSoleAppellant(
            decision,
            appealPerspective
        );

        const appealHub = resolveUnderlyingDecisionHub(decision, decisions);
        if (
            decision.manualExecutorLedgerEntry === true ||
            appealHub.manualExecutorLedgerEntry === true
        ) {
            return null;
        }

        if (decision.appealRequestOrigin === 'executor_side') {
            const grievanceOpen =
                (decision.appealStatus === 'tadhallum_filed' ||
                    decision.appealPhase === 'grievance') &&
                !String(decision.appealResult ?? '').trim();
            if (grievanceOpen) {
                return null;
            }
            const showWaiveExecutorAppeal = canWaiveInitialAppeal(
                decision,
                decisions,
                appealPerspective
            );
            return (
                <ExecutorSideAppealEntryPanel
                    windows={windows}
                    locked={locked}
                    debtorOnly={debtorOnlyForCreditorAgent}
                    cassationOnly={decision.cassationOnlyAppeal === true}
                    appealPerspective={appealPerspective}
                    challengeBtnClass={DECISION_BTN_APPEAL_CHALLENGE}
                    primaryBtnClass={DECISION_BTN_PRIMARY_WFULL}
                    secondaryBtnClass={DECISION_BTN_SECONDARY_WFULL}
                    ignoreDeadlineWindows
                    showWaive={showWaiveExecutorAppeal}
                    onWaive={() => applyWaiveInitialAppeal(decision)}
                    onCommit={(stage, appellants) =>
                        commitExecutorSideAppealEntry(decision, stage, appellants)
                    }
                />
            );
        }

        const actor = resolveHarmedPartyAppealActor(decision, appealPerspective);
        if (!actor) return null;

        const cassationOnly = decision.cassationOnlyAppeal === true;
        const showWaiveInitialAppeal = canWaiveInitialAppeal(
            decision,
            decisions,
            appealPerspective
        );
        const panel = (
            <div className={DECISION_APPEAL_TOOLBAR_ROW}>
                {!cassationOnly ? (
                    <button
                        type="button"
                        disabled={!windows.canTadhallum || pathLocked || locked}
                        onClick={() =>
                            transitionAppealWorkflow(
                                decision,
                                {
                                    noAppealChosen: false,
                                    appealActor: actor,
                                    appealMethod: 'tadhallum',
                                    appealWorkflowState:
                                        actor === 'debtor'
                                            ? 'PENDING_APPEAL_DEBTOR'
                                            : 'PENDING_APPEAL_LAWYER',
                                    appealStatus: 'tadhallum_filed',
                                    appealPhase: 'grievance',
                                },
                                'تسجيل تظلم',
                                appealInitialGrievanceTimeline(appealPerspective, actor),
                                'amber'
                            )
                        }
                        className={DECISION_APPEAL_TOOLBAR_BTN_PRIMARY}
                    >
                        {appealInitialGrievanceEntryButtonLabel(appealPerspective, actor)}
                    </button>
                ) : null}
                <button
                    type="button"
                    disabled={!windows.canTamyeez || pathLocked || locked}
                    onClick={() =>
                        transitionAppealWorkflow(
                            decision,
                            {
                                noAppealChosen: false,
                                appealActor: actor,
                                appealMethod: 'tamyeez',
                                appealWorkflowState:
                                    actor === 'debtor'
                                        ? 'PENDING_APPEAL_DEBTOR'
                                        : 'PENDING_APPEAL_LAWYER',
                                appealStatus: 'tamyeez_filed',
                                appealPhase: 'cassation',
                            },
                            'تسجيل تمييز',
                            appealInitialCassationTimeline(appealPerspective, actor),
                            'amber'
                        )
                    }
                    className={DECISION_APPEAL_TOOLBAR_BTN_PRIMARY}
                >
                    {appealInitialCassationEntryButtonLabel(
                        appealPerspective,
                        actor,
                        cassationOnly
                    )}
                </button>
                {showWaiveInitialAppeal ? (
                    <button
                        type="button"
                        disabled={pathLocked || locked}
                        onClick={() => applyWaiveInitialAppeal(decision)}
                        className={DECISION_APPEAL_TOOLBAR_BTN_SECONDARY}
                    >
                        لا حاجة للطعن
                    </button>
                ) : null}
            </div>
        );
        return pathLocked ? (
            <DecisionHintTooltip label={APPEAL_ORIGINAL_LOCKED_HINT}>{panel}</DecisionHintTooltip>
        ) : (
            panel
        );
    };

    const renderCassationRadNaqdButtons = (
        decision: Decision,
        cassTips: { rad: string; naqd: string }
    ) => (
        <div className="flex flex-row-reverse flex-wrap gap-2 pt-1">
            <DecisionHintTooltip label={cassTips.rad}>
                <button
                    type="button"
                    onClick={() => applyCassationCourtDecision(decision, 'rad_laheeza')}
                    className={DECISION_BTN_SECONDARY_FLEX}
                >
                    تصديق القرار
                </button>
            </DecisionHintTooltip>
            <DecisionHintTooltip label={cassTips.naqd}>
                <button
                    type="button"
                    onClick={() => applyCassationCourtDecision(decision, 'naqd')}
                    className={DECISION_BTN_PRIMARY_FLEX}
                >
                    نقض القرار
                </button>
            </DecisionHintTooltip>
        </div>
    );

    const renderAppealGrievanceDecideButtons = (decision: Decision, variant: DecisionsAppealsAppealSlot) => {
        const rowClass =
            variant === 'appealsTab'
                ? 'flex flex-row-reverse flex-wrap gap-2'
                : 'mb-3 flex flex-row-reverse flex-wrap gap-2';
        return (
            <div className={rowClass}>
                <button
                    type="button"
                    onClick={() => applyGrievanceCourtOutcome(decision, true)}
                    className={DECISION_BTN_GRIEVANCE_ACCEPT}
                >
                    قبول التظلم
                </button>
                <button
                    type="button"
                    onClick={() => applyGrievanceCourtOutcome(decision, false)}
                    className={DECISION_BTN_GRIEVANCE_REJECT}
                >
                    رد التظلم
                </button>
            </div>
        );
    };

    const renderAppealAwaitingCassationButtons = (
        decision: Decision,
        variant: DecisionsAppealsAppealSlot,
        appealWindowClosed: boolean,
        manageAppealGate: boolean
    ) => {
        if (!manageAppealGate) return null;
        const lawyerBtnClass =
            variant === 'appealsTab'
                ? DECISION_BTN_PRIMARY_WFULL
                : `mb-3 ${DECISION_BTN_PRIMARY_WFULL}`;
        const awaitingParty = resolveEffectiveAwaitingCassationParty(decision, undefined, decisions);
        if (!awaitingParty) return null;
        const appealHub = resolveUnderlyingDecisionHub(decision, decisions);
        const isManualLedger =
            decision.manualExecutorLedgerEntry === true ||
            appealHub.manualExecutorLedgerEntry === true;
        const ignoreAppealDeadline =
            isManualLedger || appealHub.appealRequestOrigin === 'executor_side';
        const cassationWindowOpen = !appealWindowClosed || ignoreAppealDeadline;
        const manualCassationExtra = isManualLedger
            ? { manualCassationAppellants: ['debtor'] as const }
            : {};
        const manualCassationLawyerExtra = isManualLedger
            ? { manualCassationAppellants: ['lawyer'] as const }
            : {};
        return (
            <>
                {awaitingParty === 'debtor' &&
                    cassationWindowOpen && (() => {
                        const labels = appealCassationEntryLabels(appealPerspective, 'debtor');
                        return (
                        <button
                            type="button"
                            onClick={() =>
                                transitionAppealWorkflow(
                                    decision,
                                    {
                                        noAppealChosen: false,
                                        appealActor: 'debtor',
                                        appealMethod: 'tamyeez',
                                        appealWorkflowState: 'PENDING_APPEAL_DEBTOR',
                                        appealStatus: 'tamyeez_filed',
                                        appealPhase: 'cassation',
                                        grievanceRejectedAwaitingTamyeez: false,
                                        grievanceAcceptedAwaitingDebtorTamyeez: false,
                                        awaitingCassationEntryBy: null,
                                        ...manualCassationExtra,
                                    },
                                    labels.timelineTitle,
                                    labels.timelineDescription,
                                    'amber'
                                )
                            }
                            className={
                                appealPerspective === 'debtor_agent'
                                    ? lawyerBtnClass
                                    : DECISION_BTN_DEBTOR_APPEAL_NOTICE
                            }
                        >
                            {labels.button}
                        </button>
                        );
                    })()}
                {awaitingParty === 'lawyer' &&
                    cassationWindowOpen &&
                    (() => {
                        const labels = appealCassationEntryLabels(appealPerspective, 'lawyer');
                        return (
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    transitionAppealWorkflow(
                                        decision,
                                        {
                                            noAppealChosen: false,
                                            appealActor: 'lawyer',
                                            appealMethod: 'tamyeez',
                                            appealWorkflowState: 'PENDING_APPEAL_LAWYER',
                                            appealStatus: 'tamyeez_filed',
                                            appealPhase: 'cassation',
                                            grievanceRejectedAwaitingTamyeez: false,
                                            grievanceAcceptedAwaitingDebtorTamyeez: false,
                                            awaitingCassationEntryBy: null,
                                            ...manualCassationLawyerExtra,
                                        },
                                        labels.timelineTitle,
                                        labels.timelineDescription,
                                        'amber'
                                    )
                                }
                                className={
                                    appealPerspective === 'debtor_agent'
                                        ? DECISION_BTN_DEBTOR_APPEAL_NOTICE
                                        : lawyerBtnClass
                                }
                            >
                                {appealPerspective === 'debtor_agent'
                                    ? appealInitialGrievanceEntryButtonLabel(
                                          appealPerspective,
                                          'lawyer'
                                      )
                                    : labels.button}
                            </button>
                            {appealPerspective !== 'debtor_agent' &&
                            canWaiveLawyerAwaitingCassation(decision, decisions) ? (
                                <button
                                    type="button"
                                    onClick={() => applyWaiveCassationAfterDebtorGrievance(decision)}
                                    className={DECISION_BTN_SECONDARY_WFULL}
                                >
                                    لا حاجة للتمييز
                                </button>
                            ) : null}
                        </div>
                        );
                    })()}
            </>
        );
    };

    const renderAppealTamyeezPhasePanel = (
        decision: Decision,
        variant: DecisionsAppealsAppealSlot,
        cassTips: { rad: string; naqd: string },
        onCommitTamyeezNumber: (trimmed: string) => void
    ) => {
        const outerClass =
            variant === 'appealsTab' ? 'space-y-2' : 'mb-3 space-y-2';
        const editLabel =
            variant === 'appealsTab' ? 'تعديل رقم القرار التمييزي' : 'تعديل رقم التمييز';
        const hasNum = Boolean(decision.tamyeezDecisionNumber?.trim());
        const showNumberSavedRow = hasNum && !tamyeezEditOpenById[decision.id];
        const hub = hubWithInferredAppealOrigin(decision);
        const cassationFiler = resolveCassationFilerActor(decision);
        const cassationNumberOptional =
            cassationFiler === 'debtor' && !isCreditorInitiatedExecutorRequest(hub);
        return (
            <div className={outerClass}>
                {/* القسم العلوي: حفظ رقم التمييز */}
                <label className="block text-[11px] text-slate-400 text-right">
                    رقم التمييز
                    {cassationNumberOptional ? (
                        <span className="text-slate-500 mr-1">(اختياري)</span>
                    ) : null}
                </label>
                <div className="flex flex-row-reverse flex-wrap items-center gap-2">
                    {showNumberSavedRow ? (
                        <>
                            <DecisionHintTooltip label={cassTips.naqd}>
                                <button
                                    type="button"
                                    onClick={() => applyCassationCourtDecision(decision, 'naqd')}
                                    className={DECISION_BTN_PRIMARY_FLEX}
                                >
                                    نقض القرار
                                </button>
                            </DecisionHintTooltip>
                            <DecisionHintTooltip label={cassTips.rad}>
                                <button
                                    type="button"
                                    onClick={() => applyCassationCourtDecision(decision, 'rad_laheeza')}
                                    className={DECISION_BTN_SECONDARY_FLEX}
                                >
                                    تصديق القرار
                                </button>
                            </DecisionHintTooltip>
                            <button
                                type="button"
                                onClick={() => setTamyeezEditOpenById((p) => ({ ...p, [decision.id]: true }))}
                                className={DECISION_BTN_SECONDARY_FLEX}
                            >
                                {editLabel}
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                value={
                                    tamyeezNumberDraftById[decision.id] ??
                                    decision.tamyeezDecisionNumber ??
                                    ''
                                }
                                onChange={(e) =>
                                    setTamyeezNumberDraftById((p) => ({
                                        ...p,
                                        [decision.id]: e.target.value,
                                    }))
                                }
                                className="flex-1 border-b border-white/10 bg-transparent py-2 text-[11px] text-gray-100 text-right outline-none focus:border-purple-500/40"
                                placeholder="أدخل رقم القرار"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const v = String(
                                        tamyeezNumberDraftById[decision.id] ??
                                            decision.tamyeezDecisionNumber ??
                                            ''
                                    ).trim();
                                    if (!cassationNumberOptional && !v) return;
                                    setTamyeezNumberDraftById((p) => ({ ...p, [decision.id]: v }));
                                    setTamyeezEditOpenById((p) => ({ ...p, [decision.id]: false }));
                                    if (v) onCommitTamyeezNumber(v);
                                }}
                                className={DECISION_BTN_PRIMARY_FLEX}
                            >
                                حفظ
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const buildDecisionCardStatus = React.useCallback((
        decision: Decision,
        appealWindowClosed: boolean,
        allDecisions: Decision[]
    ) => {
        const pipeline = appealPipelineRowForCard(decision, allDecisions);
        const deadlineMeta = getAppealStatus(decision);
        const ap = pipeline.appealPhase ?? null;
        const awaitingTamyeezAfterGrievance =
            Boolean(pipeline.awaitingCassationEntryBy) ||
            pipeline.grievanceRejectedAwaitingTamyeez === true ||
            pipeline.grievanceAcceptedAwaitingDebtorTamyeez === true;
        const appealTrackVisual =
            ap === 'grievance' ||
            ap === 'cassation' ||
            pipeline.appealStatus === 'tadhallum_filed' ||
            pipeline.appealStatus === 'tamyeez_filed' ||
            Boolean(pipeline.awaitingCassationEntryBy) ||
            pipeline.grievanceAcceptedAwaitingDebtorTamyeez === true;

        const appealLegallyFinal = isExecutorDecisionAppealFinal(decision, pipeline, {
            appealWindowClosed,
            appealTrackActive: appealTrackVisual && !appealWindowClosed,
            isPastTamyeezDeadline: deadlineMeta.isPastTamyeezDeadline,
        });

        const openAppealContext = (final: boolean) => {
            if (final) {
                setAppealDetailDecision(decision);
                setDecisionsHubTab('appeals');
                return;
            }
            goToAppealsWithScroll(decision.id);
        };

        const statusPillEl = (() => {
            const enforcement = resolveCreditorDecisionEnforcementState(decision, pipeline, {
                hubTab: decisionsHubTab,
                appealLegallyFinal,
                needsExecutor: requestNeedsExecutorOutcome(decision),
                appealPerspective,
                allDecisions,
            });
            const isFinalEnforcedLabel =
                enforcement.pillLabel === 'القرار نافذ' ||
                enforcement.pillLabel.endsWith('— نافذ');
            return renderDecisionHubStatusPill(
                enforcement.pillLabel,
                enforcement.pillTone,
                enforcement.enforced && isFinalEnforcedLabel
                    ? () => openAppealContext(true)
                    : undefined
            );
        })();

        return { statusPillEl, appealTrackVisual, awaitingTamyeezAfterGrievance, ap };
    }, [appealPerspective, decisionsHubTab, getAppealStatus, goToAppealsWithScroll, requestNeedsExecutorOutcome]);

    const decisionCardProps = {
        decisions,
        decisionsHubTab,
        dispatcherHub,
        executionId,
        appealPerspective,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        hubNoteById,
        setHubNoteById,
        handleExecutorResolveById,
        goToAppealsWithScroll,
        canShowAppealInitialForDecision,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        patchDecisionRow,
        logAppealTimeline,
        btnPrimaryWFull: DECISION_BTN_PRIMARY_WFULL,
        btnPrimaryFlex: DECISION_BTN_PRIMARY_FLEX,
        btnSecondaryFlex: DECISION_BTN_SECONDARY_FLEX,
        onDeleteDecision: handleDeleteDecision,
        onArchiveDecision: handleArchiveDecision,
    };

    const appealWorkflowCardProps = {
        decisions,
        appealPerspective,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        canShowAppealInitialForDecision,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealTamyeezPhasePanel,
        renderAppealAwaitingCassationButtons,
        transitionAppealWorkflow,
    };

    return (
        <TooltipProvider delayDuration={DECISIONS_APPEALS_TOOLTIP_DELAY_MS}>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            {!isHistoricalMode ? (
                <button
                    type="button"
                    onClick={() => {
                        setDecisionsHubTab('previous');
                        setShowAddModal(true);
                    }}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 ${DECISION_BTN_PRIMARY}`}
                >
                    <Plus size={18} className="opacity-90" />
                    إضافة قرار
                </button>
            ) : null}

            <div
                className={`space-y-4${isHistoricalMode ? ' pointer-events-none select-none opacity-[0.72]' : ''}`}
            >
                {decisions.length === 0 ? (
                    <div className="text-center py-6">
                        <Scale size={40} className="text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-300 text-sm">لا توجد قرارات أو طلبات بعد</p>
                    </div>
                ) : (
                    <>
                        <div
                            className="flex flex-row-reverse gap-1 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md"
                            role="tablist"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={decisionsHubTab === 'archive'}
                                onClick={() => setDecisionsHubTab('archive')}
                                className={`flex-1 rounded-lg py-2 px-1.5 text-[9px] sm:text-[10px] font-bold transition-colors leading-snug ${
                                    decisionsHubTab === 'archive'
                                        ? 'bg-slate-600/90 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                سجل الأرشيف
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={decisionsHubTab === 'appeals'}
                                onClick={() => setDecisionsHubTab('appeals')}
                                className={`flex-1 rounded-lg py-2 px-1.5 text-[9px] sm:text-[10px] font-bold transition-colors leading-snug ${
                                    decisionsHubTab === 'appeals'
                                        ? 'bg-amber-600/90 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                سجل الطعون
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={decisionsHubTab === 'previous'}
                                onClick={() => setDecisionsHubTab('previous')}
                                className={`flex-1 rounded-lg py-2 px-1.5 text-[9px] sm:text-[10px] font-bold transition-colors leading-snug ${
                                    decisionsHubTab === 'previous'
                                        ? 'bg-slate-600/90 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                القرارات السابقة
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={decisionsHubTab === 'current'}
                                onClick={() => setDecisionsHubTab('current')}
                                className={`flex-1 rounded-lg py-2 px-1.5 text-[9px] sm:text-[10px] font-bold transition-colors leading-snug ${
                                    decisionsHubTab === 'current'
                                        ? 'bg-slate-600/90 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                الطلبات الحالية
                            </button>
                        </div>

                        {decisionsHubTab === 'current' && (
                            <div className="space-y-4">
                                {archivePendingDecisions.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="border-b border-white/10 pb-2 text-right text-[11px] font-bold text-slate-400">
                                طلبات قيد المعالجة
                                        </p>
                                        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                            {archivePendingDecisions.map((d) => (
                                                <DecisionCard key={d.id} decision={d} {...decisionCardProps} />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-center text-slate-500 text-xs py-4">
                                        لا توجد طلبات قيد المعالجة في الوقت الحالي
                                    </p>
                                )}
                            </div>
                        )}
                        {decisionsHubTab === 'previous' && (
                            <div className="space-y-4">
                                {/* فلاتر سريعة */}
                                <div className="flex flex-wrap gap-2">
                                    {(['all', 'approved', 'rejected'] as const).map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => setPreviousFilter(f)}
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                                                previousFilter === f
                                                    ? 'bg-slate-600/90 text-white shadow-sm'
                                                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
                                            }`}
                                        >
                                            {f === 'all'
                                                ? 'الكل'
                                                : f === 'approved'
                                                  ? 'الموافق عليها'
                                                  : 'المرفوضة'}
                                        </button>
                                    ))}
                                </div>
                                {previousHubFilterOptions.length > 1 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {previousHubFilterOptions.map((f) => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => setPreviousProponentFilter(f)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                                                    previousProponentFilter === f
                                                        ? 'bg-amber-600/90 text-white shadow-sm'
                                                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
                                                }`}
                                            >
                                                {appealsHubProponentFilterLabel(f)}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {archiveSettledDecisions.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="border-b border-white/10 pb-2 text-right text-[11px] font-bold text-gray-400">
                                            القرارات المحسومة
                                        </p>
                                        {filteredPreviousSettledDecisions.length > 0 ? (
                                        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                            {filteredPreviousSettledDecisions.map((d) => (
                                                <DecisionCard key={d.id} decision={d} {...decisionCardProps} />
                                            ))}
                                        </div>
                                        ) : (
                                            <p className="text-center text-slate-500 text-xs py-4">
                                                لا توجد قرارات في هذا التصنيف
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-center text-slate-500 text-xs py-4">
                                        لا توجد قرارات محسومة مسجّلة بعد
                                    </p>
                                )}
                            </div>
                        )}
                        {decisionsHubTab === 'archive' && (
                            <div className="space-y-4">
                                {archivedDecisions.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="border-b border-white/10 pb-2 text-right text-[11px] font-bold text-gray-400">
                                            القرارات المؤرشفة
                                        </p>
                                        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                            {archivedDecisions.map((d) => (
                                                <DecisionCard key={d.id} decision={d} {...decisionCardProps} />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-center text-slate-500 text-xs py-4">
                                        لا توجد قرارات مؤرشفة
                                    </p>
                                )}
                            </div>
                        )}
                        {decisionsHubTab === 'appeals' && (
                            <div className="space-y-2">
                                {appealsHubFilterOptions.length > 1 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {appealsHubFilterOptions.map((f) => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => setAppealsProponentFilter(f)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                                                    appealsProponentFilter === f
                                                        ? 'bg-amber-600/90 text-white shadow-sm'
                                                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
                                                }`}
                                            >
                                                {appealsHubProponentFilterLabel(f)}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {filteredAppealsHubDecisions.length > 0 ? (
                                    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                        {filteredAppealsHubDecisions.map((d, index) => (
                                            <AppealWorkflowCard
                                                key={d.id}
                                                decision={d}
                                                appealCardRank={index}
                                                appealCardsTotal={filteredAppealsHubDecisions.length}
                                                {...appealWorkflowCardProps}
                                            />
                                        ))}
                                    </div>
                                ) : appealsHubDecisions.length > 0 ? (
                                    <p className="text-center text-slate-500 text-xs py-4">
                                        لا توجد بطاقات في هذا التصنيف
                                    </p>
                                ) : (
                                    <p className="text-center text-slate-500 text-xs py-4">
                                        لا يظهر هنا شيء حتى تبدأ إجراء تظلم أو تمييز على أحد القرارات
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {/* Add Decision Modal — portal حتى لا يُقصّ داخل motion/transform مركز القرارات */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {showAddModal && (
                            <motion.div
                                key="decisions-add-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-2xl"
                                style={{ zIndex: EXEC_MODAL_Z.nestedOverDecisions }}
                                role="presentation"
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) {
                                        resetAddDecisionForm();
                                        setShowAddModal(false);
                                    }
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.94, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.94, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="my-auto flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900/50 shadow-2xl backdrop-blur-2xl"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-4">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                resetAddDecisionForm();
                                                setShowAddModal(false);
                                            }}
                                            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5"
                                            aria-label="إغلاق"
                                        >
                                            <X size={20} className="text-slate-100" />
                                        </button>
                                        <h2 className="flex flex-1 items-center justify-end gap-2 text-right text-lg font-bold text-gray-100">
                                            إضافة قرار منفذ العدل
                                        </h2>
                                    </div>

                                    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-gray-400">
                                                عنوان القرار *
                                            </label>
                                            <input
                                                type="text"
                                                value={newTitle}
                                                onChange={(e) => setNewTitle(e.target.value)}
                                                className="w-full border-b border-white/10 bg-transparent py-2.5 text-right text-gray-100 outline-none focus:border-purple-500/40"
                                                placeholder=""
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-gray-400">
                                                تاريخ القرار *
                                            </label>
                                            <input
                                                type="date"
                                                value={newDate}
                                                onChange={(e) => setNewDate(e.target.value)}
                                                className="w-full border-b border-white/10 bg-transparent py-2.5 text-gray-100 outline-none focus:border-purple-500/40"
                                                style={{ direction: 'ltr', textAlign: 'right' }}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-gray-400">
                                                تفاصيل القرار (اختياري)
                                            </label>
                                            <textarea
                                                value={newBody}
                                                onChange={(e) => setNewBody(e.target.value)}
                                                className="min-h-[120px] max-h-[40vh] w-full resize-y border-b border-white/10 bg-transparent py-2.5 text-right text-gray-100 outline-none focus:border-purple-500/40"
                                                placeholder="اكتب ملخصاً للقرار أو منطوقه..."
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAddDecision}
                                            className={DECISION_BTN_PRIMARY_WFULL}
                                        >
                                            حفظ القرار
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {appealDetailDecision ? (
                            <motion.div
                                key="appeal-detail-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-2xl"
                                style={{ zIndex: EXEC_MODAL_Z.nestedOverDecisions }}
                                role="presentation"
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) setAppealDetailDecision(null);
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.94, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.94, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="my-auto flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900/45 shadow-2xl backdrop-blur-2xl"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 p-3">
                                        <button
                                            type="button"
                                            onClick={() => setAppealDetailDecision(null)}
                                            className="rounded-lg border border-transparent p-2 text-slate-200 hover:border-white/15 hover:bg-white/10"
                                            aria-label="إغلاق"
                                        >
                                            <X size={20} />
                                        </button>
                                        <h2 className="flex-1 text-right text-sm font-bold text-orange-100">
                                            تفاصيل القرار المطعون به
                                        </h2>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 text-right">
                                        <p className="text-sm font-bold text-white">{appealDetailDecision.title}</p>
                                        <p className="text-xs text-slate-400">
                                            تاريخ القرار:{' '}
                                            {Number.isNaN(new Date(appealDetailDecision.date).getTime())
                                                ? appealDetailDecision.date
                                                : new Date(appealDetailDecision.date).toLocaleDateString('ar-EG')}
                                        </p>
                                        {appealDetailDecision.body ? (
                                            <p className="text-xs leading-relaxed text-slate-100 whitespace-pre-line">
                                                {appealDetailDecision.requestKind === 'creditor_party_death'
                                                    ? (() => {
                                                          const json =
                                                              String(
                                                                  appealDetailDecision.creditorPartyDeathPayloadJson ||
                                                                      ''
                                                              ).trim() ||
                                                              String(appealDetailDecision.body || '');
                                                          const p = parseCreditorPartyDeathPayload(json);
                                                          return p
                                                              ? formatCreditorPartyDeathSummaryAr(p)
                                                              : appealDetailDecision.body;
                                                      })()
                                                    : appealDetailDecision.body}
                                            </p>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const id = appealDetailDecision.id;
                                                setAppealDetailDecision(null);
                                                goToAppealsWithScroll(id);
                                            }}
                                            className={DECISION_BTN_PRIMARY_WFULL}
                                        >
                                            الانتقال لتبويب الطعون
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
        </TooltipProvider>
    );
};
