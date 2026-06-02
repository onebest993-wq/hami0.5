import { useEffect, useRef } from 'react';
import type { UseOrderFileHydrateArgs } from './types';

/** يزامن مرحلة دخول المدافع (defenderEntryPhase 2/3) مع state دورة الحياة */
export function useDefenderEntryHydrate({ caseId, fileData, caseData, setters }: UseOrderFileHydrateArgs) {
    const settersRef = useRef(setters);
    settersRef.current = setters;
    const defenderEntryHydrateRef = useRef(false);

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
    }, [fileData, caseData, setters]);
}
