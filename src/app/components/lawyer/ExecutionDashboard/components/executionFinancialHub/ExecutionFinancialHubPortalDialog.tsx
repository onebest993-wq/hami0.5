import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_OVERLAY_PHONE_BACKDROP,
    EXEC_OVERLAY_PHONE_SHEET,
} from '../../executionModalMobileShell';
import { useExecutionOverlayDismiss } from '../../useExecutionOverlayDismiss';
import type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';
import type { useExecutionFinancialHubModel } from './useExecutionFinancialHubModel';
import { ExecutionFinancialHubFocBody } from './ExecutionFinancialHubFocBody';

type Model = ReturnType<typeof useExecutionFinancialHubModel>;

export function ExecutionFinancialHubPortalDialog(
    props: ExecutionFinancialHubPortalProps & { model: Model },
) {
    const { EXEC_MODAL_Z, isRepresentingDebtor = false } = props;
    const { closeFinancialHub } = props.model;
    useExecutionOverlayDismiss(true, closeFinancialHub);

    return createPortal(
        <div
            className={EXEC_OVERLAY_PHONE_BACKDROP}
            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) closeFinancialHub();
            }}
        >
            <div
                className={`${EXEC_OVERLAY_PHONE_SHEET} sm:max-w-md`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="execution-financial-hub-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-1.5 sm:px-3.5">
                    <h2
                        id="execution-financial-hub-title"
                        className="min-w-0 truncate text-[13px] font-semibold tracking-wide text-slate-100/95"
                    >
                        {isRepresentingDebtor ? 'المركز المالي — موكل المدين' : 'المركز المالي'}
                    </h2>
                    <button
                        type="button"
                        onClick={closeFinancialHub}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق المركز المالي"
                    >
                        <X size={20} />
                    </button>
                </div>

                <ExecutionFinancialHubFocBody {...props} />
            </div>
        </div>,
        document.body,
    );
}
