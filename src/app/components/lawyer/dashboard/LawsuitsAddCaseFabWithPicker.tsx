import React, { useEffect, useState } from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { X } from '@/app/components/ui/icons/X';
import { JURISDICTIONS, type JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/wordLists';
import { prefetchLawyerNewCaseModule } from '@/app/runtime/lawyerNewCaseLoader';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';

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

function readReduceMotion(): boolean {
    if (typeof window === 'undefined') return false;
    const root = document.documentElement;
    if (root.getAttribute('data-hami-reduce-motion') === '1') return true;
    if (root.getAttribute('data-hami-animations') === '0') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * زر إضبارة جديدة + انبثاق الخيارات من موضع الزر (بدون حاوية وسطية).
 */
export function LawsuitsAddCaseFabWithPicker({
    onSelect,
    onIntent,
    label = 'إضبارة جديدة',
    testId = LAWSUIT_VAULT_TEST_IDS.addLawsuit,
}: {
    onSelect: (id: JurisdictionId) => void;
    onIntent?: () => void;
    label?: string;
    testId?: string;
}): React.ReactElement {
    const [open, setOpen] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        prefetchLawyerNewCaseModule();
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduceMotion(readReduceMotion());
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (!open) return;
        prefetchLawyerNewCaseModule();
        for (const item of JURISDICTIONS) prefetchJurisdictionChunk(item.id);
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

    const toneClass = open
        ? 'border-[#E6C673]/55 bg-[linear-gradient(155deg,rgba(230,198,115,0.52)_0%,rgba(11,16,33,0.94)_48%,rgba(201,162,39,0.34)_100%)] text-[#FFF8E8] shadow-[inset_0_1px_0_rgba(255,249,230,0.32),0_12px_32px_rgba(0,0,0,0.4)]'
        : 'border-[#E6C673]/50 bg-[linear-gradient(155deg,rgba(230,198,115,0.42)_0%,rgba(11,16,33,0.92)_48%,rgba(201,162,39,0.28)_100%)] text-[#F8F1DE] shadow-[inset_0_1px_0_rgba(255,249,230,0.28),0_10px_28px_rgba(0,0,0,0.35)]';

    const handleToggle = () => {
        prefetchLawyerNewCaseModule();
        onIntent?.();
        setOpen((value) => !value);
    };

    const handleSelect = (id: JurisdictionId) => {
        prefetchLawyerNewCaseModule();
        prefetchJurisdictionChunk(id);
        setOpen(false);
        onSelect(id);
    };

    return (
        <>
            {open ? (
                <button
                    type="button"
                    className={`hami-jurisdiction-picker-backdrop fixed inset-0 z-[49] bg-[#03050B]/55${reduceMotion ? ' hami-jurisdiction-picker--static' : ''}`}
                    onClick={() => setOpen(false)}
                    aria-label="إغلاق"
                />
            ) : null}

            <div className="relative z-[55] flex flex-col items-end">
                {open ? (
                    <div
                        className={`hami-jurisdiction-picker-stack mb-2.5 flex w-[min(calc(100vw-2.5rem),17.5rem)] flex-col gap-2${reduceMotion ? ' hami-jurisdiction-picker--static' : ''}`}
                        data-testid={LAWSUIT_VAULT_TEST_IDS.jurisdictionPicker}
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
                                onPointerDown={() => {
                                    prefetchLawyerNewCaseModule();
                                    prefetchJurisdictionChunk(item.id);
                                }}
                                onPointerEnter={() => prefetchJurisdictionChunk(item.id)}
                                onFocus={() => prefetchJurisdictionChunk(item.id)}
                                className={`hami-jurisdiction-picker-item group w-full min-h-[3.25rem] rounded-2xl border border-white/[0.11] bg-[#0B1021] px-5 py-3.5 text-right shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-[background-color,border-color] duration-150 hover:border-[#E6C673]/30 hover:bg-[#12182a] active:scale-[0.98]${reduceMotion ? ' hami-jurisdiction-picker--static' : ''}`}
                                style={
                                    {
                                        transformOrigin: 'bottom right',
                                        ['--hami-jurisdiction-item-delay' as string]: `${index * 55}ms`,
                                    } as React.CSSProperties
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
                    className={`inline-flex h-12 w-auto shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold touch-manipulation transition-colors duration-150 active:scale-95 ${toneClass}`}
                >
                    {open ? <X size={18} strokeWidth={2.5} aria-hidden /> : <Plus size={18} strokeWidth={3} aria-hidden />}
                    <span className="whitespace-nowrap">{open ? 'إغلاق' : label}</span>
                </button>
            </div>

            <style>{`
                @keyframes hami-jurisdiction-picker-backdrop-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes hami-jurisdiction-picker-stack-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: none; }
                }
                @keyframes hami-jurisdiction-picker-item-in {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to { opacity: 1; transform: none; }
                }
                .hami-jurisdiction-picker-backdrop {
                    animation: hami-jurisdiction-picker-backdrop-in 0.2s ease-out both;
                }
                .hami-jurisdiction-picker-stack {
                    animation: hami-jurisdiction-picker-stack-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
                    transform-origin: bottom right;
                }
                .hami-jurisdiction-picker-item {
                    animation: hami-jurisdiction-picker-item-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
                    animation-delay: var(--hami-jurisdiction-item-delay, 0ms);
                }
                .hami-jurisdiction-picker--static,
                html[data-hami-reduce-motion='1'] .hami-jurisdiction-picker-backdrop,
                html[data-hami-reduce-motion='1'] .hami-jurisdiction-picker-stack,
                html[data-hami-reduce-motion='1'] .hami-jurisdiction-picker-item,
                html[data-hami-animations='0'] .hami-jurisdiction-picker-backdrop,
                html[data-hami-animations='0'] .hami-jurisdiction-picker-stack,
                html[data-hami-animations='0'] .hami-jurisdiction-picker-item {
                    animation: none !important;
                }
                @media (prefers-reduced-motion: reduce) {
                    .hami-jurisdiction-picker-backdrop,
                    .hami-jurisdiction-picker-stack,
                    .hami-jurisdiction-picker-item {
                        animation: none !important;
                    }
                }
            `}
            </style>
        </>
    );
}
