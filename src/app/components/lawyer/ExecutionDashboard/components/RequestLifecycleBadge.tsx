import React from 'react';
import { History } from 'lucide-react';
import type { ExecutorRequestLifecycleSummary } from '@/app/utils/executorRequestLifecycle';

const TONE_CLASS: Record<
    ExecutorRequestLifecycleSummary['entries'][number]['outcomeTone'],
    string
> = {
    success: 'text-emerald-300',
    danger: 'text-rose-300',
    amber: 'text-amber-300',
    neutral: 'text-slate-400',
};

export interface RequestLifecycleBadgeProps {
    summary: ExecutorRequestLifecycleSummary;
    expanded: boolean;
    onToggle: () => void;
}

export const RequestLifecycleBadge: React.FC<RequestLifecycleBadgeProps> = ({
    summary,
    expanded,
    onToggle,
}) => (
    <button
        type="button"
        aria-expanded={expanded}
        aria-label="سجل دورة حياة الطلب"
        title="سجل دورة حياة الطلب"
        onClick={(e) => {
            e.stopPropagation();
            onToggle();
        }}
        className={`inline-flex shrink-0 flex-row-reverse items-center gap-1 rounded-xl border px-2 py-1 transition ${
            expanded
                ? 'border-[#E6C673]/45 bg-[#E6C673]/12'
                : 'border-white/10 bg-white/5 hover:border-[#E6C673]/30 hover:bg-white/10'
        }`}
    >
        <History size={14} className="text-[#E6C673]/90" />
        <span className="text-[10px] font-bold text-white font-mono">{summary.submissions}</span>
        {summary.approvals > 0 ? (
            <span className="text-[9px] font-bold text-emerald-400">✓{summary.approvals}</span>
        ) : null}
        {summary.rejections > 0 ? (
            <span className="text-[9px] font-bold text-rose-400">✗{summary.rejections}</span>
        ) : null}
    </button>
);

export const RequestLifecycleBadgeSlot: React.FC<{
    summary: ExecutorRequestLifecycleSummary | null | undefined;
    expanded: boolean;
    onToggle: () => void;
}> = ({ summary, expanded, onToggle }) => {
    if (!summary || summary.submissions <= 0) return null;
    return <RequestLifecycleBadge summary={summary} expanded={expanded} onToggle={onToggle} />;
};

export interface RequestLifecyclePanelProps {
    summary: ExecutorRequestLifecycleSummary;
}

export const RequestLifecyclePanel: React.FC<RequestLifecyclePanelProps> = ({ summary }) => (
    <div
        className="border-t border-white/10 bg-black/35 px-3 py-3 text-right"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
    >
        <p className="text-[10px] font-bold text-slate-400 mb-2">
            سجل الطلب — {summary.submissions} تقديم
            {summary.approvals > 0 ? ` · ${summary.approvals} موافقة` : ''}
            {summary.rejections > 0 ? ` · ${summary.rejections} رفض` : ''}
            {summary.pending > 0 ? ` · ${summary.pending} قيد البت` : ''}
        </p>
        <div className="space-y-1.5 max-h-[min(36vh,220px)] overflow-y-auto">
            {summary.entries.map((entry) => (
                <div
                    key={entry.decisionId || `${entry.cycleNumber}:${entry.submittedAt}`}
                    className="flex flex-row-reverse items-start justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2"
                >
                    <div className="min-w-0 text-right">
                        <p className="text-[10px] font-bold text-white">
                            الدورة {entry.cycleNumber}
                            {entry.superseded ? (
                                <span className="text-slate-500 font-normal"> · مؤرشف</span>
                            ) : null}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                            تقديم: {entry.submittedAtLabel}
                            {entry.supersededAtLabel
                                ? ` · أُغلق: ${entry.supersededAtLabel}`
                                : ''}
                        </p>
                    </div>
                    <span
                        className={`shrink-0 text-[10px] font-bold ${TONE_CLASS[entry.outcomeTone]}`}
                    >
                        {entry.outcomeLabel}
                    </span>
                </div>
            ))}
        </div>
    </div>
);
