import React from 'react';

function OverlayErrorFallback({
    title,
    message,
    onClose,
    onRetry,
}: {
    title: string;
    message: string;
    onClose: () => void;
    onRetry: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-xl border border-red-500/30 bg-[#0B1021] p-4 text-center">
                <p className="text-red-400 font-bold text-sm">{title}</p>
                <p className="mt-2 text-white/50 text-sm">{message}</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] text-xs font-bold rounded-xl px-4 py-2 border border-white/20 text-white/80 hover:bg-white/10 touch-manipulation"
                    >
                        إغلاق
                    </button>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="min-h-[44px] text-xs font-bold rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/10 touch-manipulation"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DossierPanelErrorFallback({
    onClose,
    onRetry,
}: {
    onClose: () => void;
    onRetry: () => void;
}) {
    return (
        <OverlayErrorFallback
            title="تعذّر فتح الإضبارة"
            message="حدث خطأ أثناء تحميل الملف. يمكنك إعادة المحاولة أو الإغلاق."
            onClose={onClose}
            onRetry={onRetry}
        />
    );
}

export function FormOverlayLoadingFallback() {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
            <div className="rounded-xl border border-white/10 bg-[#0B1021] px-4 py-3 text-center">
                <p className="text-white font-extrabold text-sm">جاري تحميل نموذج الطلب…</p>
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
        <OverlayErrorFallback
            title="تعذّر فتح نموذج الطلب"
            message="حدث خطأ أثناء تحميل النموذج. يمكنك إعادة المحاولة."
            onClose={onClose}
            onRetry={onRetry}
        />
    );
}
