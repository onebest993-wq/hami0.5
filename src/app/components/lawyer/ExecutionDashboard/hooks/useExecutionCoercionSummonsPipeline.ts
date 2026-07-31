import { useState } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { useAdoptPersistedExecutionValue } from './useAdoptPersistedExecutionValue';

/**
 * مسار الإكراه/الاستدعاء — حالة + مزامنة من executionData.
 *
 * كل حقل هنا يُحفظ لاحقاً في لقطة الإضبارة، لذا يجب أن يتبنّى القيمة
 * المحفوظة عند تبديل الملف النشط (بما فيه ملفات الإنابة التي لا تغيّر
 * executionFileKey) وعند أي كتابة خارجية عبر persistExecutionMerge —
 * وإلا انبعثت أعلام قديمة أو انمحت أعلام حقيقية عند حفظ اللقطة.
 */
export function useExecutionCoercionSummonsPipeline(executionFileKey: string, executionData: ExecutionFile | null | undefined) {
    const dataId = String(executionData?.id ?? executionFileKey ?? '');

    const persistedActiveNoticeState = executionData?.activeNoticeState || null;
    const persistedDebtorAttendedVoluntarily = executionData?.debtorAttendedVoluntarily || false;
    const persistedDebtorForcedToAttend = executionData?.debtorForcedToAttend || false;
    const persistedDebtorArrested = executionData?.debtorArrested || false;
    const persistedNonInterferenceIssued = executionData?.nonInterferenceIssued || false;
    const persistedSummoningRound = executionData?.summoningRound ?? 1;
    const persistedVoluntaryAttendanceCount = executionData?.voluntaryAttendanceCount ?? 0;
    const persistedInvestigationCourtRequested = executionData?.investigationCourtRequested ?? false;
    const persistedInvestigationMemoIssued = executionData?.investigationMemoIssued ?? false;
    const persistedInvestigationPathDebtorPresent =
        executionData?.investigationPathDebtorPresent ?? false;
    const persistedForcedPathAttendanceSecured =
        executionData?.forcedPathAttendanceSecured ?? false;

    const [activeNoticeState, setActiveNoticeState] = useState<string | null>(
        persistedActiveNoticeState,
    );
    const [debtorAttendedVoluntarily, setDebtorAttendedVoluntarily] = useState<boolean>(
        persistedDebtorAttendedVoluntarily,
    );
    const [debtorForcedToAttend, setDebtorForcedToAttend] = useState<boolean>(
        persistedDebtorForcedToAttend,
    );
    const [debtorArrested, setDebtorArrested] = useState<boolean>(persistedDebtorArrested);
    const [nonInterferenceIssued, setNonInterferenceIssued] = useState<boolean>(
        persistedNonInterferenceIssued,
    );
    const [summoningRound, setSummoningRound] = useState<number>(persistedSummoningRound);
    const [voluntaryAttendanceCount, setVoluntaryAttendanceCount] = useState<number>(
        persistedVoluntaryAttendanceCount,
    );
    const [investigationCourtRequested, setInvestigationCourtRequested] = useState<boolean>(
        persistedInvestigationCourtRequested,
    );
    const [investigationMemoIssued, setInvestigationMemoIssued] = useState<boolean>(
        persistedInvestigationMemoIssued,
    );
    const [investigationPathDebtorPresent, setInvestigationPathDebtorPresent] = useState<boolean>(
        persistedInvestigationPathDebtorPresent,
    );
    const [forcedPathAttendanceSecured, setForcedPathAttendanceSecured] = useState<boolean>(
        persistedForcedPathAttendanceSecured,
    );

    useAdoptPersistedExecutionValue(dataId, persistedActiveNoticeState, setActiveNoticeState);
    useAdoptPersistedExecutionValue(
        dataId,
        persistedDebtorAttendedVoluntarily,
        setDebtorAttendedVoluntarily,
    );
    useAdoptPersistedExecutionValue(dataId, persistedDebtorForcedToAttend, setDebtorForcedToAttend);
    useAdoptPersistedExecutionValue(dataId, persistedDebtorArrested, setDebtorArrested);
    useAdoptPersistedExecutionValue(
        dataId,
        persistedNonInterferenceIssued,
        setNonInterferenceIssued,
    );
    useAdoptPersistedExecutionValue(dataId, persistedSummoningRound, setSummoningRound);
    useAdoptPersistedExecutionValue(
        dataId,
        persistedVoluntaryAttendanceCount,
        setVoluntaryAttendanceCount,
    );
    useAdoptPersistedExecutionValue(
        dataId,
        persistedInvestigationCourtRequested,
        setInvestigationCourtRequested,
    );
    useAdoptPersistedExecutionValue(
        dataId,
        persistedInvestigationMemoIssued,
        setInvestigationMemoIssued,
    );
    useAdoptPersistedExecutionValue(
        dataId,
        persistedInvestigationPathDebtorPresent,
        setInvestigationPathDebtorPresent,
    );
    useAdoptPersistedExecutionValue(
        dataId,
        persistedForcedPathAttendanceSecured,
        setForcedPathAttendanceSecured,
    );

    return {
        activeNoticeState,
        setActiveNoticeState,
        debtorAttendedVoluntarily,
        setDebtorAttendedVoluntarily,
        debtorForcedToAttend,
        setDebtorForcedToAttend,
        debtorArrested,
        setDebtorArrested,
        nonInterferenceIssued,
        setNonInterferenceIssued,
        summoningRound,
        setSummoningRound,
        voluntaryAttendanceCount,
        setVoluntaryAttendanceCount,
        investigationCourtRequested,
        setInvestigationCourtRequested,
        investigationMemoIssued,
        setInvestigationMemoIssued,
        investigationPathDebtorPresent,
        setInvestigationPathDebtorPresent,
        forcedPathAttendanceSecured,
        setForcedPathAttendanceSecured,
    };
}
