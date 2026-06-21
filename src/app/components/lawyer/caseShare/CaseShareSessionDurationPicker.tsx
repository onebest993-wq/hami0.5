import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import {
    CASE_SHARE_SESSION_MINUTES,
    formatCaseShareSession,
    type CaseShareSessionMinutes,
} from '@/app/services/caseShare/caseShareSession';

type Props = {
    value: CaseShareSessionMinutes;
    onChange: (minutes: CaseShareSessionMinutes) => void;
};

export const CaseShareSessionDurationPicker = memo(function CaseShareSessionDurationPicker({
    value,
    onChange,
}: Props) {
    return (
        <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-white text-sm font-bold mb-1 flex items-center gap-1.5">
                <Clock size={14} className="text-[#E6C673]" />
                مدة الجلسة المتوقعة
            </p>
            <p className="text-white/40 text-[10px] mb-2">من ربع ساعة إلى 3 ساعات كحد أقصى</p>
            <div className="flex flex-wrap gap-1.5">
                {CASE_SHARE_SESSION_MINUTES.map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => onChange(m)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                            value === m
                                ? 'bg-[#E6C673]/15 text-[#E6C673] border-[#E6C673]/35'
                                : 'text-white/45 border-white/10'
                        }`}
                    >
                        {formatCaseShareSession(m)}
                    </button>
                ))}
            </div>
        </div>
    );
});
