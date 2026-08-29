export type TrialsTabHeaderProps = {
    readOnly?: boolean;
    dossierConcluded: boolean;
    onAddSessionClick: () => void;
};

export function TrialsTabHeader({
    readOnly,
    dossierConcluded,
    onAddSessionClick,
}: TrialsTabHeaderProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <div className="text-white font-black text-base">المحاكمات</div>
                <p className="text-white/50 text-xs mt-0.5">
                    سجل رسمي للمرافعات والأحكام — مستقل عن مسارات الساندبوكس
                </p>
            </div>
            {!readOnly && !dossierConcluded ? (
                <button
                    type="button"
                    onClick={onAddSessionClick}
                    className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2.5 text-sm font-black hover:brightness-110 transition"
                >
                    ➕ إضافة جلسة مرافعة جديدة
                </button>
            ) : null}
        </div>
    );
}
