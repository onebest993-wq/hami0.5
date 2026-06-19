import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';
import { AppealProceedingsSummary } from './AppealProceedingsSummary';

type AppealProceedingsToggleProps = {
    pipelineRow: Decision;
    appealPerspective?: AppealUiPerspective;
    showDetails: boolean;
    onToggle: () => void;
};

export function AppealProceedingsToggle({
    pipelineRow,
    appealPerspective,
    showDetails,
    onToggle,
}: AppealProceedingsToggleProps) {
    return (
        <>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <button
                    type="button"
                    onClick={onToggle}
                    className="text-gray-500 hover:text-white transition-colors underline decoration-dotted underline-offset-2"
                >
                    {showDetails ? 'إخفاء مسار الطعن' : 'تفاصيل الطعن'}
                </button>
            </div>
            {showDetails ? (
                <div className="transition-all duration-300 ease-in-out overflow-hidden">
                    <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                        <AppealProceedingsSummary row={pipelineRow} perspective={appealPerspective} />
                    </div>
                </div>
            ) : null}
        </>
    );
}
