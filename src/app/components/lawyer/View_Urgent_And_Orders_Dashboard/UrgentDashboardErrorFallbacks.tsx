import React from 'react';

export function DossierPanelErrorFallback({
    onClose,
    onRetry,
}: {
    onClose: () => void;
    onRetry: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-[#0B1021] p-6 text-center">
                <p className="text-red-400 font-extrabold text-lg">تعذّر فتح الإضبارة</p>
                <p className="mt-2 text-white/50 text-sm">
                    حدث خطأ أثناء تحميل الملف. يمكنك إعادة المحاولة أو الإغلاق.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-white/20 text-white/80 hover:bg-white/10"
                    >
                        إغلاق
                    </button>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/10"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        </div>
    );
}

export function FormModalErrorFallback({
    onClose,
    onRetry,
}: {
    onClose: () => void;
    onRetry: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-[#0B1021] p-6 text-center">
                <p className="text-red-400 font-extrabold text-lg">تعذّر فتح نموذج الطلب</p>
                <p className="mt-2 text-white/50 text-sm">حدث خطأ أثناء تحميل النموذج. يمكنك إعادة المحاولة.</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-white/20 text-white/80 hover:bg-white/10"
                    >
                        إغلاق
                    </button>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/10"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        </div>
    );
}
