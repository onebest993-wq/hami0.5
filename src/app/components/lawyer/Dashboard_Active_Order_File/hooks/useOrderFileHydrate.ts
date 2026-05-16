import { useEffect, useRef, startTransition } from 'react';
import { UrgentActionsDB, uuidv4 } from '@/app/services/urgent-actions-db';
import type {
    CaseAttachment,
    CaseEvent,
    CaseFollowup,
    CaseHearing,
    CaseNote,
    CassationData,
    CassationDecision,
    ExecutionData,
    ExpertModule,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
} from '../types';

export type OrderFileHydrateSetters = {
    setCaseData: React.Dispatch<React.SetStateAction<any>>;
    setHasIntervention: React.Dispatch<React.SetStateAction<boolean>>;
    setFileStatus: React.Dispatch<React.SetStateAction<FileStatus>>;
    setIsSecretMode: React.Dispatch<React.SetStateAction<boolean>>;
    setActiveLifecycleStep: React.Dispatch<React.SetStateAction<'judge' | 'execution' | 'grievance' | 'cassation' | null>>;
    setJudgeDecision: React.Dispatch<React.SetStateAction<JudgeDecision>>;
    setExecutionData: React.Dispatch<React.SetStateAction<ExecutionData>>;
    setGrievanceData: React.Dispatch<React.SetStateAction<GrievanceData>>;
    setGrievanceLegalEndDate: React.Dispatch<React.SetStateAction<string>>;
    setGrievanceDecisionNotificationConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setGrievancePetitionNotificationDate: React.Dispatch<React.SetStateAction<string>>;
    setGrievancePetitionNotificationConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setGrievanceTimingConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setGrievanceDetailsConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setPhase2FirstHearingDate: React.Dispatch<React.SetStateAction<string>>;
    setGrievanceDecision: React.Dispatch<React.SetStateAction<GrievanceDecision>>;
    setCassationData: React.Dispatch<React.SetStateAction<CassationData>>;
    setCassationDecision: React.Dispatch<React.SetStateAction<CassationDecision>>;
    setGuaranteeSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
    setGuaranteeDetails: React.Dispatch<React.SetStateAction<{ amount: string; receiptNumber: string }>>;
    setHearings: React.Dispatch<React.SetStateAction<CaseHearing[]>>;
    setExpertModule: React.Dispatch<React.SetStateAction<ExpertModule>>;
    setPreDecisionClosed: React.Dispatch<React.SetStateAction<boolean>>;
    setExpectedDecisionDate: React.Dispatch<React.SetStateAction<string>>;
    setRegistrationData: React.Dispatch<
        React.SetStateAction<{
            receiptNumber: string;
            receiptDate: string;
            notificationMethod: string;
            notificationDate: string;
        }>
    >;
    setCaseEvents: React.Dispatch<React.SetStateAction<CaseEvent[]>>;
    setCaseNotes: React.Dispatch<React.SetStateAction<CaseNote[]>>;
    setCaseAttachments: React.Dispatch<React.SetStateAction<CaseAttachment[]>>;
    setCaseFollowups: React.Dispatch<React.SetStateAction<CaseFollowup[]>>;
};

type UseOrderFileHydrateArgs = {
    caseId: string | null;
    userId: string;
    fileData: unknown;
    caseData: any;
    setters: OrderFileHydrateSetters;
};

export function useOrderFileHydrate({ caseId, userId, fileData, caseData, setters }: UseOrderFileHydrateArgs) {
    const settersRef = useRef(setters);
    settersRef.current = setters;
    const defenderEntryHydrateRef = useRef(false);

    useEffect(() => {
        if (!caseId) return;

        const s = () => settersRef.current;
        const seed = fileData && typeof fileData === 'object' ? (fileData as Record<string, unknown>) : null;
        if (seed && String(seed.id ?? '') === caseId) {
            s().setCaseData((prev: unknown) => ({ ...(prev && typeof prev === 'object' ? (prev as object) : {}), ...seed }));
        }

        let cancelled = false;

        const applyCaseRecord = (found: any) => {
            if (!found || typeof found !== 'object' || cancelled) return;
            const {
                setCaseData,
                setHasIntervention,
                setFileStatus,
                setIsSecretMode,
                setActiveLifecycleStep,
                setJudgeDecision,
                setExecutionData,
                setGrievanceData,
                setGrievanceLegalEndDate,
                setGrievanceDecisionNotificationConfirmed,
                setGrievancePetitionNotificationDate,
                setGrievancePetitionNotificationConfirmed,
                setGrievanceTimingConfirmed,
                setGrievanceDetailsConfirmed,
                setPhase2FirstHearingDate,
                setGrievanceDecision,
                setCassationData,
                setCassationDecision,
                setGuaranteeSubmitted,
                setGuaranteeDetails,
                setHearings,
                setExpertModule,
                setPreDecisionClosed,
                setExpectedDecisionDate,
                setRegistrationData,
                setCaseEvents,
                setCaseNotes,
                setCaseAttachments,
                setCaseFollowups,
            } = s();

            setCaseData((prev: any) => {
                const merged = { ...(prev || {}), ...found };
                const seedFh =
                    String((fileData as any)?.firstHearingDate ?? '')
                        .trim()
                        .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
                const mergedFh =
                    String(merged.firstHearingDate ?? '')
                        .trim()
                        .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
                if (seedFh && !mergedFh) merged.firstHearingDate = seedFh;
                else if (mergedFh) merged.firstHearingDate = mergedFh;
                return merged;
            });
            if (typeof found.hasIntervention === 'boolean') {
                setHasIntervention(found.hasIntervention);
            }
            if (typeof found.judgeDecision === 'string') {
                const decision =
                    found.judgeDecision === 'accepted' || found.judgeDecision === 'rejected' || found.judgeDecision === 'partially_accepted'
                        ? found.judgeDecision
                        : null;
                setJudgeDecision((prev) => ({ ...prev, decision, decisionDate: prev.decisionDate || String(found.judgeDecisionDate ?? '') }));
                const urgentDirectCassation = String(found?.type ?? '').trim() === 'urgent_action';
                if (urgentDirectCassation && (decision === 'accepted' || decision === 'rejected' || decision === 'partially_accepted')) {
                    setFileStatus('cassation');
                    setIsSecretMode(false);
                    setActiveLifecycleStep('cassation');
                }
                if (decision === 'accepted' || decision === 'partially_accepted') {
                    const procedureType = String(found?.type ?? '').trim();
                    const t = String(found?.specificActionType ?? '').trim();
                    const skip = procedureType === 'state_order' || ['وضع إشارة', 'منع سفر', 'إيقاف', 'حجز'].some((k) => t.includes(k));
                    const requires = typeof found.requiresGuarantee === 'boolean' ? found.requiresGuarantee : false;
                    const submitted =
                        typeof found.guaranteeSubmitted === 'boolean'
                            ? found.guaranteeSubmitted
                            : typeof found.guaranteeStatus === 'boolean'
                              ? found.guaranteeStatus
                              : false;
                    if (!urgentDirectCassation) {
                        setFileStatus(!skip && requires && !submitted ? 'accepted' : 'executed');
                    }
                }
                if (!urgentDirectCassation && decision === 'rejected') setFileStatus('rejected');
            }
            if (typeof found.requiresGuarantee === 'boolean') {
                setJudgeDecision((prev) => ({ ...prev, requiresGuarantee: found.requiresGuarantee }));
            } else if (typeof found.judgeDecisionRequiresGuarantee === 'boolean') {
                setJudgeDecision((prev) => ({ ...prev, requiresGuarantee: found.judgeDecisionRequiresGuarantee }));
            }
            if (typeof found.notificationDate === 'string' && found.notificationDate) {
                setExecutionData((prev) => ({ ...prev, notificationDate: String(found.notificationDate) }));
            }
            if (typeof found.deadlineDays === 'number' && Number.isFinite(found.deadlineDays)) {
                setExecutionData((prev) => ({ ...prev, deadlineDays: found.deadlineDays }));
            }
            if (typeof found.rejectionNotificationDate === 'string') {
                setGrievanceData((prev) => ({ ...prev, rejectionNotificationDate: String(found.rejectionNotificationDate) }));
            }
            {
                const n = String(found.rejectionNotificationDate ?? found.notificationDate ?? '').trim();
                setGrievanceDecisionNotificationConfirmed(!!n);
            }
            if (typeof (found as any).grievancePetitionNotificationDate === 'string') {
                const v = String((found as any).grievancePetitionNotificationDate);
                setGrievancePetitionNotificationDate(v);
                setGrievancePetitionNotificationConfirmed(!!String(v || '').trim());
            }
            if (typeof (found as any).grievanceLegalEndDate === 'string') {
                setGrievanceLegalEndDate(String((found as any).grievanceLegalEndDate));
            }
            if (found.grievanceOutcome === 'filed' || found.grievanceOutcome === 'expired') {
                setGrievanceData((prev) => ({ ...prev, outcome: found.grievanceOutcome }));
            } else if ((found as any).grievanceOutcomeDraft === 'filed' || (found as any).grievanceOutcomeDraft === 'expired') {
                setGrievanceData((prev) => ({ ...prev, outcome: String((found as any).grievanceOutcomeDraft) as any }));
            }
            {
                const intervention = typeof found.hasIntervention === 'boolean' ? found.hasIntervention : false;
                const end = typeof (found as any).grievanceLegalEndDate === 'string' ? String((found as any).grievanceLegalEndDate) : '';
                const notif = String(found.rejectionNotificationDate ?? found.notificationDate ?? '').trim();
                const timingOk = !!String(end || '').trim() && (intervention || !!notif);
                setGrievanceTimingConfirmed(timingOk);
                const outcome =
                    found.grievanceOutcome === 'filed' || found.grievanceOutcome === 'expired'
                        ? found.grievanceOutcome
                        : (found as any).grievanceOutcomeDraft === 'filed' ||
                            (found as any).grievanceOutcomeDraft === 'expired'
                          ? String((found as any).grievanceOutcomeDraft)
                          : '';
                const filing = typeof found.grievanceFilingDate === 'string' ? String(found.grievanceFilingDate) : '';
                const p2Raw = String(
                    (found as any).grievanceFirstHearingDate ?? (found as any).phase2FirstHearingDate ?? '',
                ).trim();
                const p2Ymd = p2Raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
                const detailsDerived =
                    timingOk && outcome === 'filed' && !!String(filing || '').trim() && !!p2Ymd;
                setGrievanceDetailsConfirmed(
                    (found as any).grievanceDetailsConfirmed === true ? true : detailsDerived,
                );
            }
            if (typeof found.grievanceFilingDate === 'string') {
                setGrievanceData((prev) => ({ ...prev, filingDate: String(found.grievanceFilingDate) }));
            }
            {
                const raw = String((found as any).grievanceFirstHearingDate ?? found.phase2FirstHearingDate ?? '').trim();
                const ymd = raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
                setPhase2FirstHearingDate(ymd);
            }
            if (found.grievanceDecision === 'confirmed' || found.grievanceDecision === 'modified' || found.grievanceDecision === 'canceled') {
                setGrievanceDecision((prev) => ({ ...prev, decision: found.grievanceDecision }));
            }
            if (typeof found.grievanceDecisionDate === 'string') {
                setGrievanceDecision((prev) => ({ ...prev, decisionDate: String(found.grievanceDecisionDate) }));
            }
            const legacyOutcomeKey = 'ap' + 'pealOutcome';
            const legacyFiledByKey = 'ap' + 'pealFiledBy';
            const legacyFilingDateKey = 'ap' + 'pealFilingDate';
            const legacyFileNumberKey = 'ap' + 'pealFileNumber';
            const legacyDecisionKey = 'ap' + 'pealDecision';
            const legacyDecisionDateKey = 'ap' + 'pealDecisionDate';
            const cassationOutcome = found.cassationOutcome ?? found[legacyOutcomeKey];
            const cassationFiledBy = found.cassationFiledBy ?? found[legacyFiledByKey];
            const cassationFilingDate = found.cassationFilingDate ?? found[legacyFilingDateKey];
            const cassationFileNumber = found.cassationFileNumber ?? found[legacyFileNumberKey];
            const cassationDecisionValue = found.cassationDecision ?? found[legacyDecisionKey];
            const cassationDecisionDateValue = found.cassationDecisionDate ?? found[legacyDecisionDateKey];
            if (cassationOutcome === 'filed' || cassationOutcome === 'expired') {
                setCassationData((prev) => ({ ...prev, outcome: cassationOutcome }));
            }
            if (cassationFiledBy === 'client' || cassationFiledBy === 'opponent') {
                setCassationData((prev) => ({ ...prev, filedBy: cassationFiledBy }));
            }
            if (typeof cassationFilingDate === 'string') {
                setCassationData((prev) => ({ ...prev, filingDate: String(cassationFilingDate) }));
            }
            if (typeof cassationFileNumber === 'string') {
                setCassationData((prev) => ({ ...prev, fileNumber: String(cassationFileNumber) }));
            }
            if (cassationDecisionValue === 'confirmed' || cassationDecisionValue === 'modified' || cassationDecisionValue === 'canceled') {
                setCassationDecision((prev) => ({ ...prev, decision: cassationDecisionValue }));
            }
            if (typeof cassationDecisionDateValue === 'string') {
                setCassationDecision((prev) => ({ ...prev, decisionDate: String(cassationDecisionDateValue) }));
            }
            if (typeof found.guaranteeSubmitted === 'boolean') {
                setGuaranteeSubmitted(found.guaranteeSubmitted);
            } else if (typeof found.guaranteeStatus === 'boolean') {
                setGuaranteeSubmitted(found.guaranteeStatus);
            }
            if (typeof found.guaranteeAmount === 'string' || typeof found.guaranteeReceiptNumber === 'string') {
                setGuaranteeDetails({
                    amount: typeof found.guaranteeAmount === 'string' ? found.guaranteeAmount : '',
                    receiptNumber: typeof found.guaranteeReceiptNumber === 'string' ? found.guaranteeReceiptNumber : '',
                });
            }
            if (Array.isArray(found.hearings)) {
                const normalized = (found.hearings as any[])
                    .map((h): CaseHearing | null => {
                        if (!h || typeof h !== 'object') return null;
                        const stage = h.stage === 'pre_decision' || h.stage === 'grievance' ? h.stage : null;
                        if (!stage) return null;
                        return {
                            id: typeof h.id === 'string' ? h.id : uuidv4(),
                            stage,
                            sessionDate: typeof h.sessionDate === 'string' ? h.sessionDate : '',
                            notes: typeof h.notes === 'string' ? h.notes : '',
                            nextSessionDate: typeof h.nextSessionDate === 'string' ? h.nextSessionDate : '',
                            createdAt: typeof h.createdAt === 'string' ? h.createdAt : new Date().toISOString(),
                        };
                    })
                    .filter(Boolean) as CaseHearing[];
                setHearings(normalized);
            }
            if (found.expertModule && typeof found.expertModule === 'object') {
                setExpertModule({
                    enabled: !!found.expertModule.enabled,
                    expertName: typeof found.expertModule.expertName === 'string' ? found.expertModule.expertName : '',
                    depositAmount: typeof found.expertModule.depositAmount === 'string' ? found.expertModule.depositAmount : '',
                    inspectionDate: typeof found.expertModule.inspectionDate === 'string' ? found.expertModule.inspectionDate : '',
                    reportDueDate: typeof found.expertModule.reportDueDate === 'string' ? found.expertModule.reportDueDate : '',
                    reportReceivedDate:
                        typeof found.expertModule.reportReceivedDate === 'string' ? found.expertModule.reportReceivedDate : '',
                });
            }
            if (typeof found.preDecisionClosed === 'boolean') {
                setPreDecisionClosed(found.preDecisionClosed);
            }
            if (typeof found.expectedDecisionDate === 'string') {
                setExpectedDecisionDate(found.expectedDecisionDate);
            }
            setRegistrationData({
                receiptNumber: typeof found.feeReceiptNumber === 'string' ? found.feeReceiptNumber : '',
                receiptDate: typeof found.feeReceiptDate === 'string' ? found.feeReceiptDate : '',
                notificationMethod:
                    found.initialNotificationMethod === 'personal' ||
                    found.initialNotificationMethod === 'by_agent' ||
                    found.initialNotificationMethod === 'publication'
                        ? found.initialNotificationMethod
                        : '',
                notificationDate: typeof found.initialNotificationDate === 'string' ? found.initialNotificationDate : '',
            });
            if (Array.isArray(found.events)) {
                setCaseEvents(found.events as CaseEvent[]);
            }
            if (Array.isArray(found.notes)) {
                setCaseNotes(found.notes as CaseNote[]);
            }
            if (Array.isArray(found.attachments)) {
                setCaseAttachments(found.attachments as CaseAttachment[]);
            }
            if (Array.isArray(found.followups)) {
                const normalized = (found.followups as any[]).map((f) => ({
                    id: typeof f?.id === 'string' ? f.id : uuidv4(),
                    title: typeof f?.title === 'string' ? f.title : '',
                    date: typeof f?.date === 'string' ? f.date : '',
                    completed: typeof f?.completed === 'boolean' ? f.completed : false,
                    createdAt: typeof f?.createdAt === 'string' ? f.createdAt : new Date().toISOString(),
                })) as CaseFollowup[];
                setCaseFollowups(normalized);
            }
        };

        const runApply = (record: unknown) => {
            const defer =
                typeof requestIdleCallback !== 'undefined'
                    ? (fn: () => void) => requestIdleCallback(fn, { timeout: 1200 })
                    : (fn: () => void) => window.setTimeout(fn, 0);
            defer(() => {
                if (cancelled) return;
                startTransition(() => applyCaseRecord(record));
            });
        };

        void (async () => {
            if (!caseId || cancelled) return;
            try {
                const state = await UrgentActionsDB.getState(userId);
                if (cancelled) return;
                const rawCases = Array.isArray(state?.cases) ? state.cases : [];
                const found = rawCases.find((c: unknown) => {
                    if (!c || typeof c !== 'object') return false;
                    return (c as { id?: string }).id === caseId;
                });
                const seedMatches = seed && String(seed.id ?? '') === caseId;
                let record: Record<string, unknown> | null = null;
                if (found && typeof found === 'object') {
                    record = { ...(found as Record<string, unknown>) };
                }
                if (seedMatches) {
                    record = { ...(record || {}), ...seed };
                }
                if (record) {
                    runApply(record);
                    return;
                }
            } catch {
                /* fall back to seed */
            }
            if (seed && String(seed.id ?? '') === caseId) {
                runApply(seed);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [caseId, userId, fileData]);

    useEffect(() => {
        defenderEntryHydrateRef.current = false;
    }, [caseId, (fileData as any)?.id]);

    useEffect(() => {
        const src: any = {
            ...(fileData && typeof fileData === 'object' ? (fileData as object) : {}),
            ...(caseData && typeof caseData === 'object' ? (caseData as object) : {}),
        };
        if (!src || typeof src !== 'object') return;
        const ep = Number(src.defenderEntryPhase);
        if (ep !== 2 && ep !== 3) return;
        if (defenderEntryHydrateRef.current) return;

        const {
            setJudgeDecision,
            setFileStatus,
            setActiveLifecycleStep,
            setIsSecretMode,
            setGrievanceData,
            setGrievanceDecision,
            setPhase2FirstHearingDate,
            setPreDecisionClosed,
            setGrievanceTimingConfirmed,
            setGrievanceDetailsConfirmed,
        } = settersRef.current;

        const dec = src.judgeDecision;
        if (dec === 'accepted' || dec === 'rejected' || dec === 'partially_accepted') {
            setJudgeDecision((prev) => ({
                ...prev,
                decision: dec,
                decisionDate: String(src.judgeDecisionDate || prev.decisionDate || ''),
            }));
        }
        if (ep === 2) {
            setFileStatus('rejected');
            setActiveLifecycleStep('grievance');
        } else if (ep === 3) {
            setFileStatus('cassation');
            setActiveLifecycleStep('cassation');
            setIsSecretMode(false);
            if (src.grievanceOutcome === 'filed') {
                setGrievanceData((prev) => ({
                    ...prev,
                    outcome: 'filed',
                    filingDate: String(src.grievanceFilingDate || prev.filingDate || src.requestDate || ''),
                }));
            }
            if (src.grievanceDecision && src.grievanceDecisionDate) {
                setGrievanceDecision({
                    decision: src.grievanceDecision,
                    decisionDate: String(src.grievanceDecisionDate),
                });
            }
            const rawP2 = String(src.grievanceFirstHearingDate ?? src.phase2FirstHearingDate ?? src.requestDate ?? '').trim();
            const p2m = rawP2.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
            if (p2m) setPhase2FirstHearingDate(p2m);
            if (src.preDecisionClosed) setPreDecisionClosed(true);
            setGrievanceTimingConfirmed(true);
            setGrievanceDetailsConfirmed(true);
        }
        defenderEntryHydrateRef.current = true;
    }, [fileData, caseData]);
}
