import React, { memo } from 'react';
import { Plus } from 'lucide-react';
import type { DecisionsLedgerKindFilter } from './JudicialDecisionsLedger';
import type { InvestigationDefendantsPartyMix } from '../juvenileInvestigationRules';

/**
 * شَريط تَبويبات القرارات — طلبات المحامي + جلسات المرافعة (محاكمة)
 * أو قرارات القاضي + طلبات المحامي (تحقيق).
 */

export type DecisionsCommandBarProps = {
    activeFilter: DecisionsLedgerKindFilter;
    onFilterChange: (next: DecisionsLedgerKindFilter) => void;
    showTrialSessionsFilter?: boolean;
    showInvestigationJudicialTabs?: boolean;
    partyMix?: InvestigationDefendantsPartyMix;
    trialSessionsTabLabel?: string;
    onOpenTrialSessionModal?: () => void;
    onOpenAdultJudicialDecisionModal?: () => void;
    onOpenJuvenileJudicialDecisionModal?: () => void;
    onOpenLawyerMotionModal: () => void;
    readOnly?: boolean;
};

const TAB_BASE =
    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40';

const tabShellClass = (active: boolean): string =>
    [
        'flex flex-row flex-nowrap items-center rounded-lg overflow-hidden transition-all duration-200 border whitespace-nowrap',
        active
            ? 'bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(212,175,55,0.04)]'
            : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white/90',
    ].join(' ');

const SPLIT_DIVIDER = 'border-l border-white/10 h-4 mx-1.5';

const plusButtonClass = (disabled: boolean): string =>
    [
        'inline-flex items-center justify-center px-1.5 py-1.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40',
        disabled
            ? 'opacity-40 cursor-not-allowed text-white/40'
            : 'cursor-pointer text-white/55 hover:bg-white/[0.08] hover:text-white',
    ].join(' ');

type SimpleTabProps = {
    label: string;
    filterTitle: string;
    active: boolean;
    onFilter: () => void;
};

const SimpleTab = ({ label, filterTitle, active, onFilter }: SimpleTabProps) => (
    <div className={tabShellClass(active)} role="presentation">
        <button type="button" role="tab" aria-selected={active} onClick={onFilter} title={filterTitle} className={TAB_BASE}>
            <span>{label}</span>
        </button>
    </div>
);

type SplitTabProps = {
    label: string;
    filterTitle: string;
    addTitle: string;
    active: boolean;
    disabled?: boolean;
    onFilter: () => void;
    onAdd: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const SplitTab = ({
    label,
    filterTitle,
    addTitle,
    active,
    disabled,
    onFilter,
    onAdd,
}: SplitTabProps) => (
    <div className={tabShellClass(active)} role="presentation">
        <button type="button" role="tab" aria-selected={active} onClick={onFilter} title={filterTitle} className={TAB_BASE}>
            <span>{label}</span>
        </button>
        <span className={SPLIT_DIVIDER} aria-hidden />
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (disabled) return;
                onAdd(e);
            }}
            disabled={disabled}
            title={addTitle}
            aria-label={addTitle}
            className={plusButtonClass(Boolean(disabled))}
        >
            <Plus className="w-4 h-4" aria-hidden />
        </button>
    </div>
);

export const DecisionsCommandBar = memo(function DecisionsCommandBar({
    activeFilter,
    onFilterChange,
    showTrialSessionsFilter = false,
    showInvestigationJudicialTabs = false,
    partyMix = 'adults_only',
    trialSessionsTabLabel = 'جلسات ومحاضر المرافعة',
    onOpenTrialSessionModal,
    onOpenAdultJudicialDecisionModal,
    onOpenJuvenileJudicialDecisionModal,
    onOpenLawyerMotionModal,
    readOnly = false,
}: DecisionsCommandBarProps) {
    const showAdultTab = partyMix === 'adults_only' || partyMix === 'mixed';
    /** تبويب منفصل للأحداث فقط عندما لا يوجد بالغ — في الإضبارة المشتركة تُختار قرارات الحدث من القائمة داخل «قرارات القاضي». */
    const showJuvenileTab = partyMix === 'juveniles_only';

    return (
        <div
            className="w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden print:hidden"
            dir="rtl"
        >
            <div
                className="flex flex-row flex-nowrap justify-center items-center gap-1 w-fit mx-auto bg-[#ffffff05] backdrop-blur-md border border-white/10 p-1.5 rounded-xl whitespace-nowrap"
                role="tablist"
                aria-label="فلترة سجل القرارات والطعون"
            >
            {showInvestigationJudicialTabs ? (
                <>
                    {partyMix === 'mixed' ? (
                        <SimpleTab
                            label="الكل"
                            filterTitle="عرض كل قرارات التحقيق"
                            active={activeFilter === 'all'}
                            onFilter={() => onFilterChange('all')}
                        />
                    ) : null}

                    {showAdultTab ? (
                        <SplitTab
                            label="قرارات القاضي"
                            filterTitle="عرض قرارات القاضي"
                            addTitle="إضافة قرار قضائي"
                            active={activeFilter === 'judicial'}
                            disabled={readOnly}
                            onFilter={() => onFilterChange('judicial')}
                            onAdd={() => {
                                onFilterChange('judicial');
                                onOpenAdultJudicialDecisionModal?.();
                            }}
                        />
                    ) : null}

                    {showJuvenileTab ? (
                        <SplitTab
                            label="قرارات قاضي الأحداث"
                            filterTitle="عرض قرارات قاضي الأحداث"
                            addTitle="إضافة قرار قاضي أحداث"
                            active={activeFilter === 'juvenile_judicial'}
                            disabled={readOnly}
                            onFilter={() => onFilterChange('juvenile_judicial')}
                            onAdd={() => {
                                onFilterChange('juvenile_judicial');
                                onOpenJuvenileJudicialDecisionModal?.();
                            }}
                        />
                    ) : null}
                </>
            ) : null}

            {showTrialSessionsFilter ? (
                <SplitTab
                    label={trialSessionsTabLabel}
                    filterTitle={`عرض ${trialSessionsTabLabel}`}
                    addTitle="إضافة جلسة مرافعة جديدة"
                    active={activeFilter === 'trial_sessions'}
                    disabled={readOnly}
                    onFilter={() => onFilterChange('trial_sessions')}
                    onAdd={() => {
                        onFilterChange('trial_sessions');
                        onOpenTrialSessionModal?.();
                    }}
                />
            ) : null}

            <SplitTab
                label="طلبات المحامي"
                filterTitle="عرض طلبات المحامي"
                addTitle="تقديم طلب محامي"
                active={activeFilter === 'lawyer_motion'}
                disabled={readOnly}
                onFilter={() => onFilterChange('lawyer_motion')}
                onAdd={() => {
                    onFilterChange('lawyer_motion');
                    onOpenLawyerMotionModal();
                }}
            />
        </div>
        </div>
    );
});
