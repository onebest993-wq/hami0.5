export type StageCloserModalHeaderProps = {
    stageCloserReferralOnly: boolean;
    onClose: () => void;
};

export function StageCloserModalHeader({
    stageCloserReferralOnly,
    onClose,
}: StageCloserModalHeaderProps) {
    return (
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
            <div
                id="stage-closer-title"
                className="text-white font-black text-sm whitespace-normal break-words"
            >
                {stageCloserReferralOnly
                    ? 'أوامر الإحالة — محكمة الموضوع'
                    : 'إصدار القرار الختامي للمرحلة'}
            </div>
            <button
                type="button"
                onClick={onClose}
                className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
            >
                إغلاق
            </button>
        </div>
    );
}
