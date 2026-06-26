import { useEffect, useState } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

/** مسار الإكراه/الاستدعاء — حالة + مزامنة من executionData */
export function useExecutionCoercionSummonsPipeline(executionFileKey: string, executionData: ExecutionFile | null | undefined) {
    const [activeNoticeState, setActiveNoticeState] = useState<string | null>(
        executionData?.activeNoticeState || null,
    );
    const [debtorAttendedVoluntarily, setDebtorAttendedVoluntarily] = useState<boolean>(
        executionData?.debtorAttendedVoluntarily || false,
    );
    const [debtorForcedToAttend, setDebtorForcedToAttend] = useState<boolean>(
        executionData?.debtorForcedToAttend || false,
    );
    const [debtorArrested, setDebtorArrested] = useState<boolean>(executionData?.debtorArrested || false);
    const [nonInterferenceIssued, setNonInterferenceIssued] = useState<boolean>(
        executionData?.nonInterferenceIssued || false,
    );
    const [summoningRound, setSummoningRound] = useState<number>(executionData?.summoningRound ?? 1);
    const [voluntaryAttendanceCount, setVoluntaryAttendanceCount] = useState<number>(
        executionData?.voluntaryAttendanceCount ?? 0,
    );
    const [investigationCourtRequested, setInvestigationCourtRequested] = useState<boolean>(
        executionData?.investigationCourtRequested ?? false,
    );
    const [investigationMemoIssued, setInvestigationMemoIssued] = useState<boolean>(
        executionData?.investigationMemoIssued ?? false,
    );
    const [investigationPathDebtorPresent, setInvestigationPathDebtorPresent] = useState<boolean>(
        executionData?.investigationPathDebtorPresent ?? false,
    );
    const [forcedPathAttendanceSecured, setForcedPathAttendanceSecured] = useState<boolean>(
        executionData?.forcedPathAttendanceSecured ?? false,
    );

    useEffect(() => {
        if (!executionData?.id) return;
        setSummoningRound(executionData.summoningRound ?? 1);
        setVoluntaryAttendanceCount(executionData.voluntaryAttendanceCount ?? 0);
        setInvestigationCourtRequested(executionData.investigationCourtRequested ?? false);
        setInvestigationMemoIssued(executionData.investigationMemoIssued ?? false);
        setInvestigationPathDebtorPresent(executionData.investigationPathDebtorPresent ?? false);
        setForcedPathAttendanceSecured(executionData.forcedPathAttendanceSecured ?? false);
    }, [executionFileKey]);

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
