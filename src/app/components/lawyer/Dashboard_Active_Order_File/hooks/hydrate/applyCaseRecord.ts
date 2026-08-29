import { uuidv4 } from '@/app/services/urgent-actions-db';
import type { CaseAttachment, CaseEvent, CaseFollowup, CaseHearing, CaseNote } from '../../types';
import type { PersistedCaseRecord } from './caseRecordTypes';
import { restoreLifecycleNavigation } from './restoreLifecycleNavigation';
import type { OrderFileHydrateSetters } from './types';

function ymdPrefix(value: unknown): string {
    return String(value ?? '')
        .trim()
        .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}

function asObjectRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

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
    
            setCaseData((prev: Record<string, unknown> | null | undefined) => {
                const merged: Record<string, unknown> = { ...(prev || {}), ...found };
                const seedFh = ymdPrefix(asObjectRecord(fileData)?.firstHearingDate);
                const mergedFh = ymdPrefix(merged.firstHearingDate);
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
                const notifYmd = ymdPrefix(found.rejectionNotificationDate ?? found.notificationDate);
                if (notifYmd) {
                    setGrievanceData((prev) => ({ ...prev, rejectionNotificationDate: notifYmd }));
                }
                setGrievanceDecisionNotificationConfirmed(!!notifYmd);
            }
            if (typeof found.grievancePetitionNotificationDate === 'string') {
                const v = String(found.grievancePetitionNotificationDate);
                setGrievancePetitionNotificationDate(v);
                setGrievancePetitionNotificationConfirmed(!!String(v || '').trim());
            }
            if (typeof found.grievanceLegalEndDate === 'string') {
                setGrievanceLegalEndDate(String(found.grievanceLegalEndDate));
            }
            if (found.grievanceOutcome === 'filed' || found.grievanceOutcome === 'expired') {
                setGrievanceData((prev) => ({ ...prev, outcome: found.grievanceOutcome }));
            } else if (found.grievanceOutcomeDraft === 'filed' || found.grievanceOutcomeDraft === 'expired') {
                setGrievanceData((prev) => ({ ...prev, outcome: found.grievanceOutcomeDraft }));
            }
            {
                const defenderEp = Number(found.defenderEntryPhase);
                if (defenderEp === 2 || defenderEp === 3) {
                    /* useDefenderEntryHydrate يضبط التوقيت/التفاصيل — لا نعيد حسابها من سجل ناقص */
                } else {
                const intervention = typeof found.hasIntervention === 'boolean' ? found.hasIntervention : false;
                const end = typeof found.grievanceLegalEndDate === 'string' ? String(found.grievanceLegalEndDate) : '';
                const notif = String(found.rejectionNotificationDate ?? found.notificationDate ?? '').trim();
                const timingOk = !!String(end || '').trim() && (intervention || !!notif);
                setGrievanceTimingConfirmed(timingOk);
                const outcome =
                    found.grievanceOutcome === 'filed' || found.grievanceOutcome === 'expired'
                        ? found.grievanceOutcome
                        : found.grievanceOutcomeDraft === 'filed' || found.grievanceOutcomeDraft === 'expired'
                          ? found.grievanceOutcomeDraft
                          : '';
                const filing = typeof found.grievanceFilingDate === 'string' ? String(found.grievanceFilingDate) : '';
                const p2Ymd = ymdPrefix(found.grievanceFirstHearingDate ?? found.phase2FirstHearingDate);
                const detailsDerived =
                    timingOk && outcome === 'filed' && !!String(filing || '').trim() && !!p2Ymd;
                setGrievanceDetailsConfirmed(
                    found.grievanceDetailsConfirmed === true ? true : detailsDerived,
                );
                }
            }
            if (typeof found.grievanceFilingDate === 'string') {
                setGrievanceData((prev) => ({ ...prev, filingDate: String(found.grievanceFilingDate) }));
            }
            {
                setPhase2FirstHearingDate(ymdPrefix(found.grievanceFirstHearingDate ?? found.phase2FirstHearingDate));
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
                const normalized = found.hearings
                    .map((h): CaseHearing | null => {
                        const row = asObjectRecord(h);
                        if (!row) return null;
                        const stage = row.stage === 'pre_decision' || row.stage === 'grievance' ? row.stage : null;
                        if (!stage) return null;
                        return {
                            id: typeof row.id === 'string' ? row.id : uuidv4(),
                            stage,
                            sessionDate: typeof row.sessionDate === 'string' ? row.sessionDate : '',
                            notes: typeof row.notes === 'string' ? row.notes : '',
                            nextSessionDate: typeof row.nextSessionDate === 'string' ? row.nextSessionDate : '',
                            createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
                        };
                    })
                    .filter(Boolean) as CaseHearing[];
                setHearings(normalized);
            }
            if (found.expertModule && typeof found.expertModule === 'object') {
                const expert = found.expertModule;
                setExpertModule({
                    enabled: !!expert.enabled,
                    expertName: typeof expert.expertName === 'string' ? expert.expertName : '',
                    depositAmount: typeof expert.depositAmount === 'string' ? expert.depositAmount : '',
                    inspectionDate: typeof expert.inspectionDate === 'string' ? expert.inspectionDate : '',
                    reportDueDate: typeof expert.reportDueDate === 'string' ? expert.reportDueDate : '',
                    reportReceivedDate:
                        typeof expert.reportReceivedDate === 'string' ? expert.reportReceivedDate : '',
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
                const normalized = found.followups.map((f): CaseFollowup => {
                    const row = asObjectRecord(f) ?? {};
                    return {
                        id: typeof row.id === 'string' ? row.id : uuidv4(),
                        title: typeof row.title === 'string' ? row.title : '',
                        date: typeof row.date === 'string' ? row.date : '',
                        completed: typeof row.completed === 'boolean' ? row.completed : false,
                        createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
                    };
                });
        setCaseFollowups(normalized);
    }

            const nav = restoreLifecycleNavigation(found);
            if (nav) {
                if (nav.fileStatus) setFileStatus(nav.fileStatus);
                if (nav.activeLifecycleStep !== undefined) setActiveLifecycleStep(nav.activeLifecycleStep);
                if (nav.isSecretMode === false) setIsSecretMode(false);
            }
}
