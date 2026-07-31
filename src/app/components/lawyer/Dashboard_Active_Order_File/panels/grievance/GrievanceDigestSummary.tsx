import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { formatDateText } from '../../utils/formatters';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';

type GrievanceDigestSummaryProps = GrievanceLifecyclePanelProps & {
    grievanceDigestOpen: boolean;
    setGrievanceDigestOpen: React.Dispatch<React.SetStateAction<boolean>>;
    hasGrievanceDigest: boolean;
};

export function GrievanceDigestSummary({
    grievanceDigestOpen,
    setGrievanceDigestOpen,
    hasGrievanceDigest,
    ...props
}: GrievanceDigestSummaryProps) {
    const {
        caseData,
        computedGrievanceFiledBy,
        effectiveRejectionNotificationDate,
        grievanceData,
        grievanceLegalEndDate,
        hasIntervention,
        partyLabel,
        phase2FirstHearingDate,
        showGrievanceDetailsSummary,
        showGrievanceOutcomeSummary,
        showGrievanceTimingSummary,
    } = props;

    if (!hasGrievanceDigest) return null;

    return (
                                                        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl overflow-hidden">
                                                            <button
                                                                type="button"
                                                                onClick={() => setGrievanceDigestOpen((o) => !o)}
                                                                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-right text-white/90 text-xs font-bold"
                                                            >
                                                                <span>ملخص مرحلة التظلم</span>
                                                                <ChevronDown
                                                                    size={16}
                                                                    className={`shrink-0 text-white/60 transition-transform duration-200 ${
                                                                        grievanceDigestOpen ? 'rotate-180' : ''
                                                                    }`}
                                                                />
                                                            </button>
                                                            <AnimatePresence initial={false}>
                                                                {grievanceDigestOpen ? (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <motion.div className="px-4 pb-3 space-y-2 text-white/80 text-xs font-bold border-t border-white/10">
                                                                            {showGrievanceTimingSummary ? (
                                                                                <div>
                                                                                    التوقيت القانوني:{' '}
                                                                                    {!hasIntervention
                                                                                        ? `التبليغ ${formatDateText(effectiveRejectionNotificationDate) || '—'} | `
                                                                                        : null}
                                                                                    الانتهاء {formatDateText(grievanceLegalEndDate) || '—'}
                                                                                </div>
                                                                            ) : null}
                                                                            {showGrievanceOutcomeSummary ? (
                                                                                <div className={showGrievanceTimingSummary ? 'pt-2 border-t border-white/10' : ''}>
                                                                                    حالة التظلم:{' '}
                                                                                    {grievanceData.outcome === 'filed'
                                                                                        ? 'تم تقديم تظلم'
                                                                                        : 'انقضت المدة دون تظلم'}
                                                                                </div>
                                                                            ) : null}
                                                                            {showGrievanceDetailsSummary ? (
                                                                                <div
                                                                                    className={
                                                                                        showGrievanceTimingSummary || showGrievanceOutcomeSummary
                                                                                            ? 'pt-2 border-t border-white/10 space-y-1'
                                                                                            : 'space-y-1'
                                                                                    }
                                                                                >
                                                                                    <div>
                                                                                        بيانات التظلم: {partyLabel(computedGrievanceFiledBy)} — تاريخ التقديم{' '}
                                                                                        {formatDateText(grievanceData.filingDate) || '—'}
                                                                                    </div>
                                                                                    <div>
                                                                                        تاريخ جلسة التظلم الأولى:{` `}
                                                                                        {formatDateText(
                                                                                            (caseData as any)?.grievanceFirstHearingDate ?? phase2FirstHearingDate,
                                                                                        ) || '—'}
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}
                                                                        </motion.div>
                                                                    </motion.div>
                                                                ) : null}
                                                            </AnimatePresence>
                                                        </div>
    );
}
