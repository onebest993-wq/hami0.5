import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { CriminalStatementModalSaveConfirm } from './CriminalStatementModalFooter';

export type CriminalStatementModalShellProps = {
    onClose: () => void;
    children: ReactNode;
    saveConfirmOpen: boolean;
    setSaveConfirmOpen: Dispatch<SetStateAction<boolean>>;
    submit: () => void;
};

export function CriminalStatementModalShell({
    onClose,
    children,
    saveConfirmOpen,
    setSaveConfirmOpen,
    submit,
}: CriminalStatementModalShellProps) {
    return (
        <div className="fixed inset-0 z-[221] bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden max-h-[min(94vh,800px)] flex flex-col relative">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3 shrink-0">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        سجل الإفادات
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] px-3 text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words touch-manipulation"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">{children}</div>

                <CriminalStatementModalSaveConfirm
                    saveConfirmOpen={saveConfirmOpen}
                    setSaveConfirmOpen={setSaveConfirmOpen}
                    submit={submit}
                />
            </div>
        </div>
    );
}
