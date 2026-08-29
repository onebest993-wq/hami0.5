import React, { Suspense, memo, useEffect, useLayoutEffect, useRef } from 'react';
import {
    EXECUTION_ARCHIVE_INSTANT_CLOSE_BTN,
    EXECUTION_ARCHIVE_INSTANT_HEADER,
    EXECUTION_ARCHIVE_INSTANT_HEADER_ROW,
    EXECUTION_ARCHIVE_INSTANT_TITLE,
} from '@/app/components/lawyer/ArchivePortal/executionArchiveVisualLite';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { blurFocusWithin, inertProps } from '@/app/utils/inertProps';
import { isExecutionCreateCloseGuardArmed } from '@/app/components/lawyer/dashboard/executionCreateCloseGuard';
import { ExecutionArchiveHostOpenContext } from '@/app/components/lawyer/dashboard/executionArchiveHostOpenContext';
import { ExecutionArchiveInstantBody } from '@/app/components/lawyer/dashboard/ExecutionArchiveInstantBody';
import { prefetchExecutionArchiveContent } from '@/app/runtime/hubArchiveLoader';

/**
 * قشرة مخزن التنفيذ — keep-alive: تبقى مركّبة مخفية بعد التسليح؛ الفتح = إظهار فوري بلا إعادة تركيب.
 * قفل التمرير وEscape يملكهما MainView (`useLawyerExecutionOverlayEscape`) لأن المحتوى مضمّن.
 */
export const ExecutionArchiveInstantChrome = memo(function ExecutionArchiveInstantChrome({
    open,
    onClose,
    children,
    contentInteractive = true,
    onAddNew,
}: {
    open: boolean;
    onClose: () => void;
    children?: React.ReactNode;
    /** يُعطَّل أثناء نموذج الإنشاء حتى لا تخترق نقرة الإغلاق زر إغلاق المخزن */
    contentInteractive?: boolean;
    onAddNew?: () => void;
}): React.ReactElement {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        prefetchExecutionArchiveContent();
        void import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry'
        ).catch(() => undefined);
    }, []);

    useLayoutEffect(() => {
        const node = rootRef.current;
        if (!node) return;
        if (open) {
            node.removeAttribute('inert');
            return;
        }
        node.setAttribute('inert', '');
        blurFocusWithin(node);
    }, [open]);

    const createCloseGuardArmed = isExecutionCreateCloseGuardArmed();
    const chromeInteractive = Boolean(open && contentInteractive && !createCloseGuardArmed);

    return (
        <ExecutionArchiveHostOpenContext.Provider value={open}>
            <div
                ref={rootRef}
                className="fixed inset-0 bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
                style={{
                    zIndex: open ? 220 : -1,
                    visibility: open ? 'visible' : 'hidden',
                    /* مفتوح = يبتلع النقرات. none يمرّرها إلى الهيدر (خارج inert التبويب) ويُغلق المخزن */
                    pointerEvents: open ? 'auto' : 'none',
                }}
                data-testid="execution-archive-shell"
                data-open={open ? 'true' : 'false'}
                data-hami-overlay-safe={open ? '1' : undefined}
                role="dialog"
                aria-modal={open}
                aria-hidden={!open}
                aria-label="مخزن الأضابير التنفيذية"
                {...inertProps(!open)}
            >
                <div className={EXECUTION_ARCHIVE_INSTANT_HEADER}>
                    <div className={EXECUTION_ARCHIVE_INSTANT_HEADER_ROW}>
                        <h2 className={EXECUTION_ARCHIVE_INSTANT_TITLE}>
                            مخزن الأضابير التنفيذية
                        </h2>
                        <button
                            type="button"
                            onPointerDown={(event) => {
                                if (isExecutionCreateCloseGuardArmed()) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }
                            }}
                            onPointerUp={(event) => {
                                if (isExecutionCreateCloseGuardArmed()) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }
                            }}
                            onClick={(event) => {
                                if (isExecutionCreateCloseGuardArmed()) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    return;
                                }
                                onClose();
                            }}
                            disabled={!chromeInteractive}
                            className={`${EXECUTION_ARCHIVE_INSTANT_CLOSE_BTN} disabled:pointer-events-none`}
                            aria-label="إغلاق مخزن الأضابير التنفيذية"
                            data-testid="execution-archive-close"
                            tabIndex={chromeInteractive ? 0 : -1}
                        >
                            <HomeXIcon size={18} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden bg-[#0B1021]">
                    <Suspense fallback={<ExecutionArchiveInstantBody onAddAction={onAddNew} />}>
                        {children}
                    </Suspense>
                </div>
            </div>
        </ExecutionArchiveHostOpenContext.Provider>
    );
});
