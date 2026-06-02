import { addDaysYmd } from '../utils/ymd';
import { formatDateText } from '../utils/formatters';
import type { GrievanceData, JudgeDecision } from '../types';

export type UseDecisionNotificationSubmitArgs = {
    judgeDecision: JudgeDecision;
    showGrievanceStep: boolean;
    setGrievanceData: React.Dispatch<React.SetStateAction<GrievanceData>>;
    setGrievanceDecisionNotificationConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setGrievanceLegalEndDate: React.Dispatch<React.SetStateAction<string>>;
    persistAndMerge: (patch: Record<string, unknown>) => void;
    appendCaseEvent: (message: string, kind?: 'system' | 'action' | 'edit') => void;
};

export function useDecisionNotificationSubmit({
    judgeDecision,
    showGrievanceStep,
    setGrievanceData,
    setGrievanceDecisionNotificationConfirmed,
    setGrievanceLegalEndDate,
    persistAndMerge,
    appendCaseEvent,
}: UseDecisionNotificationSubmitArgs) {
    return (actionDate: string) => {
        setGrievanceData((prev) => ({ ...prev, rejectionNotificationDate: actionDate }));
        setGrievanceDecisionNotificationConfirmed(true);
        const patch: Record<string, unknown> = {
            rejectionNotificationDate: actionDate,
            notificationDate: actionDate,
        };
        if (showGrievanceStep) {
            const end = addDaysYmd(actionDate, 3);
            if (end) setGrievanceLegalEndDate(end);
            patch.grievanceLegalEndDate = end || null;
            patch.legalState = 'Awaiting_Grievance';
            patch.phase = 'grievance_window';
        } else {
            patch.legalState = 'Awaiting_Cassation';
            patch.phase = 'cassation_window';
        }
        if (judgeDecision.decision !== 'rejected' && showGrievanceStep) {
            patch.notificationDate = actionDate;
        }
        persistAndMerge(patch);
        appendCaseEvent(`تأكيد التبليغ الأصولي بتاريخ ${formatDateText(actionDate)}`, 'action');
    };
}
