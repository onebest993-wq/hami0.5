import { HUB_DOSSIER_CHROME_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { ArrowRightLeft } from '@/app/components/ui/lucideIcons';

type ConsolidationNavBarProps = {
    primaryCaseNo: string;
    secondaryLabel: string;
    activeView: 'primary' | 'secondary';
    onSelectPrimary: () => void;
    onSelectSecondary: () => void;
};

export function ConsolidationNavBar({
    primaryCaseNo,
    secondaryLabel,
    activeView,
    onSelectPrimary,
    onSelectSecondary,
}: ConsolidationNavBarProps) {
    const chipClass = (active: boolean) =>
        `flex-1 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
            active
                ? 'border-[#E6C673]/40 bg-[#E6C673]/12 text-[#E6C673]'
                : 'border-white/[0.08] bg-white/[0.03] text-white/65 hover:border-[#E6C673]/25 hover:text-white/85'
        }`;

    return (
        <div
            className={`fixed top-0 left-0 right-0 ${HUB_DOSSIER_CHROME_Z_CLASS} px-3 pt-[env(safe-area-inset-top)] pb-2 bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-[#E6C673]/15`}
            dir="rtl"
        >
            <div className="flex items-center gap-2 max-w-lg mx-auto">
                <ArrowRightLeft size={14} className="text-[#E6C673] shrink-0" />
                <button type="button" onClick={onSelectPrimary} className={chipClass(activeView === 'primary')}>
                    الدعوى الأولى ({primaryCaseNo || '—'})
                </button>
                <button type="button" onClick={onSelectSecondary} className={chipClass(activeView === 'secondary')}>
                    {secondaryLabel}
                </button>
            </div>
        </div>
    );
}
