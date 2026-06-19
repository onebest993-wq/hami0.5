import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Scale } from 'lucide-react';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PersonalStatusLawReferencePortal } from '@/app/components/lawyer/personal-status/PersonalStatusLawReferencePortal';
import { prefetchCivilLawArticles } from '@/app/utils/civilLawRemoteCache';
import { PS_TILE_INTERACTIVE } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';

export interface PersonalStatusLawReferenceHubProps {
    applicableLaw: PersonalApplicableLaw | '' | undefined;
    readOnly?: boolean;
    layout?: 'default' | 'pearl-tile';
}

export function PersonalStatusLawReferenceHub({
    applicableLaw,
    readOnly = false,
    layout = 'default',
}: PersonalStatusLawReferenceHubProps) {
    const [panelOpen, setPanelOpen] = useState(false);
    const pearl = layout === 'pearl-tile';

    useEffect(() => {
        prefetchCivilLawArticles(['civil_procedure', 'evidence']);
    }, []);

    if (readOnly) {
        return (
            <div className="print:hidden" dir="rtl">
                <div
                    className={
                        pearl
                            ? 'min-h-[7.5rem] rounded-[1.25rem] border border-dashed border-[#E8DFD0]/15 bg-[#F7F4EE]/[0.03]'
                            : 'h-12 rounded-xl border border-dashed border-white/[0.08] bg-[#141214]/50 mb-3'
                    }
                />
            </div>
        );
    }

    return (
        <div className="print:hidden" dir="rtl">
            <PersonalStatusLawReferencePortal
                open={panelOpen}
                onClose={() => setPanelOpen(false)}
                applicableLaw={applicableLaw}
            />
            <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className={
                    pearl
                        ? `${PS_TILE_INTERACTIVE} w-full min-h-[5.25rem] p-3 flex flex-col items-start justify-between text-right gap-1.5`
                        : 'w-full py-3 px-3.5 rounded-xl border border-white/[0.07] bg-[#141214] hover:border-[#C4A574]/28 flex items-center justify-between gap-3 transition-colors text-right mb-3'
                }
            >
                {pearl ? (
                    <>
                        <div className="w-10 h-10 rounded-2xl bg-[#FAFAF8]/[0.06] border border-[#F7F4EE]/12 flex items-center justify-center shrink-0">
                            <BookOpen size={17} className="text-[#D4C4B0]" aria-hidden />
                        </div>
                        <div className="min-w-0 w-full">
                            <span className="font-black text-sm block text-[#E8DFD0]">المرجع القانوني</span>
                            <span className="text-[9px] text-[#8A8780] mt-0.5 block flex items-center gap-1">
                                <Scale size={9} aria-hidden />
                                مرافعات · إثبات · أحوال
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 min-w-0">
                            <BookOpen size={15} className="text-[#C4A574]/75 shrink-0" aria-hidden />
                            <span className="text-xs font-bold text-white/78">المرجع القانوني</span>
                        </div>
                        <ChevronDown size={14} className="text-white/30 shrink-0" aria-hidden />
                    </>
                )}
            </button>
        </div>
    );
}
