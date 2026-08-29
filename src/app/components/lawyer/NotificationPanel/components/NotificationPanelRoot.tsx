import React, { type ReactNode } from 'react';
import { AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { inertProps } from '@/app/utils/inertProps';
import { NOTIFICATION_PANEL_ROOT_CLASS } from '@/app/components/lawyer/NotificationPanel/notificationPanelLayout';

type Props = {
    isOpen: boolean;
    keepAlive: boolean;
    children: ReactNode;
};

/** جذر الطبقة — الظهور من html[data-hami-notifications-open] لا من inline يخفي الورقة إطاراً */
export function NotificationPanelRoot({ isOpen, keepAlive, children }: Props) {
    if (keepAlive) {
        return (
            <div
                className={NOTIFICATION_PANEL_ROOT_CLASS}
                role="presentation"
                aria-hidden={!isOpen}
                {...inertProps(!isOpen)}
            >
                {children}
            </div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen ? (
                <div className={NOTIFICATION_PANEL_ROOT_CLASS} role="presentation">
                    {children}
                </div>
            ) : null}
        </AnimatePresence>
    );
}
