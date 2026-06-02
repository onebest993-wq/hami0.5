import { useEffect } from 'react';
import { uuidv4 } from '@/app/services/urgent-actions-db';
import { getActiveDate } from '@/app/utils/hearingDates';
import {
    getPreDecisionSessionOutcome,
    isGrievancePleadingClosedSession,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from '../../utils/hearingRules';
import { formatDateText } from '../../utils/formatters';
import { isAdjournReasonValid } from '../../utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from '../../constants/hearingOutcomes';
import type { UseOrderFileLifecycleActionsArgs } from './types';
import type { CaseHearing, ExpertModule } from '../../types';
import { CalendarBridge, partiesSummaryFromList } from '@/app/services/calendarBridge';

export function useHearingLifecycleActions(ctx: UseOrderFileLifecycleActionsArgs) {
    const {
        isFinalized,
        hearings,
        setHearings,
        setPreDecisionClosed,
        hearingDraft,
        setHearingDraft,
        grievanceData,
        expertModule,
        setExpertModule,
        registrationData,
        setRegistrationData,
        pendingRegistrationSyncRef,
        phase2FirstHearingDate,
        setPhase2FirstHearingDate,
        setHearingsError,
        persistAndMerge,
        appendCaseEvent,
        phase1NewSessionMinYmd,
        phase2NewSessionMinYmd,
        caseId,
        caseData,
    } = ctx;

    const updatePhase2FirstHearingDate = (value: string) => {
    if (isFinalized) return;
    const y =
        String(value || '')
            .trim()
            .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
    setPhase2FirstHearingDate(y);
    const p2Active = getActiveDate(
        hearings.filter((h) => h.stage === 'grievance'),
        y,
    );
    persistAndMerge({
        grievanceFirstHearingDate: y || null,
        phase2FirstHearingDate: y || null,
        grievanceSessionDate: p2Active || null,
    });
};

const updateHearings = (next: CaseHearing[]) => {
    setHearings(next);
    const p2Sessions = next.filter((h) => h.stage === 'grievance');
    const p2Active = getActiveDate(p2Sessions, phase2FirstHearingDate);
    persistAndMerge({
        hearings: next,
        grievanceSessionDate: p2Active || null,
    });
};

const updateExpertModule = (patch: Partial<ExpertModule>) => {
    const next = { ...expertModule, ...patch };
    setExpertModule(next);
    persistAndMerge({ expertModule: next });
};

const updateRegistrationData = (
    patch: Partial<{ receiptNumber: string; receiptDate: string; notificationMethod: string; notificationDate: string }>,
) => {
    pendingRegistrationSyncRef.current = true;
    setRegistrationData((prev) => ({ ...prev, ...patch }));
};

    useEffect(() => {
    if (!pendingRegistrationSyncRef.current) return;
    pendingRegistrationSyncRef.current = false;
    const next = registrationData;
    persistAndMerge({
        feeReceiptNumber: next.receiptNumber || null,
        feeReceiptDate: next.receiptDate || null,
        initialNotificationMethod: next.notificationMethod || null,
        initialNotificationDate: next.notificationDate || null,
    });
}, [registrationData]);

    const addHearing = () => {
    if (isFinalized) return;
    setHearingsError(null);
    const preDecisionAlreadyTerminated = hearings.some((h) => {
        if (h.stage !== 'pre_decision') return false;
        const outcome = getPreDecisionSessionOutcome(String(h.notes || ''), h.nextSessionDate);
        return (
            outcome === PRE_DECISION_OUTCOME_CLOSE ||
            outcome === PRE_DECISION_OUTCOME_NULLIFY ||
            outcome === 'إنهاء الطلب'
        );
    });
    if (hearingDraft.stage === 'pre_decision' && preDecisionAlreadyTerminated) {
        setHearingsError('تم إغلاق مسار الجلسات (ختام مرافعة أو إبطال). لا يمكن إضافة جلسات جديدة.');
        return;
    }
    if (!hearingDraft.sessionDate) {
        setHearingsError('يرجى إدخال تاريخ الجلسة');
        return;
    }
    if (hearingDraft.stage === 'grievance') {
        const filing = String(grievanceData.filingDate || '').trim();
        const session = String(hearingDraft.sessionDate || '').trim();
        if (filing && session && session < filing) {
            setHearingsError('⚠️ لا يمكن أن يكون تاريخ جلسة التظلم أقدم من تاريخ تقديم التظلم');
            return;
        }
        const minG = phase2NewSessionMinYmd;
        if (minG && session && session < minG) {
            setHearingsError('⚠️ تاريخ الجلسة يخالف الترتيب الزمني لمرحلة التظلم');
            return;
        }
    }
    if (hearingDraft.stage === 'pre_decision') {
        const session = String(hearingDraft.sessionDate || '').trim();
        const minP = phase1NewSessionMinYmd;
        if (minP && session && session < minP) {
            setHearingsError('⚠️ تاريخ الجلسة يخالف الترتيب الزمني لمرحلة ما قبل القرار');
            return;
        }
    }
    if (hearingDraft.outcome === 'adjourn') {
        if (!hearingDraft.nextSessionDate) {
            setHearingsError('يرجى إدخال موعد الجلسة القادمة');
            return;
        }
        if (String(hearingDraft.nextSessionDate || '').trim() < String(hearingDraft.sessionDate || '').trim()) {
            setHearingsError('⚠️ موعد الجلسة القادمة يجب أن يكون بعد/مساوٍ لتاريخ الجلسة');
            return;
        }
        const adjournReason = hearingDraft.notes.trim();
        if (!adjournReason) {
            setHearingsError('يرجى إدخال سبب التأجيل');
            return;
        }
        if (!isAdjournReasonValid(adjournReason)) {
            setHearingsError('سبب التأجيل يجب أن يحتوي على نص وليس أرقاماً فقط');
            return;
        }
    }

    const baseNotes = hearingDraft.notes.trim();
    const notes =
        hearingDraft.outcome === 'terminate'
            ? PRE_DECISION_OUTCOME_NULLIFY
            : hearingDraft.outcome === 'close'
              ? PRE_DECISION_OUTCOME_CLOSE
              : baseNotes;
    const item: CaseHearing = {
        id: uuidv4(),
        stage: hearingDraft.stage,
        sessionDate: hearingDraft.sessionDate,
        notes,
        nextSessionDate: hearingDraft.outcome === 'adjourn' ? hearingDraft.nextSessionDate : '',
        createdAt: new Date().toISOString(),
    };
    updateHearings([item, ...hearings]);

    const stageLabel =
        hearingDraft.stage === 'grievance'
            ? 'تظلم'
            : 'ما قبل القرار';
    const caseNo =
        typeof caseData?.caseNumber === 'string'
            ? caseData.caseNumber
            : typeof caseData?.caseNo === 'string'
              ? caseData.caseNo
              : undefined;
    CalendarBridge.syncUrgentHearing({
        caseId: String(caseId ?? caseData?.id ?? ''),
        hearingId: item.id,
        sessionDate: item.sessionDate,
        stageLabel,
        notes: item.notes,
        caseNo,
        partiesSummary: (() => {
            const fromParties = partiesSummaryFromList(caseData?.parties);
            if (fromParties) return fromParties;
            const applicant =
                typeof caseData?.applicantName === 'string' ? caseData.applicantName.trim() : '';
            return applicant || undefined;
        })(),
        nextSessionDate: item.nextSessionDate,
    });

    setHearingDraft({
        open: false,
        stage: hearingDraft.stage,
        outcome: 'adjourn',
        sessionDate: '',
        notes: '',
        nextSessionDate: '',
        decisionDate: '',
    });
    if (hearingDraft.outcome === 'close' && hearingDraft.stage === 'pre_decision') {
        setPreDecisionClosed(true);
        persistAndMerge({ preDecisionClosed: true });
    }
    appendCaseEvent(
        hearingDraft.outcome === 'terminate'
            ? `إضافة جلسة (${hearingDraft.stage === 'grievance' ? 'تظلم' : 'قبل القرار'}): ${formatDateText(item.sessionDate)} (إبطال الطلب)`
            : hearingDraft.outcome === 'close'
            ? `إضافة جلسة (${hearingDraft.stage === 'grievance' ? 'تظلم' : 'قبل القرار'}): ${formatDateText(item.sessionDate)} (ختام المرافعة)`
            : `إضافة جلسة (${hearingDraft.stage === 'grievance' ? 'تظلم' : 'قبل القرار'}): ${formatDateText(item.sessionDate)} → ${formatDateText(item.nextSessionDate)}`,
        'action',
    );
};

    return {
        updatePhase2FirstHearingDate,
        updateHearings,
        updateExpertModule,
        updateRegistrationData,
        addHearing,
    };
}
