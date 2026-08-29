import React, { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { HamiSettingsProps } from '@/app/components/lawyer/HamiSettings/hamiSettingsTypes';
import { HamiSettings } from '@/app/components/lawyer/HamiSettings/HamiSettingsApp';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import {
    disarmSettingsOverlayInteraction,
    dismissSettingsInstantBridgeIfHostReady,
    isSettingsLayerOpen,
    scheduleSettingsOverlayInteractionArm,
} from '@/app/runtime/settingsInstantPaint';
import './settingsChrome.css';

export type HamiSettingsHostProps = HamiSettingsProps & {
    /** مركّب مخفياً — الشجرة دافئة؛ الفتح = إظهار CSS فقط */
    keepAlive?: boolean;
};

function settingsHostLayerClass(open: boolean, keepAlive: boolean): string {
    return [
        'fixed inset-0 z-[200] flex h-[100dvh] flex-col overflow-hidden overscroll-none font-sans',
        'hami-settings-overlay-layer',
        'hami-settings-overlay-host',
        keepAlive ? 'hami-settings-overlay-layer--warm' : '',
        open ? 'hami-settings-overlay-layer--visible' : '',
    ]
        .filter(Boolean)
        .join(' ');
}

/**
 * Host — portal + keepAlive + visibility.
 * المحتوى sync في نفس المقطع (FullBootPath → Entry → Host) — بلا Suspense/InstantShell.
 */
export function HamiSettingsHost({
    keepAlive = false,
    ...props
}: HamiSettingsHostProps): React.ReactElement | null {
    const { open = true } = props;
    const layerOpen = isSettingsLayerOpen(open);
    const shouldMount = open || keepAlive;

    useLayoutEffect(() => {
        if (!open && !keepAlive) return;
        if (open || layerOpen) {
            dismissSettingsInstantBridgeIfHostReady();
            scheduleSettingsOverlayInteractionArm();
            return undefined;
        }
        disarmSettingsOverlayInteraction();
        return undefined;
    }, [keepAlive, layerOpen, open]);

    useBodyScrollLock(layerOpen);

    if (!shouldMount) {
        return null;
    }

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className={settingsHostLayerClass(layerOpen, keepAlive)}
            style={{ backgroundColor: '#0B1021' }}
            data-testid="hami-settings-overlay-host"
            data-hami-overlay-safe={layerOpen ? '1' : undefined}
            aria-hidden={!layerOpen}
            {...inertProps(!layerOpen)}
        >
            <HamiSettings {...props} keepAlive={keepAlive} />
        </div>,
        document.body,
    );
}
