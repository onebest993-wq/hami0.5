import React, { type ReactNode, type RefObject, useEffect } from 'react';
import { motion, useDragControls } from '@/app/motion/overlayMotionRuntime';
import { resolveNotificationPanelSheetStyle } from '@/app/components/lawyer/NotificationPanel/utils/notificationPanelKeyboardLayout';
import { NOTIFICATION_PANEL_SHEET_CLASS } from '@/app/components/lawyer/NotificationPanel/notificationPanelLayout';
import type { NotificationPanelRoute } from '@/app/components/lawyer/NotificationPanel/notificationPanelRoute';

type Props = {
    panelRef: RefObject<HTMLDivElement | null>;
    isOpen: boolean;
    keepAlive: boolean;
    isInboxRoute: boolean;
    panelRoute: NotificationPanelRoute;
    showListLoading: boolean;
    sheetDragEnabled: boolean;
    reduceMotion: boolean;
    keyboardInset: number;
    isDesktop: boolean;
    overlayTransition: object;
    sheetEnterTransition: object;
    sheetInitial: false | object;
    sheetExit: undefined | object;
    onClose: () => void;
    onKeyDownCapture: (e: React.KeyboardEvent) => void;
    children: ReactNode;
};

/**
 * الخلفية + الورقة.
 * الظهور/الهبوط من CSS (html[data-hami-notifications-open]) حتى لا يسبق التعتيم المحتوى.
 * Motion للسحب من الهيدر فقط — قائمة التمرير لا تُغلق الورقة.
 */
export function NotificationPanelSheet({
    panelRef,
    isOpen,
    isInboxRoute,
    panelRoute,
    showListLoading,
    sheetDragEnabled,
    keyboardInset,
    isDesktop,
    onClose,
    onKeyDownCapture,
    children,
}: Props) {
    const dragControls = useDragControls();

    useEffect(() => {
        if (!sheetDragEnabled) return;
        const root = panelRef.current;
        if (!root) return;

        const onPointerDown = (event: PointerEvent) => {
            if (event.button !== 0) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest('button, input, select, textarea, a, [role="tab"]')) return;
            if (!target.closest('.hami-notif-header')) return;
            dragControls.start(event);
        };

        root.addEventListener('pointerdown', onPointerDown);
        return () => root.removeEventListener('pointerdown', onPointerDown);
    }, [dragControls, panelRef, sheetDragEnabled]);

    return (
        <>
            <button
                type="button"
                data-testid="notification-panel-overlay"
                aria-label="إغلاق الإشعارات من الخلفية"
                tabIndex={isOpen ? 0 : -1}
                className="hami-notif-overlay-btn absolute inset-0"
                onClick={onClose}
            />

            <div className="hami-notif-sheet-track">
                <motion.div
                    ref={panelRef}
                    role={isOpen ? 'dialog' : undefined}
                    aria-label={isInboxRoute ? 'الإشعارات' : 'تحكم التنبيهات والصوت'}
                    aria-modal={isOpen ? 'true' : undefined}
                    aria-hidden={isOpen ? undefined : true}
                    aria-busy={showListLoading || undefined}
                    data-testid="notification-panel"
                    data-notification-route={panelRoute}
                    data-keyboard-inset={keyboardInset > 0 ? String(keyboardInset) : undefined}
                    onKeyDownCapture={onKeyDownCapture}
                    drag={sheetDragEnabled ? 'y' : false}
                    dragListener={false}
                    dragControls={dragControls}
                    dragMomentum={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.38 }}
                    onDragEnd={(
                        _event: unknown,
                        info: { offset: { y: number }; velocity: { y: number } },
                    ) => {
                        if (info.offset.y > 108 || info.velocity.y > 620) onClose();
                    }}
                    initial={false}
                    style={{
                        ...resolveNotificationPanelSheetStyle(keyboardInset, isDesktop),
                    }}
                    className={NOTIFICATION_PANEL_SHEET_CLASS}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    {children}
                </motion.div>
            </div>
        </>
    );
}
