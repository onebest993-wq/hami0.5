import React from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { EXEC_MODAL_CLOSE_BTN_CLASS } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';

const TAB_SLOT =
    'flex h-11 min-h-[44px] min-w-[4.5rem] shrink-0 rounded-xl border border-white/10 bg-white/[0.03]';
const BODY_SLOT = 'h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]';

function OverlayExitMark(): React.ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

export type ExecutionOverlayInstantFrameProps = {
    title: string;
    subtitle?: string;
    onClose: () => void;
    testId: string;
    closeTestId?: string;
    closeAriaLabel: string;
    labelledById: string;
    overlayClassName: string;
    panelClassName: string;
    titleClassName?: string;
    headerClassName?: string;
    headerLayout?: 'close-first' | 'title-first';
    zIndex?: number;
    portal?: boolean;
    lockBody?: boolean;
    tabSlots?: number;
    tabRowClassName?: string;
    bodySlots?: number;
};

/**
 * هيكل هندسي صامت لأي نافذة تنفيذ معلّقة — بلا نبض ولا نسخة وهمية للمحتوى.
 */
export function ExecutionOverlayInstantFrame({
    title,
    subtitle,
    onClose,
    testId,
    closeTestId,
    closeAriaLabel,
    labelledById,
    overlayClassName,
    panelClassName,
    titleClassName = 'text-base font-bold text-slate-100',
    headerClassName = 'flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3',
    headerLayout = 'close-first',
    zIndex,
    portal = false,
    lockBody = false,
    tabSlots = 0,
    tabRowClassName = 'flex w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5',
    bodySlots = 3,
}: ExecutionOverlayInstantFrameProps): React.ReactElement {
    useExecutionOverlayDismiss(true, onClose);
    useBodyScrollLock(lockBody);

    const closeBtn = (
        <button
            type="button"
            data-testid={closeTestId}
            data-hami-dialog-close
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
            className={EXEC_MODAL_CLOSE_BTN_CLASS}
            aria-label={closeAriaLabel}
        >
            <OverlayExitMark />
        </button>
    );

    const titleBlock = (
        <div className="min-w-0 flex-1 text-center">
            <h2 id={labelledById} className={titleClassName}>
                {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-[10px] text-white/40">{subtitle}</p> : null}
        </div>
    );

    const layer = (
        <div
            className={overlayClassName}
            style={zIndex != null ? { zIndex } : undefined}
            role="presentation"
            data-testid={testId}
            aria-busy="true"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={panelClassName}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledById}
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className={headerClassName}>
                    {headerLayout === 'title-first' ? (
                        <>
                            {titleBlock}
                            {closeBtn}
                        </>
                    ) : (
                        <>
                            {closeBtn}
                            {titleBlock}
                            <span className="w-9 shrink-0" aria-hidden />
                        </>
                    )}
                </div>
                {tabSlots > 0 ? (
                    <div className="shrink-0 border-b border-white/10 px-3 py-2.5" dir="rtl">
                        <div role="tablist" className={tabRowClassName} aria-hidden>
                            {Array.from({ length: tabSlots }, (_, i) => (
                                <span key={i} className={TAB_SLOT} />
                            ))}
                        </div>
                    </div>
                ) : null}
                <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden p-4">
                    {Array.from({ length: bodySlots }, (_, i) => (
                        <div key={i} className={BODY_SLOT} aria-hidden />
                    ))}
                </div>
            </div>
        </div>
    );

    if (portal && typeof document !== 'undefined') {
        return createPortal(layer, document.body);
    }
    return layer;
}

export const EXEC_OVERLAY_INSTANT_BODY_SLOT = BODY_SLOT;
