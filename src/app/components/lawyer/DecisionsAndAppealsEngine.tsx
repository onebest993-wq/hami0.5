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
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import {
    isExecutionAppealTerminal,
} from '@/app/utils/executionDecisionAppealActive';
import {
    formatCreditorPartyDeathSummaryAr,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import { executionDecisionsStorageKey } from '@/app/utils/executionStorageKeys';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import SecureStoreService from '@/app/services/SecureStoreService';
import { useExecutionDashboardStore, INABA_SUB_FILE_ID, makeInabaSubFileId, isInabaSubFileId } from '@/app/stores/executionDashboardStore';
import { loadExecutionFilesRaw, saveExecutionFilesRaw, EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { storageCache } from '@/app/utils/storageCache';
import GlowingDot from './DecisionsAndAppealsEngine/components/GlowingDot';
import DecisionHintTooltip from './DecisionsAndAppealsEngine/components/DecisionHintTooltip';
import DecisionCard from './DecisionsAndAppealsEngine/components/DecisionCard';
import AppealWorkflowCard from './DecisionsAndAppealsEngine/components/AppealWorkflowCard';
import type { Decision } from './DecisionsAndAppealsEngine/types';
import {
    newEventId,
    DECISIONS_APPEALS_TOOLTIP_DELAY_MS,
    DECISION_GLASS_CARD,
    formatDateNumeric,
    cleanTitle,
    shouldShowDecisionHubBody,
    stripRedundantLeadingLinesFromHubBody,
    appealWindowsFromClockYmd,
    appealEntryShowsDebtorFirst,
    petitionGrantedAfterCassation,
    decisionAppealClockYmd,
    inferAppealMethodsUsed,
    deriveDecisionHubStatus,
    getActiveAppealCopyForOriginal,
    appealPipelineRowForCard,
    formatRegisteredAppealPathForDecision,
    effectiveExecutorOutcomeForCreditorHubPill,
    EXECUTOR_QUEUE_REQUEST_KINDS,
    decisionAppealPipelineActive,
    sortDecisionsWithAppealPinnedFirst,
    appealTrackSmartPillLabel,
    type AppealDeadlineWindows,
    type DecisionsAppealsAppealSlot,
} from './DecisionsAndAppealsEngine/utils';

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
    const storageKey = useMemo(
        () => executionDecisionsStorageKey(executionId),
        [executionId]
    );

    const [decisions, setDecisions] = useState<Decision[]>([]);

    const reloadFromStorage = React.useCallback(() => {
        const stored = SecureStoreService.getItemSync(storageKey);
        let raw: Decision[] = [];
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as unknown;
                raw = Array.isArray(parsed) ? (parsed as Decision[]) : [];
            } catch {
                raw = [];
            }
        }
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
                    SecureStoreService.setItemSync(storageKey, JSON.stringify(raw));
                } catch {
                    /* ignore */
                }
            }
        }
        const normalized = raw.map((d) => {
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
            if (row.requestKind && !row.executorOutcome) row.executorOutcome = 'pending';
            if (row.appealPhase === undefined) row.appealPhase = null;
            if (row.grievanceRejectedAwaitingTamyeez === undefined) {
                row.grievanceRejectedAwaitingTamyeez = false;
            }
            if (row.grievanceAcceptedAwaitingDebtorTamyeez === undefined) {
                row.grievanceAcceptedAwaitingDebtorTamyeez = false;
            }
            if (row.awaitingCassationEntryBy === undefined) row.awaitingCassationEntryBy = null;
            if (!row.awaitingCassationEntryBy) {
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
            row.noAppealChosen = false;
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
                    } else if (row.appealResult === 'نقض القرار') {
                        row.appealActor = row.executorOutcome === 'rejected' ? 'debtor' : 'lawyer';
                    } else if (row.appealStatus === 'tadhallum_filed' || row.appealPhase === 'grievance') {
                        row.appealActor = row.executorOutcome === 'approved' ? 'debtor' : 'lawyer';
                    } else if (row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation') {
                        row.appealActor = row.executorOutcome === 'approved' ? 'debtor' : 'lawyer';
                    }
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
        setDecisions(normalized);
    }, [storageKey]);

    useEffect(() => {
        reloadFromStorage();
    }, [reloadFromStorage]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const stored = await SecureStoreService.getItem(storageKey);
                if (cancelled) return;
                if (stored) {
                    const parsed = JSON.parse(stored) as unknown;
                    const storedCount = Array.isArray(parsed) ? parsed.length : 0;
                    const currentCount = decisions.length;
                    if (currentCount === 0 || storedCount > currentCount) {
                        reloadFromStorage();
                    }
                }
            } catch {
                /* ignore */
            }
        })();
        return () => { cancelled = true; };
    }, [decisions.length, reloadFromStorage, storageKey]);

    useEffect(() => {
        const onExternalReload = () => {
            reloadFromStorage();
        };
        window.addEventListener('hami-decisions-reload', onExternalReload);
        return () => window.removeEventListener('hami-decisions-reload', onExternalReload);
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
    const [appealActorDraftById, setAppealActorDraftById] = useState<Record<string, 'lawyer' | 'debtor' | null>>({});
    const [tamyeezEditOpenById, setTamyeezEditOpenById] = useState<Record<string, boolean>>({});

    const [showAddModal, setShowAddModal] = useState(false);
    /** تبويب القائمة: طلبات حالية | قرارات سابقة | سجل الطعون */
    const [decisionsHubTab, setDecisionsHubTab] = useState<'current' | 'previous' | 'appeals' | 'archive'>('current');
    const [previousFilter, setPreviousFilter] = useState<'all' | 'approved' | 'rejected' | 'active_appeals'>('all');
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
        const t = window.setTimeout(() => {
            document.getElementById(`hami-decision-card-${decisionsScrollTargetId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
            setDecisionsScrollTargetId(null);
        }, 100);
        return () => window.clearTimeout(t);
    }, [decisionsHubTab, decisionsScrollTargetId]);

    useLayoutEffect(() => {
        if (decisionsHubTab !== 'appeals' || !appealsScrollTargetId) return;
        const t = window.setTimeout(() => {
            document.getElementById(`hami-appeal-card-${appealsScrollTargetId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
            setAppealsScrollTargetId(null);
        }, 100);
        return () => window.clearTimeout(t);
    }, [decisionsHubTab, appealsScrollTargetId]);

    // Form state
    const [newTitle, setNewTitle] = useState('');
    const [newBody, setNewBody] = useState('');
    const [newDate, setNewDate] = useState('');

    const requestNeedsExecutorOutcome = React.useCallback(
        (d: Decision) =>
            Boolean(d.requestKind && EXECUTOR_QUEUE_REQUEST_KINDS.includes(d.requestKind)) &&
            (d.executorOutcome === undefined || d.executorOutcome === 'pending'),
        []
    );

    /** لا يُعرض «الطعن بالقرار» قبل بتّ المنفذ لطلبات الطابور فقط؛ غير ذلك يبقى السلوك السابق */
    const canShowAppealInitialForDecision = React.useCallback(
        (d: Decision): boolean => {
            if (d.manualExecutorLedgerEntry) return true;
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
                SecureStoreService.setItemSync(storageKey, JSON.stringify(next));
                queueMicrotask(() => dispatchDecisionsReload());
                return next;
            });
        },
        [storageKey]
    );


    /** بعد «قرار منفذ يدوي»: أول نقرة تثبت مسار طعن الدائن أو طعن المدين وتفتح اختيار التظلم/التمييز */
    const commitExecutorSideAppealPath = React.useCallback(
        (decision: Decision, branch: 'creditor' | 'debtor') => {
            const nowIso = new Date().toISOString();
            const when = new Date(nowIso).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            const patch: Partial<Decision> =
                branch === 'creditor'
                    ? {
                          appealRequestOrigin: 'creditor_side',
                          executorOutcome: 'rejected',
                          appealBaseBranch: 'after_rejection',
                          status: 'rejected',
                      }
                    : {
                          appealRequestOrigin: 'debtor_side',
                          executorOutcome: 'rejected',
                          appealBaseBranch: 'after_rejection',
                          status: 'rejected',
                      };
            patchDecisionRow(decision.id, patch);
            setAppealActorDraftById((p) => ({
                ...p,
                [decision.id]: branch === 'creditor' ? 'lawyer' : 'debtor',
            }));
            onTimelineUpdate({
                id: newEventId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title:
                    branch === 'creditor'
                        ? 'بدء مسار الطعن: الدائن يطعن على قرار المنفذ'
                        : 'بدء مسار الطعن: المدين بادر بالطعن',
                description:
                    branch === 'creditor'
                        ? `تم اختيار «الطعن بالقرار» لقرار: ${decision.title}\nالتوقيت: ${when}`
                        : `تم اختيار «قام المدين بالطعن» لقرار: ${decision.title}\nالتوقيت: ${when}`,
                type: 'appeal',
                source: 'القرارات والطعون',
            });
        },
        [onTimelineUpdate, patchDecisionRow]
    );

    const applyCassationCourtDecision = React.useCallback(
        (decision: Decision, choice: 'rad_laheeza' | 'naqd') => {
            const petitionGranted = petitionGrantedAfterCassation(decision, choice);
            const labelAr: NonNullable<Decision['appealResult']> =
                choice === 'rad_laheeza' ? 'رد اللائحة' : 'نقض القرار';
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
            const debtorOrigin = decision.appealRequestOrigin === 'debtor_side';
            const outcomeLine = debtorOrigin
                ? petitionGranted
                    ? 'النتيجة: طلب المدين مقبول نهائياً وقُفل القرار.'
                    : 'النتيجة: طلب المدين مرفوض نهائياً وقُفل القرار.'
                : petitionGranted
                  ? 'النتيجة: طلب الدائن/تنفيذ مقبول نهائياً وقُفل القرار.'
                  : 'النتيجة: طلب الدائن/تنفيذ مرفوض نهائياً وقُفل القرار.';
            const resolvedAppealPatch: Partial<Decision> = {
                appealPhase: null,
                appealStatus: 'final',
                appealResult: labelAr,
                status: petitionGranted ? 'accepted' : 'rejected',
                executorOutcome: petitionGranted ? 'approved' : 'rejected',
                appealWorkflowState,
                awaitingCassationEntryBy: null,
                grievanceRejectedAwaitingTamyeez: false,
                grievanceAcceptedAwaitingDebtorTamyeez: false,
                noAppealChosen: false,
            };

            /** عند نقض القرار: نقلب حالة الطلب الأصلي (force flip) */
            const isNaqd = choice === 'naqd';
            const srcId = decision.appealSourceDecisionId;
            const parentDecision = typeof srcId === 'string' && srcId.trim()
                ? decisions.find((d) => d.id === srcId)
                : decision;
            const targetExecutorOutcome = parentDecision?.executorOutcome ?? decision.executorOutcome;
            const forceFlipParentRequestPatch: Partial<Decision> | null = isNaqd
                ? (() => {
                      if (targetExecutorOutcome === 'approved' || targetExecutorOutcome === 'alternative') {
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
            SecureStoreService.setItemSync(storageKey, JSON.stringify(next));
            queueMicrotask(() => dispatchDecisionsReload());
            const mergedRowId =
                typeof srcId === 'string' && srcId.trim() ? srcId : decision.id;
            const mergedRow = next.find((x) => x.id === mergedRowId);
            if (mergedRow) {
                dispatchHeirSubstitutionOutcomeIfAny(executionId, mergedRow);
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
        [decisions, executionId, onTimelineUpdate, storageKey]
    );

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
            setHubNoteById((p) => {
                const n = { ...p };
                delete n[id];
                return n;
            });
            const today = getLocalTodayYmd();
            const ts = new Date().toISOString();
            setDecisions((prev) =>
                prev.map((d) => {
                    if (d.id !== id) return d;
                    if (resolution === 'approved') {
                        return {
                            ...d,
                            executorOutcome: 'approved' as const,
                            appealStatus: 'pending' as const,
                            status: 'accepted' as const,
                            appealPhase: null,
                            appealBaseBranch: 'after_approval' as const,
                            resolvedAt: ts,
                            executorNote: hubNoteById[id],
                        };
                    }
                    return {
                        ...d,
                        executorOutcome: 'rejected' as const,
                        appealStatus: 'pending' as const,
                        date: today,
                        status: 'rejected' as const,
                        appealPhase: null,
                        appealBaseBranch: 'after_rejection' as const,
                        resolvedAt: ts,
                        executorNote: hubNoteById[id],
                    };
                })
            );
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
                    resolvedSubtype === 'property_increase_10' ||
                    resolvedSubtype === 'property_reauction_default'
                ) {
                    const rawJson = String((row as any).seizurePayloadJson || '').trim();
                    let seizedPropertyId = '';
                    let step:
                        | 'experts'
                        | 'auction'
                        | 'award'
                        | 'increase10'
                        | 'reauction_default'
                        | '' = '';
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
                                : resolvedSubtype === 'property_increase_10'
                                  ? 'increase10'
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

            /** التوجيه الذكي: عند الموافقة أو الرفض على طلب إنابة تنفيذية */
            if (row.requestKind === 'special_followup') {
                const title = String(row.title || '').trim();
                const dispatchToast = (msg: string, type: 'success' | 'warning' | 'info' = 'success') => {
                    try {
                        window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message: msg, type } }));
                    } catch {}
                };
                if (title === 'طلب الإنابة التنفيذية') {
                    const storeApi = useExecutionDashboardStore.getState();
                    const parentExecutionId =
                        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
                        String(storeApi.currentFile?.id || '').trim();
                    if (resolution === 'rejected') {
                        const target = storeApi.subFiles.find(
                            (f) =>
                                (f.id === makeInabaSubFileId(parentExecutionId) ||
                                    (f.id === INABA_SUB_FILE_ID &&
                                        String(f.parentFileId || '').trim() === parentExecutionId)) &&
                                parentExecutionId.length > 0
                        );
                        if (target) {
                            storeApi.removeSubFile(target.id);
                            storeApi.restoreOriginalFile();
                            dispatchToast('تم رفض طلب الإنابة التنفيذية وإلغاء الإضبارة الفرعية.', 'warning');
                        }
                    } else if (resolution === 'approved') {
                        const store = useExecutionDashboardStore.getState();
                        const persistedFile = (() => {
                            try {
                                const all = loadExecutionFilesRaw() as any[];
                                return all.find((f: any) => String(f?.id || '').trim() === parentExecutionId) as any;
                            } catch {
                                return null;
                            }
                        })();
                        const file = persistedFile || (store.currentFile as any) || {};
                        if (parentExecutionId) {
                            const ts = new Date().toISOString();

                            const bodyRaw = String(row.body || '');

                            let targetDirectorate = file.directorate || '';
                            const dirMatch = bodyRaw.match(/الدائرة المناب إليها[:\s]+(.+)/);
                            if (dirMatch?.[1]) {
                                targetDirectorate = dirMatch[1].trim();
                            } else {
                                const dirFallbackMatch = bodyRaw.match(/إليها[:\s]+(.+)/);
                                if (dirFallbackMatch?.[1]) {
                                    const line = dirFallbackMatch[1].split('\n')[0]?.trim();
                                    if (line) targetDirectorate = line;
                                }
                            }

                            const inabaFileNumber = '';

                            let delegationPurpose = '';
                            const purposeMatch = bodyRaw.match(/الغاية من الإنابة:\s*(.+)/);
                            if (purposeMatch?.[1]) {
                                delegationPurpose = purposeMatch[1].trim();
                            }

                            const inabaSubFile: any = {
                                id: makeInabaSubFileId(parentExecutionId),
                                fileNumber: inabaFileNumber,
                                parentFileId: parentExecutionId,
                                directorate: targetDirectorate,
                                debtorCourt: file.debtorCourt || '',
                                creditors: file.creditors ? [...file.creditors] : [],
                                debtors: file.debtors ? [...file.debtors] : [],
                                debtAmount: file.debtAmount || 0,
                                claimType: file.claimType || '',
                                status: 'UNNOTIFIED',
                                dossier_lifecycle_status: 'active',
                                debtor_summons_marker: null,
                                delegationTargetDirectorate: targetDirectorate,
                                delegationPurpose: delegationPurpose,
                                decisions: [],
                                timelineEvents: [],
                                createdAt: ts,
                                updatedAt: ts,
                            };

                            try {
                                store.addSubFile(inabaSubFile);
                                queueMicrotask(() => {
                                    try {
                                        store.swapToSubFile(inabaSubFile);
                                    } catch {}
                                });
                                dispatchToast('تم تفعيل الإنابة التنفيذية. يمكنك التبديل إلى إضبارة الإنابة.', 'success');
                            } catch {}
                        }
                    }
                } else if (title === 'طلب توحيد الأضابير') {
                    if (resolution !== 'approved') {
                        dispatchToast('تم رفض طلب توحيد الأضابير.', 'warning');
                        return;
                    }
                    const store = useExecutionDashboardStore.getState();
                    const parentExecutionId =
                        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
                        String(store.currentFile?.id || '').trim();
                    const payloadRaw = String((row as any)?.payloadJson || '').trim();
                    if (!parentExecutionId) {
                        dispatchToast('تعذر تنفيذ التوحيد: لم يتم تحديد الإضبارة الأصلية.', 'warning');
                        return;
                    }
                    if (!payloadRaw) {
                        dispatchToast('طلب توحيد قديم بدون بيانات منظمة — يرجى إعادة إرسال الطلب.', 'warning');
                        return;
                    }
                    try {
                        const parsed = JSON.parse(payloadRaw) as any;
                        if (parsed?.kind !== 'unification') {
                            dispatchToast('تعذر تنفيذ التوحيد: صيغة الطلب غير مدعومة.', 'warning');
                            return;
                        }
                        const targetType = String(parsed?.targetType || '').trim();
                        if (targetType === 'own') {
                            const targetId = String(parsed?.targetId || '').trim();
                            if (!targetId) {
                                dispatchToast('تعذر تنفيذ التوحيد: لم يتم تحديد معرف الإضبارة.', 'warning');
                                return;
                            }
                            if (targetId === parentExecutionId) {
                                dispatchToast('تعذر تنفيذ التوحيد: لا يمكن توحيد الإضبارة مع نفسها.', 'warning');
                                return;
                            }
                            store.setParentIdForDossier(targetId, parentExecutionId);
                            try {
                                const all = loadExecutionFilesRaw() as any[];
                                const base = all.find((f: any) => String(f?.id || '').trim() === parentExecutionId) as ExecutionFile | undefined;
                                const unified = all.find((f: any) => String(f?.id || '').trim() === targetId) as ExecutionFile | undefined;
                                const baseNo = String(base?.fileNumber || '').trim() || parentExecutionId;
                                const unifiedNo = String(unified?.fileNumber || '').trim() || targetId;
                                const ts = new Date().toISOString();
                                const ymd = ts.slice(0, 10);
                                const alreadyBase =
                                    Array.isArray((base as any)?.timelineEvents) &&
                                    (base as any).timelineEvents.some((e: any) => String(e?.metadata?.decisionRowId || '') === String(row.id));
                                const alreadyUnified =
                                    Array.isArray((unified as any)?.timelineEvents) &&
                                    (unified as any).timelineEvents.some((e: any) => String(e?.metadata?.decisionRowId || '') === String(row.id));
                                if (!alreadyBase) {
                                    store.appendTimelineEventToFile(parentExecutionId, {
                                        id: newEventId(),
                                        type: 'decision',
                                        title: `تم توحيد الإضبارة رقم ${unifiedNo} مع هذه الإضبارة`,
                                        description: `بتاريخ ${ymd}:\n\nتم قبول طلب التوحيد من قبل المنفذ، وتم ربط الإضبارة رقم ${unifiedNo} بهذه الإضبارة.`,
                                        date: ymd,
                                        timestamp: ts,
                                        source: 'القرارات والطعون',
                                        metadata: { decisionRowId: row.id, timelineThreadKey: `executor_decision:${row.id}`, unifiedDossierId: targetId },
                                    } as any);
                                }
                                if (!alreadyUnified) {
                                    store.appendTimelineEventToFile(targetId, {
                                        id: newEventId(),
                                        type: 'decision',
                                        title: `تم توحيد هذه الإضبارة لتصبح تابعة للإضبارة رقم ${baseNo}`,
                                        description: `بتاريخ ${ymd}:\n\nتم قبول طلب التوحيد من قبل المنفذ، وأصبحت هذه الإضبارة مرتبطة بالإضبارة رقم ${baseNo}.`,
                                        date: ymd,
                                        timestamp: ts,
                                        source: 'القرارات والطعون',
                                        metadata: { decisionRowId: row.id, timelineThreadKey: `executor_decision:${row.id}`, baseDossierId: parentExecutionId },
                                    } as any);
                                }
                            } catch {}
                            dispatchToast('تم توحيد الإضبارة تلقائياً بعد موافقة المنفذ.', 'success');
                            return;
                        }
                        if (targetType === 'colleague') {
                            const token = String(parsed?.colleagueToken || '').trim();
                            if (!token) {
                                dispatchToast('تعذر ربط إضبارة الزميل: رمز الربط مفقود.', 'warning');
                                return;
                            }
                            const currentFile: any = store.currentFile;
                            const now = new Date().toISOString();
                            const existing = Array.isArray(currentFile?.linkedDossiers) ? currentFile.linkedDossiers : [];
                            const next = [
                                ...existing,
                                {
                                    linkedId: token,
                                    type: 'colleague' as const,
                                    linkToken: token,
                                    linkedAt: now,
                                },
                            ].filter((d: any, idx: number, arr: any[]) => {
                                const id = String(d?.linkedId || '').trim();
                                if (!id) return false;
                                return arr.findIndex((x) => String((x as any)?.linkedId || '').trim() === id) === idx;
                            });
                            const currentToken = String(currentFile?.linkToken || '').trim();
                            const patch: any = { linkedDossiers: next };
                            if (!currentToken) {
                                patch.linkToken = store.generateLinkToken();
                            }
                            const curId = String(currentFile?.id || '').trim();
                            if (curId && curId === parentExecutionId) {
                                store.updateCurrentFile(patch);
                            } else {
                                try {
                                    const all = loadExecutionFilesRaw() as any[];
                                    const idx = all.findIndex(
                                        (f: any) => String(f?.id || '').trim() === parentExecutionId
                                    );
                                    if (idx >= 0) {
                                        all[idx] = { ...(all[idx] as any), ...patch, updatedAt: now };
                                        saveExecutionFilesRaw(all);
                                        const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                                        if (Array.isArray(cache)) {
                                            const arr = cache as any[];
                                            const cIdx = arr.findIndex(
                                                (f: any) => String(f?.id || '').trim() === parentExecutionId
                                            );
                                            if (cIdx >= 0) {
                                                arr[cIdx] = { ...(arr[cIdx] as any), ...patch, updatedAt: now };
                                                storageCache.set(EXECUTION_FILES_STORAGE_KEY, arr);
                                            }
                                        }
                                    }
                                } catch {}
                            }
                            dispatchToast('تم ربط إضبارة الزميل تلقائياً بعد موافقة المنفذ.', 'success');
                            return;
                        }
                        dispatchToast('تعذر تنفيذ التوحيد: نوع الربط غير معروف.', 'warning');
                    } catch {
                        dispatchToast('تعذر قراءة بيانات طلب التوحيد. يرجى إعادة إرسال الطلب.', 'warning');
                    }
                } else if (title === 'طلب مخاطبة مديرية الانابة') {
                    if (resolution !== 'approved') {
                        dispatchToast('تم رفض طلب مخاطبة مديرية الانابة.', 'warning');
                        return;
                    }
                    const store = useExecutionDashboardStore.getState();
                    const parentExecutionId =
                        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
                        String(store.currentFile?.id || '').trim();
                    const payloadRaw = String((row as any)?.payloadJson || '').trim();
                    if (!parentExecutionId) {
                        dispatchToast('تعذر تنفيذ الطلب: لم يتم تحديد الإضبارة الأم.', 'warning');
                        return;
                    }
                    if (!payloadRaw) {
                        dispatchToast('طلب مخاطبة قديم بدون بيانات منظمة — يرجى إعادة إرسال الطلب.', 'warning');
                        return;
                    }
                    try {
                        const parsed = JSON.parse(payloadRaw) as any;
                        if (parsed?.kind !== 'inaba_correspondence') {
                            dispatchToast('تعذر تنفيذ الطلب: صيغة الطلب غير مدعومة.', 'warning');
                            return;
                        }
                        const inabaSubFileId = String(parsed?.inabaSubFileId || '').trim();
                        const directorate = String(parsed?.directorate || '').trim();
                        const subject = String(parsed?.subject || '').trim();
                        if (!subject) {
                            dispatchToast('تعذر تنفيذ الطلب: موضوع المخاطبة مفقود.', 'warning');
                            return;
                        }
                        const mkId = () => `tl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                        const ts = new Date().toISOString();
                        const ymd = ts.slice(0, 10);
                        const resolvedInabaId =
                            inabaSubFileId ||
                            store.subFiles.find(
                                (sf) =>
                                    String(sf.parentFileId || '') === parentExecutionId &&
                                    isInabaSubFileId(sf.id) &&
                                    String((sf as any).delegationTargetDirectorate || sf.directorate || '').trim() === directorate
                            )?.id ||
                            '';
                        if (!resolvedInabaId) {
                            dispatchToast('تعذر تنفيذ الطلب: لم يتم العثور على إضبارة الإنابة المستهدفة.', 'warning');
                            return;
                        }
                        store.appendTimelineEventToFile(parentExecutionId, {
                            id: mkId(),
                            type: 'decision',
                            title: 'تم إرسال مخاطبة إلى مديرية الإنابة',
                            description: `بتاريخ ${ymd}:\n\nمديرية الإنابة: ${directorate || '---'}\nموضوع المخاطبة: ${subject}`,
                            date: ymd,
                            timestamp: ts,
                            source: 'القرارات والطعون',
                            metadata: { decisionRowId: row.id, timelineThreadKey: `executor_decision:${row.id}`, inabaSubFileId: resolvedInabaId },
                        } as any);
                        store.appendTimelineEventToSubFile(resolvedInabaId, parentExecutionId, {
                            id: mkId(),
                            type: 'decision',
                            title: 'وردت مخاطبة من الإضبارة الأم',
                            description: `بتاريخ ${ymd}:\n\nموضوع المخاطبة: ${subject}`,
                            date: ymd,
                            timestamp: ts,
                            source: 'القرارات والطعون',
                            metadata: { decisionRowId: row.id, timelineThreadKey: `executor_decision:${row.id}`, parentExecutionId },
                        } as any);
                        dispatchToast('تم تسجيل المخاطبة في الإضبارة الأم والإنابة.', 'success');
                    } catch {
                        dispatchToast('تعذر قراءة بيانات طلب المخاطبة. يرجى إعادة إرسال الطلب.', 'warning');
                    }
                } else if (title === 'طلب نقل الإضبارة') {
                    if (resolution !== 'approved') {
                        dispatchToast('تم رفض طلب نقل الإضبارة.', 'warning');
                        return;
                    }
                    const store = useExecutionDashboardStore.getState();
                    const dossierId =
                        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
                        String(store.currentFile?.id || '').trim();
                    if (!dossierId) {
                        dispatchToast('تعذر تنفيذ النقل: لم يتم تحديد الإضبارة.', 'warning');
                        return;
                    }
                    const payloadRaw = String((row as any)?.payloadJson || '').trim();
                    let targetDirectorate = '';
                    if (payloadRaw) {
                        try {
                            const parsed = JSON.parse(payloadRaw) as any;
                            if (parsed?.kind === 'transfer') {
                                targetDirectorate = String(parsed?.targetDirectorate || '').trim();
                            }
                        } catch {}
                    }
                    if (!targetDirectorate) {
                        const bodyRaw = String(row.body || '');
                        const m = bodyRaw.match(/الدائرة\s*المراد\s*النقل\s*إليها:\s*(.+)/);
                        if (m?.[1]) targetDirectorate = m[1].split('\n')[0]?.trim() || '';
                    }
                    if (!targetDirectorate) {
                        dispatchToast('تعذر تنفيذ النقل: لم يتم تحديد المديرية المراد النقل إليها.', 'warning');
                        return;
                    }
                    const now = new Date().toISOString();
                    const today = now.slice(0, 10);
                    const patch: any = {
                        directorate: targetDirectorate as any,
                        transferPendingFileNumberChange: true,
                        dossier_last_action_date: today,
                        updatedAt: now,
                    };
                    const curId = String(store.currentFile?.id || '').trim();
                    if (curId && curId === dossierId) {
                        store.updateCurrentFile(patch);
                    } else {
                        try {
                            const all = loadExecutionFilesRaw() as any[];
                            const idx = all.findIndex((f: any) => String(f?.id || '').trim() === dossierId);
                            if (idx >= 0) {
                                all[idx] = { ...(all[idx] as any), ...patch };
                                saveExecutionFilesRaw(all);
                                const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                                if (Array.isArray(cache)) {
                                    const arr = cache as any[];
                                    const cIdx = arr.findIndex((f: any) => String(f?.id || '').trim() === dossierId);
                                    if (cIdx >= 0) {
                                        arr[cIdx] = { ...(arr[cIdx] as any), ...patch };
                                        storageCache.set(EXECUTION_FILES_STORAGE_KEY, arr);
                                    }
                                }
                            }
                        } catch {}
                    }
                    dispatchToast('تم نقل الإضبارة وتحديث المديرية. يمكنك تغيير رقم الإضبارة من الخيار الظاهر فوق الرقم.', 'success');
                } else if (title === 'طلب تجديد الإضبارة') {
                    if (resolution !== 'approved') {
                        dispatchToast('تم رفض طلب تجديد الإضبارة.', 'warning');
                        return;
                    }
                    const store = useExecutionDashboardStore.getState();
                    const dossierId =
                        normalizeBaseDossierIdFromDecisionsKey(executionId) ||
                        String(store.currentFile?.id || '').trim();
                    if (!dossierId) {
                        dispatchToast('تعذر تنفيذ التجديد: لم يتم تحديد الإضبارة.', 'warning');
                        return;
                    }
                    const now = new Date().toISOString();
                    const today = now.slice(0, 10);
                    const patch: any = {
                        dossier_lifecycle_status: 'active',
                        dossier_status_reason: 'مجدد',
                        dossier_status_date: today,
                        dossier_last_action_date: today,
                        executionPaused: false,
                        stay_of_execution: null,
                        updatedAt: now,
                    };
                    const curId = String(store.currentFile?.id || '').trim();
                    if (curId && curId === dossierId) {
                        store.updateCurrentFile(patch);
                    } else {
                        try {
                            const all = loadExecutionFilesRaw() as any[];
                            const idx = all.findIndex((f: any) => String(f?.id || '').trim() === dossierId);
                            if (idx >= 0) {
                                all[idx] = { ...(all[idx] as any), ...patch };
                                saveExecutionFilesRaw(all);
                                const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                                if (Array.isArray(cache)) {
                                    const arr = cache as any[];
                                    const cIdx = arr.findIndex((f: any) => String(f?.id || '').trim() === dossierId);
                                    if (cIdx >= 0) {
                                        arr[cIdx] = { ...(arr[cIdx] as any), ...patch };
                                        storageCache.set(EXECUTION_FILES_STORAGE_KEY, arr);
                                    }
                                }
                            }
                        } catch {}
                    }
                    dispatchToast('تم تجديد الإضبارة وإرجاع حالتها إلى نشطة.', 'success');
                } else {
                    const store = useExecutionDashboardStore.getState();
                    const existing: any[] = Array.isArray((store.currentFile as any)?.officialCorrespondences)
                        ? (store.currentFile as any).officialCorrespondences
                        : [];
                    const ts = new Date().toISOString();
                    const newRecord = {
                        id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        decisionId: id,
                        decisionTitle: row.title || 'إنابة تنفيذية',
                        status: 'pending_send' as const,
                        targetDirectorate: '',
                        purpose: '',
                        sendLetterNumber: '',
                        sendLetterDate: '',
                        resultDetails: '',
                        createdAt: ts,
                        updatedAt: ts,
                    };
                    const next = [...existing, newRecord];
                    store.updateCurrentFile({ officialCorrespondences: next } as any);
                }
            }
        },
        [decisions, executionId, hubNoteById, resolveDecision, storageKey]
    );

    const handleDeleteDecision = React.useCallback((id: string) => {
        setDecisions((prev) => {
            const next = prev.filter((d) => d.id !== id);
            SecureStoreService.setItemSync(storageKey, JSON.stringify(next));
            queueMicrotask(() => dispatchDecisionsReload());
            return next;
        });
    }, [storageKey]);

    const handleArchiveDecision = React.useCallback((id: string) => {
        setDecisions((prev) => {
            const next = prev.map((d) =>
                d.id === id ? { ...d, isArchived: true } : d
            );
            SecureStoreService.setItemSync(storageKey, JSON.stringify(next));
            queueMicrotask(() => dispatchDecisionsReload());
            return next;
        });
    }, [storageKey]);

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
        };
        
        const updated = [newDecision, ...decisions];
        setDecisions(updated);
        SecureStoreService.setItemSync(storageKey, JSON.stringify(updated));
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
        
        // Reset form
        setNewTitle('');
        setNewBody('');
        setNewDate('');
        setShowAddModal(false);
        setDecisionsHubTab('previous');
    };
    
    /** قرارات أصلية فقط (ليس نسخ طعن) — طابور المنفذ ثم الباقي زمنياً */
    const archiveHubDecisions = useMemo(() => {
        const originals = decisions.filter((d) => !d.appealSourceDecisionId && !d.isArchived);
        const pending = originals.filter((d) => requestNeedsExecutorOutcome(d));
        const rest = originals.filter((d) => !requestNeedsExecutorOutcome(d));
        
        // Sorting by date descending
        const sortedPending = [...pending].sort((a, b) => 
            String(b.date).localeCompare(String(a.date), undefined, { numeric: true })
        );
        const sortedRest = [...rest].sort((a, b) =>
            String(b.date).localeCompare(String(a.date), undefined, { numeric: true })
        );
        
        return [...sortedPending, ...sortedRest];
    }, [decisions]);

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
        () => decisions.filter((d) => !d.appealSourceDecisionId && d.isArchived),
        [decisions]
    );

    /** سجل الطعون: نسخ مسار الطعن + (للبيانات القديمة) صف واحد يضم مساراً مفتوحاً */
    const appealsHubDecisions = useMemo(
        () =>
            sortDecisionsWithAppealPinnedFirst(
                decisions.filter((d) => {
                    if (d.appealSourceDecisionId) return true;
                    const draft = appealActorDraftById[d.id] ?? null;
                    return decisionAppealPipelineActive(d, draft);
                }),
                appealActorDraftById
            ),
        [appealActorDraftById, decisions]
    );

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
                        SecureStoreService.setItemSync(storageKey, JSON.stringify(nextLinked));
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
                        setAppealActorDraftById((p) => ({ ...p, [target.id]: null }));
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
                    activeAppealCopyId: copyId,
                    appealTimelineLogs: baseLogs,
                };
                const next = decisions.map((d) => (d.id === target.id ? cleanedOriginal : d)).concat([copy]);
                setDecisions(next);
                SecureStoreService.setItemSync(storageKey, JSON.stringify(next));
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
                setAppealActorDraftById((p) => ({ ...p, [target.id]: null }));
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
            SecureStoreService.setItemSync(storageKey, JSON.stringify(next));
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
            setAppealActorDraftById((p) => ({ ...p, [decision.id]: null }));
        },
        [decisions, goToAppealsWithScroll, getMilestoneTimelineSnapshot, onTimelineUpdate, storageKey]
    );

    const APPEAL_ORIGINAL_LOCKED_HINT =
        'مسار الطعن يُكمل حالياً على النسخة في «سجل الطعون». لا يُفتح مسار ثانٍ من القرار الأصل حتى يُغلق المسار على النسخة. استخدم زر «فتح مسار الطعن» أعلاه.';

    /** زر «الطعن بالقرار» — زجاجي بنفسجي */
    const DECISION_BTN_APPEAL_CHALLENGE =
        'w-full rounded-lg border border-purple-500/20 bg-purple-500/10 py-1.5 px-3 text-center text-sm font-semibold text-purple-300 backdrop-blur-sm transition-all duration-200 hover:bg-purple-500/20 focus:outline-none disabled:pointer-events-none disabled:opacity-40';
    /** زر ثانوي — زجاجي محايد */
    const DECISION_BTN_SECONDARY =
        'rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-center text-sm text-gray-300 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 focus:outline-none disabled:pointer-events-none disabled:opacity-40';
    const DECISION_BTN_SECONDARY_WFULL = `w-full ${DECISION_BTN_SECONDARY}`;
    const DECISION_BTN_SECONDARY_FLEX = `min-w-0 flex-1 ${DECISION_BTN_SECONDARY}`;
    /** زر أساسي — بنفسجي (موافقة منفذ، تمييز، …) دون وهج البطاقة الأولى */
    const DECISION_BTN_PRIMARY =
        'rounded-lg bg-purple-700 py-1.5 px-3 text-center text-sm font-medium text-white transition-colors hover:bg-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/35 disabled:pointer-events-none disabled:opacity-40';
    const DECISION_BTN_PRIMARY_WFULL = `w-full ${DECISION_BTN_PRIMARY}`;
    const DECISION_BTN_PRIMARY_FLEX = `min-w-0 flex-1 ${DECISION_BTN_PRIMARY}`;

    /** أزرار اختيار مقدّم الطعن — نفس الـ classNames في تبويب الطعون والقرارات السابقة */
    const renderAppealInitialButtons = (
        decision: Decision,
        opts?: { lockedBecauseActiveCopy?: boolean }
    ) => {
        const locked = Boolean(opts?.lockedBecauseActiveCopy);
        const inner =
            decision.appealRequestOrigin === 'executor_side' ? (
                <>
                    <button
                        type="button"
                        disabled={locked}
                        onClick={() => commitExecutorSideAppealPath(decision, 'creditor')}
                        className={DECISION_BTN_APPEAL_CHALLENGE}
                    >
                        الطعن بالقرار
                    </button>
                    <button
                        type="button"
                        onClick={() => commitExecutorSideAppealPath(decision, 'debtor')}
                        className="text-center italic text-blue-400 text-sm my-2 cursor-pointer select-none bg-transparent border-0 outline-none"
                    >
                        قام المدين بالطعن بالقرار
                    </button>
                </>
            ) : appealEntryShowsDebtorFirst(decision) ? (
                <button
                    type="button"
                    onClick={() => setAppealActorDraftById((p) => ({ ...p, [decision.id]: 'debtor' }))}
                    className="text-center italic text-blue-400 text-sm my-2 cursor-pointer select-none bg-transparent border-0 outline-none"
                >
                    قام المدين بالطعن بالقرار
                </button>
            ) : (
                <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                        setAppealActorDraftById((p) => ({ ...p, [decision.id]: 'lawyer' }));
                    }}
                    className={DECISION_BTN_APPEAL_CHALLENGE}
                >
                    الطعن بالقرار
                </button>
            );
        const grid = <div className="flex flex-col gap-2">{inner}</div>;
        return grid;
    };

    /** اختيار تظلم / تمييز بعد تحديد المُطعّن — نفس الـ classNames في الموضعين */
    const renderAppealTadhallumTamyeezDraft = (
        decision: Decision,
        actorDraft: 'lawyer' | 'debtor',
        windows: AppealDeadlineWindows,
        opts?: { pathLockedOnOriginal?: boolean }
    ) => {
        const pathLocked = Boolean(opts?.pathLockedOnOriginal);
        const panel = (
            <div className="space-y-2">
                <p className="text-[10px] text-slate-400 text-right">
                    اختر طريقة الطعن ({actorDraft === 'debtor' ? 'المدين' : 'وكيل الدائن'})
                </p>
                <div className="flex flex-row-reverse flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={!windows.canTadhallum || pathLocked}
                        onClick={() =>
                            transitionAppealWorkflow(
                            decision,
                            {
                                noAppealChosen: false,
                                appealActor: actorDraft,
                                appealMethod: 'tadhallum',
                                appealWorkflowState:
                                    actorDraft === 'debtor'
                                        ? 'PENDING_APPEAL_DEBTOR'
                                        : 'PENDING_APPEAL_LAWYER',
                                appealStatus: 'tadhallum_filed',
                                appealPhase: 'grievance',
                            },
                            'تسجيل تظلم',
                            `تم تسجيل ${actorDraft === 'debtor' ? 'تظلم المدين' : 'تظلم وكيل الدائن'} على القرار.`,
                            'amber'
                        )
                    }
                        className={DECISION_BTN_PRIMARY_FLEX}
                    >
                        تظلم
                    </button>
                    <button
                        type="button"
                        disabled={!windows.canTamyeez || pathLocked}
                        onClick={() =>
                            transitionAppealWorkflow(
                            decision,
                            {
                                noAppealChosen: false,
                                appealActor: actorDraft,
                                appealMethod: 'tamyeez',
                                appealWorkflowState:
                                    actorDraft === 'debtor'
                                        ? 'PENDING_APPEAL_DEBTOR'
                                        : 'PENDING_APPEAL_LAWYER',
                                appealStatus: 'tamyeez_filed',
                                appealPhase: 'cassation',
                            },
                            'تسجيل تمييز',
                            `تم تسجيل ${actorDraft === 'debtor' ? 'تمييز المدين' : 'تمييز وكيل الدائن'} على القرار.`,
                            'amber'
                        )
                    }
                        className={DECISION_BTN_PRIMARY_FLEX}
                    >
                        تمييز
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => setAppealActorDraftById((p) => ({ ...p, [decision.id]: null }))}
                    className="w-full py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-300"
                >
                    إلغاء
                </button>
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
                    رد اللائحة
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
        const rejectTimelineBody =
            variant === 'appealsTab'
                ? 'تم رد التظلم أمام المنفذ. يمكن لصاحب الشأن التمييز مباشرة ضمن المهلة.'
                : 'تم رد التظلم أمام المنفذ. يمكن لصاحب الشأن التمييز ضمن المهلة.';
        return (
            <div className={rowClass}>
                <button
                    type="button"
                    onClick={() =>
                        transitionAppealWorkflow(
                            decision,
                            {
                                appealWorkflowState: 'NONE',
                                appealStatus: 'pending',
                                appealResult: undefined,
                                appealPhase: null,
                                grievanceRejectedAwaitingTamyeez: false,
                                grievanceAcceptedAwaitingDebtorTamyeez: false,
                                awaitingCassationEntryBy:
                                    decision.appealActor === 'debtor' ? 'lawyer' : 'debtor',
                                appealMethod: null,
                                noAppealChosen: false,
                            },
                            'قبول التظلم',
                            decision.appealActor === 'debtor'
                                ? 'قُبل تظلم المدين. يتاح لوكيل الدائن تمييز القرار.'
                                : 'قُبل تظلم وكيل الدائن. يتاح للمدين تمييز القرار.',
                            'emerald'
                        )
                    }
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/35 disabled:pointer-events-none disabled:opacity-40"
                >
                    قبول التظلم
                </button>
                <button
                    type="button"
                    onClick={() =>
                        transitionAppealWorkflow(
                            decision,
                            {
                                appealWorkflowState: 'NONE',
                                appealStatus: 'pending',
                                appealResult: undefined,
                                appealPhase: null,
                                grievanceRejectedAwaitingTamyeez: false,
                                grievanceAcceptedAwaitingDebtorTamyeez: false,
                                awaitingCassationEntryBy: decision.appealActor ?? null,
                                appealMethod: null,
                                noAppealChosen: false,
                            },
                            'رد التظلم',
                            rejectTimelineBody,
                            'rose'
                        )
                    }
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 disabled:pointer-events-none disabled:opacity-40"
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
        return (
            <>
                {decision.awaitingCassationEntryBy === 'debtor' &&
                    decision.appealStatus !== 'tamyeez_filed' &&
                    !appealWindowClosed && (
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
                                    },
                                    'قام المدين بتمييز القرار',
                                    'سُجِّل تمييز المدين على قرار المنفذ.',
                                    'amber'
                                )
                            }
                            className="text-center italic text-blue-400 text-sm my-2 cursor-pointer select-none bg-transparent border-0 outline-none"
                        >
                            قام المدين بتمييز القرار
                        </button>
                    )}
                {decision.awaitingCassationEntryBy === 'lawyer' &&
                    decision.appealStatus !== 'tamyeez_filed' &&
                    !appealWindowClosed && (
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
                                    },
                                    'تمييز القرار',
                                    'سُجِّل تمييز وكيل الدائن على قرار المنفذ.',
                                    'amber'
                                )
                            }
                            className={lawyerBtnClass}
                        >
                            تمييز القرار
                        </button>
                    )}
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
        const cassationNumberOptional =
            decision.appealRequestOrigin === 'debtor_side' || decision.appealActor === 'debtor';
        return (
            <div className={outerClass}>
                {/* القسم العلوي: حفظ رقم التمييز */}
                <label className="block text-[11px] text-slate-400 text-right">
                    رقم التمييز
                    {cassationNumberOptional ? (
                        <span className="text-slate-500 mr-1">(اختياري)</span>
                    ) : null}
                </label>
                <div className="flex gap-2 items-center">
                    {showNumberSavedRow ? (
                        <button
                            type="button"
                            onClick={() => setTamyeezEditOpenById((p) => ({ ...p, [decision.id]: true }))}
                            className="w-full rounded-lg bg-purple-700 py-1.5 px-3 text-center text-sm font-medium text-white transition-colors hover:bg-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/35 disabled:pointer-events-none disabled:opacity-40"
                        >
                            {editLabel}
                        </button>
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
                                className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                            >
                                حفظ
                            </button>
                        </>
                    )}
                </div>
                {/* فاصل بصري — يظهر فقط بعد حفظ الرقم */}
                {showNumberSavedRow ? <hr className="my-4 border-gray-600" /> : null}
                {/* القسم السفلي: أزرار القرار الحاسمة — تظهر فقط بعد حفظ الرقم */}
                {showNumberSavedRow ? (
                    <div className="flex justify-end gap-3">
                        <DecisionHintTooltip label={cassTips.rad}>
                            <button
                                type="button"
                                onClick={() => applyCassationCourtDecision(decision, 'rad_laheeza')}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 disabled:pointer-events-none disabled:opacity-40"
                            >
                                رد اللائحة
                            </button>
                        </DecisionHintTooltip>
                        <DecisionHintTooltip label={cassTips.naqd}>
                            <button
                                type="button"
                                onClick={() => applyCassationCourtDecision(decision, 'naqd')}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/35 disabled:pointer-events-none disabled:opacity-40"
                            >
                                نقض القرار
                            </button>
                        </DecisionHintTooltip>
                    </div>
                ) : null}
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
            pipeline.grievanceRejectedAwaitingTamyeez === true;
        const appealTrackVisual =
            ap === 'grievance' ||
            ap === 'cassation' ||
            pipeline.appealStatus === 'tadhallum_filed' ||
            pipeline.appealStatus === 'tamyeez_filed';

        const effOutcome = effectiveExecutorOutcomeForCreditorHubPill(decision, pipeline);

        const statusPillEl = (() => {
            if (appealTrackVisual && !appealWindowClosed) {
                const smartLabel = appealTrackSmartPillLabel(
                    awaitingTamyeezAfterGrievance,
                    ap,
                    pipeline.appealStatus
                );
                return (
                    <button
                        type="button"
                        onClick={() => setAppealDetailDecision(decision)}
                        className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[9px] font-bold text-violet-300 transition-colors hover:border-violet-500/35 hover:bg-violet-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35"
                    >
                        {smartLabel}
                    </button>
                );
            }
            if (requestNeedsExecutorOutcome(decision)) {
                return (
                    <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-0.5 text-[9px] font-bold text-yellow-400">
                        بانتظار القرار
                    </span>
                );
            }
            const phys = decision.executorOutcome;
            const creditorFacingMinf =
                decision.appealRequestOrigin === 'creditor_side' &&
                (pipeline.appealWorkflowState === 'REVOKED_BY_APPEAL' ||
                    pipeline.appealResult === 'نقض القرار' ||
                    ((phys === 'approved' || phys === 'alternative') && effOutcome === 'rejected'));

            if (creditorFacingMinf) {
                return (
                    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[9px] font-bold text-red-400">
                        رفض المنفذ
                    </span>
                );
            }
            if (phys === 'rejected' || effOutcome === 'rejected') {
                return (
                    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[9px] font-bold text-red-400">
                        رفض المنفذ
                    </span>
                );
            }
            if (phys === 'approved' || phys === 'alternative') {
                return (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                        {decisionsHubTab === 'previous' ? 'قرار قبول' : 'قبول المنفذ'}
                    </span>
                );
            }
            if (deadlineMeta.isFinal && decision.appealStatus === 'pending') {
                return (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[9px] font-bold text-slate-200">
                        درجة قطعية
                    </span>
                );
            }
            return null;
        })();

        return { statusPillEl, appealTrackVisual, awaitingTamyeezAfterGrievance, ap };
    }, [decisionsHubTab, getAppealStatus, requestNeedsExecutorOutcome]);

    const decisionCardProps = {
        decisions,
        decisionsHubTab,
        dispatcherHub,
        executionId,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        appealActorDraftById,
        hubNoteById,
        setHubNoteById,
        handleExecutorResolveById,
        goToAppealsWithScroll,
        canShowAppealInitialForDecision,
        renderAppealInitialButtons,
        renderAppealTadhallumTamyeezDraft,
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
        requestNeedsExecutorOutcome,
        appealActorDraftById,
        buildDecisionCardStatus,
        canShowAppealInitialForDecision,
        renderAppealInitialButtons,
        renderAppealTadhallumTamyeezDraft,
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
                                    {(['all', 'approved', 'rejected', 'active_appeals'] as const).map((f) => (
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
                                            {f === 'all' ? 'الكل' : f === 'approved' ? 'الموافق عليها' : f === 'rejected' ? 'المرفوضة' : 'الطعون النشطة'}
                                        </button>
                                    ))}
                                </div>
                                {archiveSettledDecisions.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="border-b border-white/10 pb-2 text-right text-[11px] font-bold text-gray-400">
                                            القرارات المحسومة
                                        </p>
                                        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                            {archiveSettledDecisions.filter((d) => {
                                                if (previousFilter === 'all') return true;
                                                if (previousFilter === 'approved') return d.executorOutcome === 'approved' || d.executorOutcome === 'alternative';
                                                if (previousFilter === 'rejected') return d.executorOutcome === 'rejected';
                                                if (previousFilter === 'active_appeals') {
                                                    return d.appealPhase === 'grievance' || d.appealPhase === 'cassation' ||
                                                        d.appealStatus === 'tadhallum_filed' || d.appealStatus === 'tamyeez_filed' ||
                                                        Boolean(d.awaitingCassationEntryBy) ||
                                                        Boolean(d.grievanceRejectedAwaitingTamyeez) ||
                                                        Boolean(d.grievanceAcceptedAwaitingDebtorTamyeez) ||
                                                        Boolean(d.activeAppealCopyId);
                                                }
                                                return true;
                                            }).map((d) => (
                                                <DecisionCard key={d.id} decision={d} {...decisionCardProps} />
                                            ))}
                                        </div>
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
                                {appealsHubDecisions.length > 0 ? (
                                    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                        {appealsHubDecisions.map((d) => (
                                            <AppealWorkflowCard key={d.id} decision={d} {...appealWorkflowCardProps} />
                                        ))}
                                    </div>
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
                                    if (e.target === e.currentTarget) setShowAddModal(false);
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
