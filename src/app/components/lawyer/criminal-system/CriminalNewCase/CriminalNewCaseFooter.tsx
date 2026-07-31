export function CriminalNewCaseFooter({
    embeddedOverlay,
    isSaveBlocked,
    isSeveranceMode,
    onSubmit,
}: {
    embeddedOverlay: boolean;
    isSaveBlocked: boolean;
    isSeveranceMode: boolean;
    onSubmit: () => void;
}) {
    return (
        <div
            className={
                embeddedOverlay
                    ? 'shrink-0 p-4 bg-[#0F172A] border-t border-white/5'
                    : 'fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] bg-[#0F172A] border-t border-white/5'
            }
        >
            <button
                type="button"
                disabled={isSaveBlocked}
                className="w-full rounded-2xl bg-[#E6C673] text-[#0B1021] font-black py-4 text-base hover:brightness-110 active:brightness-95 transition disabled:opacity-40 disabled:hover:brightness-100 disabled:active:brightness-100"
                onClick={onSubmit}
            >
                {isSeveranceMode ? 'تنفيذ التفريق وإنشاء الإضبارة' : 'حفظ وإنشاء الإضبارة'}
            </button>
        </div>
    );
}
