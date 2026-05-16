import React, { useState } from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { Dashboard_Active_Order_File } from './Dashboard_Active_Order_File';

export type ActiveOrderFileProps = {
    fileData: unknown;
    onClose: () => void;
    onCaseUpdated?: (caseId: string, patch: Record<string, unknown>) => void;
};

/** متوافق مع الاستدعاءات القديمة — الاستيراد أصبح ثابتاً ضمن حزمة الطلبات المستعجلة */
export function resetActiveOrderFilePanelCache(): void {
    /* no-op */
}

/** متوافق مع الاستدعاءات القديمة */
export function preloadActiveOrderFilePanel(): void {
    /* no-op */
}

function DossierRenderFailed({
    onClose,
    onRetry,
}: {
    onClose: () => void;
    onRetry: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#0B1021] p-6 text-center">
                <p className="text-amber-300 font-extrabold text-lg">خطأ أثناء عرض الإضبارة</p>
                <p className="mt-2 text-white/50 text-sm">حدث خطأ في مساحة العمل. جرّب إعادة المحاولة أو أغلق الملف وافتحه من جديد.</p>
                <div className="mt-4 flex gap-2 justify-center">
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

/**
 * غلاف الإضبارة — يستورد مساحة العمل بشكل ثابت (لا dynamic import)
 * لتفادي "Failed to fetch dynamically imported module" في Vite أثناء التطوير.
 */
export const DeferredActiveOrderFile: React.FC<ActiveOrderFileProps> = (props) => {
    const [retryKey, setRetryKey] = useState(0);

    return (
        <ErrorBoundary
            key={retryKey}
            fallback={
                <DossierRenderFailed
                    onClose={props.onClose}
                    onRetry={() => setRetryKey((k) => k + 1)}
                />
            }
            onError={(error, info) => {
                console.error('[ActiveOrderFile] render error:', error, info.componentStack);
            }}
        >
            <Dashboard_Active_Order_File {...props} />
        </ErrorBoundary>
    );
};
