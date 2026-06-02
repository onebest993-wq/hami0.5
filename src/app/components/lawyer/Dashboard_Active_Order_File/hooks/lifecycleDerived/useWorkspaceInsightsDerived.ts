import { useMemo } from 'react';
import type { UseOrderFileLifecycleDerivedArgs } from './types';

export function useWorkspaceInsightsDerived(args: UseOrderFileLifecycleDerivedArgs) {
    const { caseData, hearings, expertModule, todayYmdValue, isFinalized } = args;

    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const daysDiff = (from: Date, to: Date) => {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / msPerDay);
    };

    const nextHearingDate = useMemo(() => {
        const candidates = hearings
            .map((h) => String(h.nextSessionDate || '').trim())
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= todayYmdValue)
            .sort((a, b) => a.localeCompare(b));
        return candidates[0] ?? '';
    }, [hearings, todayYmdValue]);

    const reportDueSoon = useMemo(() => {
        if (!expertModule.enabled) return false;
        if (!expertModule.reportDueDate) return false;
        if (expertModule.reportReceivedDate) return false;
        const due = new Date(expertModule.reportDueDate);
        if (Number.isNaN(due.getTime())) return false;
        const days = daysDiff(new Date(), due);
        return days >= 0 && days <= 3;
    }, [expertModule.enabled, expertModule.reportDueDate, expertModule.reportReceivedDate]);

    const archiveSummaryText = useMemo(() => {
        if (!isFinalized) return '';
        const reason = String((caseData as any)?.finalityReason || (caseData as any)?.archivedReason || '').trim();
        if (reason === 'terminated_request') return 'إبطال الطلب وإغلاق الإضبارة';
        if (reason === 'iqrar_authenticated') return 'إقرار مؤرشف — تم إصدار حجة الإقرار والمصادقة';
        if (reason === 'cassation_decision') return 'انتهاء مرحلة التمييز وصدور القرار';
        if (reason === 'expired') return 'انقضاء المدة القانونية دون إجراء';
        if (reason === 'no_grievance') return 'اكتساب الدرجة القطعية دون تظلم';
        return 'إنهاء الإضبارة وأرشفتها';
    }, [caseData, isFinalized]);

    return { nextHearingDate, reportDueSoon, archiveSummaryText };
}
