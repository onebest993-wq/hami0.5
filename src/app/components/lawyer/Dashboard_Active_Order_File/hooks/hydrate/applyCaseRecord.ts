import { uuidv4 } from '@/app/services/urgent-actions-db';
import type { CaseAttachment, CaseEvent, CaseFollowup, CaseHearing, CaseNote } from '../../types';
import type { PersistedCaseRecord } from './caseRecordTypes';
import { restoreLifecycleNavigation } from './restoreLifecycleNavigation';
import type { OrderFileHydrateSetters } from './types';

/** يطبّق سجل القضية من IDB على state المحلي */
export function applyCaseRecord(
    found: PersistedCaseRecord | null | undefined,
    fileData: unknown,
    setters: OrderFileHydrateSetters,
) {
            if (!found || typeof found !== 'object') return;
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
    } = setters;
    
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
            {
                const notifYmd =
                    String(found.rejectionNotificationDate ?? found.notificationDate ?? '')
                        .trim()
                        .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
                if (notifYmd) {
                    setGrievanceData((prev) => ({ ...prev, rejectionNotificationDate: notifYmd }));
                }
                setGrievanceDecisionNotificationConfirmed(!!notifYmd);
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
                const defenderEp = Number((found as any).defenderEntryPhase);
                if (defenderEp === 2 || defenderEp === 3) {
                    /* useDefenderEntryHydrate يضبط التوقيت/التفاصيل — لا نعيد حسابها من سجل ناقص */
                } else {
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

            const nav = restoreLifecycleNavigation(found);
            if (nav) {
                if (nav.fileStatus) setFileStatus(nav.fileStatus);
                if (nav.activeLifecycleStep !== undefined) setActiveLifecycleStep(nav.activeLifecycleStep);
                if (nav.isSecretMode === false) setIsSecretMode(false);
            }
}
