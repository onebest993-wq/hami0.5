import {
    isJuvenileJudgeCassationAppealableTemplate,
} from '../proceduralRequestTypes';

export type RequestModalJudicialAppealableToggleProps = {
    reqTypeTemplate: string;
    reqIsAppealable?: boolean;
    onAppealableChange?: (value: boolean) => void;
};

/**
 * عَلامة «قابل للتمييز» — تفاعلية أو ثابتة حسب قابلية التمييز التلقائية للأحداث.
 */
export function RequestModalJudicialAppealableToggle({
    reqTypeTemplate,
    reqIsAppealable = false,
    onAppealableChange,
}: RequestModalJudicialAppealableToggleProps) {
    const handleAppealableToggle = () => {
        if (onAppealableChange) onAppealableChange(!reqIsAppealable);
    };
    const isJuvenileAutoAppealable = isJuvenileJudgeCassationAppealableTemplate(reqTypeTemplate);
    const displayAppealable = isJuvenileAutoAppealable ? true : reqIsAppealable;
    const isAppealableInteractive = Boolean(onAppealableChange) && !isJuvenileAutoAppealable;
    const appealableToggleClass = displayAppealable
        ? 'border-[#E6C673]/55 bg-[#E6C673]/10 text-[#E6C673]'
        : 'border-slate-600/55 bg-slate-800/40 text-white/55';
    const appealableToggleTitle = displayAppealable
        ? 'قَرار قابل للطعن التمييزي — انقر لإيقاف العَلامة'
        : 'العَلامة مُوقفة — انقر لإعادة تَفعيل قابلية التمييز';

    if (isAppealableInteractive) {
        return (
            <button
                type="button"
                role="switch"
                aria-checked={displayAppealable}
                onClick={handleAppealableToggle}
                title={appealableToggleTitle}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words transition hover:brightness-110 ${appealableToggleClass}`}
            >
                <span aria-hidden>{displayAppealable ? '✅' : '⬜'}</span>
                <span aria-hidden>⚖️</span>
                <span>{displayAppealable ? 'قابل للتمييز' : 'غير قابل للتمييز'}</span>
            </button>
        );
    }

    return (
        <div
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${appealableToggleClass}`}
            title={displayAppealable ? 'قرار قابل للطعن التمييزي' : 'قرار غير قابل للطعن التمييزي'}
        >
            <span aria-hidden>⚖️</span>
            <span>{displayAppealable ? 'قابل للتمييز' : 'غير قابل للتمييز'}</span>
        </div>
    );
}
