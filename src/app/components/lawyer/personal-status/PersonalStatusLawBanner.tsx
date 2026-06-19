import React from 'react';
import { Scale } from 'lucide-react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { resolvePersonalApplicableLawLabel } from './personalStatusValidation';
import { PERSONAL_STATUS_SECTION_TITLE } from './personalStatusVisualTheme';

export function PersonalStatusLawBanner({ file }: { file: FileData }) {
    const label = resolvePersonalApplicableLawLabel(file.applicableLaw);
    if (!label) return null;

    return (
        <div className="rounded-2xl border border-rose-300/20 bg-gradient-to-l from-rose-400/[0.09] via-[#1a1018]/40 to-emerald-400/[0.05] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-rose-200/10">
            <h4 className={`${PERSONAL_STATUS_SECTION_TITLE} mb-2`}>
                <Scale size={12} className="text-rose-300/85" />
                القانون المطبق
            </h4>
            <p className="text-sm font-bold text-rose-100/95 leading-relaxed">{label}</p>
            <p className="text-[10px] text-white/40 mt-2">مسار أحوال شخصية — مستقل عن القضاء المدني</p>
        </div>
    );
}
