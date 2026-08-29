import { Check } from '@/app/components/ui/icons/Check';
import { X } from '@/app/components/ui/icons/X';

type PersonalStatusCassationOutcomePanelProps = {
    onRatify: () => void;
    onQuash: () => void;
};

const RATIFY_BTN =
    'flex-1 min-w-[8rem] min-h-[44px] py-2 rounded-md bg-emerald-500/[0.1] border border-emerald-400/28 text-emerald-100 font-bold text-xs hover:bg-emerald-500/[0.14] transition-colors flex items-center justify-center gap-1.5';

const QUASH_BTN =
    'flex-1 min-w-[8rem] min-h-[44px] py-2 rounded-md bg-rose-500/[0.08] border border-rose-400/28 text-rose-100 font-bold text-xs hover:bg-rose-500/[0.12] transition-colors flex items-center justify-center gap-1.5';

export function PersonalStatusCassationOutcomePanel({
    onRatify,
    onQuash,
}: PersonalStatusCassationOutcomePanelProps) {
    return (
        <div className="p-2" data-testid="personal-status-cassation-outcome">
            <p className="mb-2 text-right text-[12px] font-bold text-white/88">
                قرار محكمة التمييز الاتحادية
            </p>
            <div className="flex flex-wrap items-stretch gap-2">
                <button type="button" onClick={onRatify} className={RATIFY_BTN}>
                    <Check size={14} strokeWidth={2.5} />
                    تصديق القرار
                </button>
                <button type="button" onClick={onQuash} className={QUASH_BTN}>
                    <X size={14} strokeWidth={2.5} />
                    نقض القرار
                </button>
            </div>
        </div>
    );
}
