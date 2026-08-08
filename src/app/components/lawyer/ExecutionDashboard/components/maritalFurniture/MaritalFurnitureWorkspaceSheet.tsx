import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from '@/app/components/ui/lucideIcons';
import { EXEC_MODAL_BACKDROP_STRONG } from '@/app/components/lawyer/execution/executionModalStack';
import { MARITAL_FURNITURE_WORKSPACE_Z } from './maritalFurnitureModuleConstants';

export type MaritalFurnitureWorkspaceSheetProps = {
    open: boolean;
    onClose: () => void;
    headerActions: ReactNode;
    children: ReactNode;
};

export function MaritalFurnitureWorkspaceSheet({
    open,
    onClose,
    headerActions,
    children,
}: MaritalFurnitureWorkspaceSheetProps) {
    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex flex-col ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: MARITAL_FURNITURE_WORKSPACE_Z }}
            role="dialog"
            aria-modal="true"
            aria-label="إدارة الأثاث الزوجية"
            data-testid="marital-furniture-workspace"
            onClick={onClose}
        >
            <div
                className="mt-auto flex h-[min(96dvh,100%)] w-full max-w-lg flex-col self-center overflow-hidden rounded-t-3xl border border-[#E6C673]/25 bg-[#0B1120] shadow-2xl sm:my-auto sm:h-[min(92dvh,820px)] sm:rounded-3xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0A0F1C]/95 px-3 py-3 backdrop-blur-md flex-row-reverse">
                    <button
                        type="button"
                        data-testid="marital-furniture-close"
                        onClick={onClose}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-sm font-bold text-[#E6C673]">إدارة الأثاث الزوجية</p>
                        <p className="text-[10px] text-slate-500">القائمة · الموعد · التسليم الميداني</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 flex-row-reverse">{headerActions}</div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
