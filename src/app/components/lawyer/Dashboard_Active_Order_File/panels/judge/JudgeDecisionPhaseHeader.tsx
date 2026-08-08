import React from 'react';
import { ChevronDown } from '@/app/components/ui/lucideIcons';
import { formatDateText } from '../../utils/formatters';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';
import { URGENT_LIFECYCLE_STEP_HEADER } from '../../layout/urgentDossierUi';

export function JudgeDecisionPhaseHeader(props: JudgeDecisionLifecyclePanelProps) {
    const {
        activeLifecycleStep,
        fileStatus,
        guaranteeSubmitted,
        isFinalityTerminatedRequest,
        isIqrarContext,
        judgeDecision,
        toggleLifecycleStep,
    } = props;

    const statusLabel = isFinalityTerminatedRequest
        ? 'دعوى مبطلة/متروكة'
        : fileStatus === 'pending'
          ? 'الخطوة النشطة حالياً'
          : isIqrarContext && judgeDecision.decision === 'accepted'
            ? `مكتملة: حجة الإقرار — ${formatDateText(judgeDecision.decisionDate) || '—'}`
            : judgeDecision.decision === 'accepted'
              ? `مكتملة: إجابة الطلب — ${formatDateText(judgeDecision.decisionDate) || '—'}`
              : judgeDecision.decision === 'partially_accepted'
                ? `مكتملة: إجابة جزئية — ${formatDateText(judgeDecision.decisionDate) || '—'}`
                : `مكتملة: رفض الطلب — ${formatDateText(judgeDecision.decisionDate) || '—'}`;

    const stepBadgeClass =
        fileStatus === 'pending'
            ? 'border-blue-500/35 bg-blue-500/10 text-blue-200'
            : judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted'
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/35 bg-red-500/10 text-red-200';

    const statusChip =
        isFinalityTerminatedRequest
            ? 'مبطلة'
            : fileStatus === 'pending'
              ? 'مفتوحة'
              : judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted'
                ? 'مكتملة'
                : 'مرفوض';

    return (
        <button type="button" onClick={() => toggleLifecycleStep('judge')} className={URGENT_LIFECYCLE_STEP_HEADER}>
            <div className="flex items-center gap-2.5 min-w-0">
                <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 ${stepBadgeClass}`}
                >
                    <span className="text-xs font-extrabold">1</span>
                </div>
                <div className="min-w-0">
                    <div className="text-white font-bold text-sm">قرار القاضي</div>
                    <div className="text-white/45 text-[11px] mt-0.5 truncate">{statusLabel}</div>
                </div>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-[11px] shrink-0">
                <span>{statusChip}</span>
                {(judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') &&
                    judgeDecision.requiresGuarantee && (
                        <span className="text-[10px] bg-amber-500/15 border border-amber-500/25 text-amber-100 px-2 py-0.5 rounded-full">
                            كفالة {guaranteeSubmitted ? 'مودعة' : 'مطلوبة'}
                        </span>
                    )}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/40 transition-transform duration-200 ${
                        activeLifecycleStep === 'judge' ? 'rotate-180' : ''
                    }`}
                />
            </div>
        </button>
    );
}
