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
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm font-bold text-white/65 text-center">
                جاري تحميل المتون القانونية...
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
