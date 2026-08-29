import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
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
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-white/40 text-xs font-bold tabular-nums shrink-0">1</span>
                <div className="min-w-0">
                    <div className="text-white font-bold text-sm">قرار القاضي</div>
                    <div className="text-white/45 text-[11px] mt-0.5 truncate">{statusLabel}</div>
                </div>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-[11px] shrink-0">
                <span>{statusChip}</span>
                {(judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') &&
                    judgeDecision.requiresGuarantee && (
                        <span className="text-[10px] text-white/55">
                            كفالة {guaranteeSubmitted ? 'مودعة' : 'مطلوبة'}
                        </span>
                    )}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/40 ${
                        activeLifecycleStep === 'judge' ? 'rotate-180' : ''
                    }`}
                />
            </div>
        </button>
    );
}
