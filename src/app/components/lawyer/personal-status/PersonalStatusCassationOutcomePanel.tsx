import { Check, Scale, X } from 'lucide-react';

type PersonalStatusCassationOutcomePanelProps = {
    onRatify: () => void;
    onQuash: () => void;
};

const RATIFY_BTN =
    'group flex-1 min-w-[9rem] py-3 rounded-xl bg-gradient-to-l from-emerald-500/[0.18] via-emerald-400/[0.08] to-white/[0.04] backdrop-blur-md border border-emerald-400/32 text-emerald-100 font-bold text-xs shadow-[0_8px_28px_rgba(52,211,153,0.14),inset_0_1px_0_rgba(167,243,208,0.18)] hover:border-emerald-400/45 hover:from-emerald-500/[0.24] transition-all flex items-center justify-center gap-2';

const QUASH_BTN =
    'group flex-1 min-w-[9rem] py-3 rounded-xl bg-gradient-to-l from-rose-500/[0.16] via-rose-400/[0.08] to-white/[0.04] backdrop-blur-md border border-rose-400/32 text-rose-100 font-bold text-xs shadow-[0_8px_28px_rgba(244,63,94,0.12),inset_0_1px_0_rgba(254,205,211,0.16)] hover:border-rose-400/45 hover:from-rose-500/[0.22] transition-all flex items-center justify-center gap-2';

export function PersonalStatusCassationOutcomePanel({
    onRatify,
    onQuash,
}: PersonalStatusCassationOutcomePanelProps) {
    return (
        <div
            className="rounded-2xl border border-[#F0A8B4]/22 bg-gradient-to-br from-[#F5C6D0]/[0.10] via-white/[0.04] to-[#ECE8E2]/[0.03] backdrop-blur-xl p-4 shadow-[inset_0_1px_0_rgba(255,220,228,0.16)]"
            data-testid="personal-status-cassation-outcome"
        >
            <div className="flex items-start gap-3 mb-3.5">
                <div className="shrink-0 w-10 h-10 rounded-xl border border-[#F0A8B4]/28 bg-gradient-to-br from-[#F5C6D0]/[0.14] to-white/[0.05] flex items-center justify-center">
                    <Scale size={17} className="text-[#FFD4DC]" strokeWidth={2} />
                </div>
                <div className="min-w-0 text-right">
                    <p className="text-sm font-bold text-[#FFFEF9] leading-snug">
                        قرار محكمة التمييز الاتحادية
                    </p>
                    <p className="text-[11px] text-[#9894A0] mt-1 leading-relaxed">
                        بعد صدور القرار، سجّل تصديق الحكم المميّز أو نقضه. عند النقض تُعاد الإضبارة
                        لمرحلة الأحوال الشخصية وتُفتح المرافعة مجدداً.
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap items-stretch gap-2.5">
                <button type="button" onClick={onRatify} className={RATIFY_BTN}>
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-400/25 group-hover:bg-emerald-500/15 transition-colors">
                        <Check size={14} strokeWidth={2.5} />
                    </span>
                    تصديق القرار
                </button>
                <button type="button" onClick={onQuash} className={QUASH_BTN}>
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-400/25 group-hover:bg-rose-500/15 transition-colors">
                        <X size={14} strokeWidth={2.5} />
                    </span>
                    نقض القرار
                </button>
            </div>
        </div>
    );
}
