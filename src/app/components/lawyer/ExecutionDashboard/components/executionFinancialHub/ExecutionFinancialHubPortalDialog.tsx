import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_TRASH_SHELL_MAX,
} from '../../executionModalMobileShell';
import { useExecutionOverlayDismiss } from '../../useExecutionOverlayDismiss';
import type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';
import type { useExecutionFinancialHubModel } from './useExecutionFinancialHubModel';
import { ExecutionFinancialHubFocBody } from './ExecutionFinancialHubFocBody';

type Model = ReturnType<typeof useExecutionFinancialHubModel>;

export function ExecutionFinancialHubPortalDialog(
    props: ExecutionFinancialHubPortalProps & { model: Model },
) {
    const { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z, isRepresentingDebtor = false } = props;
    const { closeFinancialHub } = props.model;
    useExecutionOverlayDismiss(true, closeFinancialHub);

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) closeFinancialHub();
            }}
        >
            <div
                className={`flex ${EXEC_MODAL_TRASH_SHELL_MAX} w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E6C673]/40 bg-[#0B1120] shadow-md`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="execution-financial-hub-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[#E6C673]/30 bg-[#0B1120] p-3">
                    <button
                        type="button"
                        onClick={closeFinancialHub}
                        className={`${EXEC_MODAL_CLOSE_BTN_CLASS} text-slate-400 hover:bg-[#E6C673]/15 hover:text-white`}
                        aria-label="إغلاق المركز المالي"
                    >
                        <X size={20} />
                    </button>
                    <h2
                        id="execution-financial-hub-title"
                        className="flex flex-row-reverse items-center gap-2 text-base font-bold text-[#E6C673]"
                    >
                        <Wallet size={20} className="shrink-0 text-[#E6C673]" />
                        {isRepresentingDebtor ? 'المركز المالي — موكل المدين' : 'المركز المالي'}
                    </h2>
                    <span className="w-9 shrink-0" aria-hidden />
                </div>

                <ExecutionFinancialHubFocBody {...props} />
            </div>
        </div>,
        document.body,
    );
}
