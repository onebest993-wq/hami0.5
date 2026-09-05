export type LegalCodesEmptySectionProps = {
    showLoading: boolean;
    loadError: string;
    isEmpty: boolean;
};

export function LegalCodesEmptySection({
    showLoading,
    loadError,
    isEmpty,
}: LegalCodesEmptySectionProps) {
    if (showLoading) {
        return (
            <div
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-2"
                aria-busy="true"
                aria-label="المتون القانونية"
            >
                <div className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.035]" aria-hidden />
                <div className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.035]" aria-hidden />
            </div>
        );
    }
    if (loadError) {
        return (
            <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-6 text-sm font-bold text-red-200 text-center">
                تعذر تحميل المتون القانونية: {loadError}
            </div>
        );
    }
    if (isEmpty) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm font-bold text-white/65 text-center">
                لا توجد مواد قانونية محقونة بعد في هذا القسم.
            </div>
        );
    }
    return null;
}
