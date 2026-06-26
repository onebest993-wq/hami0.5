import { useEffect } from 'react';

type StatuteStatusSlice = {
    isCritical?: boolean;
} | null | undefined;

/** إظهار تحذير التقادم السبعي عند الوصول للحد الحرج (ما عدا النفقة). */
export function useExecutionDashboardStatuteWarning(
    statuteStatus: StatuteStatusSlice,
    showStatuteWarning: boolean,
    setShowStatuteWarning: (value: boolean) => void,
    isAlimonyClaim: boolean,
) {
    useEffect(() => {
        if (statuteStatus?.isCritical && !showStatuteWarning && !isAlimonyClaim) {
            setShowStatuteWarning(true);
        }
    }, [statuteStatus, showStatuteWarning, isAlimonyClaim, setShowStatuteWarning]);
}
