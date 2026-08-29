import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { NC_HEADER } from '../newCaseGlassTheme';

export interface CaseHeaderProps {
    onClose: () => void;
    selectedType?: string | null;
    incidentalBadge?: { label: string; tone: 'joined' | 'counter' };
}

export const CaseHeader = ({ onClose, selectedType, incidentalBadge }: CaseHeaderProps) => {
    const title =
        selectedType === 'personal'
            ? 'إضبارة الأحوال الشخصية'
            : selectedType === 'criminal'
              ? 'إضبارة جزائية'
              : 'إضبارة الدعوى';

    const badgeClass =
        incidentalBadge?.tone === 'counter'
            ? 'border-amber-400/35 bg-amber-500/12 text-amber-200'
            : 'border-violet-400/35 bg-violet-500/12 text-violet-200';

    return (
        <div className={NC_HEADER}>
            <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors touch-manipulation"
            >
                <X size={20} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-sm font-bold text-white/90 truncate">{title}</h2>
                {incidentalBadge ? (
                    <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${badgeClass}`}
                    >
                        {incidentalBadge.label}
                    </span>
                ) : null}
            </div>
            <div className="min-w-[44px]" aria-hidden />
        </div>
    );
};
