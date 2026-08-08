import React, { useEffect, useState } from 'react';
import { Plus, X } from '@/app/components/ui/lucideIcons';
import { JURISDICTIONS, type JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/wordLists';
import { prefetchLawyerNewCaseModule } from '@/app/runtime/lawyerNewCaseLoader';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import type { LawsuitsAddCaseFabTone } from './LawsuitsWorkspaceShell';

function prefetchJurisdictionChunk(id: JurisdictionId) {
    if (id === 'criminal') {
        void import('@/app/components/lawyer/criminal-system/criminalStore');
        void import('@/app/components/lawyer/criminal-system/CriminalNewCase');
    }
    if (id === 'personal') {
        void import('@/app/components/lawyer/personal-status/PersonalStatusNewCaseForm');
        void import('@/app/utils/personalStatusLawRemoteCache');
    }
    if (id === 'civil') {
        void import('@/app/components/lawyer/LawyerNewCase/components/CivilNewCaseForm');
        void import('@/app/utils/civilLawRemoteCache').then((m) =>
            m.prefetchCivilLawArticles(['civil_procedure', 'evidence']),
        );
    }
}

/**
 * زر إضبارة جديدة + انبثاق الخيارات من موضع الزر (بدون حاوية وسطية).
 */
export function LawsuitsAddCaseFabWithPicker({
    onSelect,
    onIntent,
    label = 'إضبارة جديدة',
    tone = 'gold',
    testId = CIVIL_LAWSUIT_TEST_IDS.addLawsuit,
}: {
    onSelect: (id: JurisdictionId) => void;
    onIntent?: () => void;
    label?: string;
    tone?: LawsuitsAddCaseFabTone;
    testId?: string;
}): React.ReactElement {
    const [open, setOpen] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduceMotion(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (!open) return;
        prefetchLawyerNewCaseModule();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [open]);

    const toneClass =
        tone === 'urgent'
            ? 'border-rose-400/50 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-900/40'
            : open
              ? 'border-[#E6C673]/55 bg-[linear-gradient(155deg,rgba(230,198,115,0.52)_0%,rgba(11,16,33,0.94)_48%,rgba(201,162,39,0.34)_100%)] text-[#FFF8E8] shadow-[inset_0_1px_0_rgba(255,249,230,0.32),0_12px_32px_rgba(0,0,0,0.4)]'
              : 'border-[#E6C673]/50 bg-[linear-gradient(155deg,rgba(230,198,115,0.42)_0%,rgba(11,16,33,0.92)_48%,rgba(201,162,39,0.28)_100%)] text-[#F8F1DE] shadow-[inset_0_1px_0_rgba(255,249,230,0.28),0_10px_28px_rgba(0,0,0,0.35)]';

    const handleToggle = () => {
        onIntent?.();
        setOpen((value) => !value);
    };

    const handleSelect = (id: JurisdictionId) => {
        setOpen(false);
        onSelect(id);
    };

    return (
        <>
            {open ? (
                <button
                    type="button"
                    className={`fixed inset-0 z-[49] bg-[#03050B]/28 backdrop-blur-[2px] transition-opacity${reduceMotion ? '' : ' animate-[lawsuitsBackdrop_0.22s_ease-out]'}`}
                    onClick={() => setOpen(false)}
                    aria-label="إغلاق"
                />
            ) : null}

            <div className="relative z-[55] flex flex-col items-end">
                {open ? (
                    <div
                        className="mb-2.5 flex w-[min(calc(100vw-2.5rem),17.5rem)] flex-col gap-2"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.jurisdictionPicker}
                        role="menu"
                        aria-label="اختصاص الدعوى"
                    >
                        {JURISDICTIONS.map((item, index) => (
                            <button
                                key={item.id}
                                type="button"
                                role="menuitem"
                                data-testid={`new-case-jurisdiction-${item.id}`}
                                onClick={() => handleSelect(item.id)}
                                onPointerEnter={() => prefetchJurisdictionChunk(item.id)}
                                onFocus={() => prefetchJurisdictionChunk(item.id)}
                                className={`group w-full min-h-[3.25rem] rounded-2xl border border-white/[0.11] bg-white/[0.04] px-5 py-3.5 text-right backdrop-blur-xl shadow-[0_10px_32px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,border-color,transform,box-shadow] duration-200 hover:border-[#E6C673]/30 hover:bg-white/[0.085] hover:shadow-[0_12px_36px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.09)] active:scale-[0.98]${reduceMotion ? '' : ' animate-[lawsuitsBloom_0.4s_cubic-bezier(0.22,1,0.36,1)_both]'}`}
                                style={
                                    reduceMotion
                                        ? { transformOrigin: 'bottom right' }
                                        : {
                                              animationDelay: `${index * 46}ms`,
                                              transformOrigin: 'bottom right',
                                          }
                                }
                            >
                                <span className="block text-[0.95rem] font-bold text-white/[0.88] transition-colors group-hover:text-[#F4EDE0]">
                                    {item.title}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : null}

                <button
                    type="button"
                    data-testid={testId}
                    onClick={handleToggle}
                    onPointerEnter={() => onIntent?.()}
                    onFocus={() => onIntent?.()}
                    title={open ? 'إغلاق' : `إضافة ${label}`}
                    aria-label={open ? 'إغلاق اختيار الاختصاص' : `إضافة ${label}`}
                    aria-expanded={open}
                    aria-haspopup="menu"
                    className={`inline-flex h-12 w-auto shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold backdrop-blur-md touch-manipulation transition-all duration-200 hover:scale-[1.03] active:scale-95 ${toneClass}`}
                >
                    {open ? <X size={18} strokeWidth={2.5} aria-hidden /> : <Plus size={18} strokeWidth={3} aria-hidden />}
                    <span className="whitespace-nowrap">{open ? 'إغلاق' : label}</span>
                </button>
            </div>

            <style>{`
                @keyframes lawsuitsBloom {
                    0% {
                        opacity: 0;
                        transform: translateY(10px) scale(0.88);
                        filter: blur(4px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                        filter: blur(0);
                    }
                }
                @keyframes lawsuitsBackdrop {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </>
    );
}
