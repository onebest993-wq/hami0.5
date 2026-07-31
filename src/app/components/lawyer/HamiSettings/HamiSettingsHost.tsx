import React, { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HamiSettings, type HamiSettingsProps } from '@/app/components/lawyer/HamiSettings/index';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import {
    disarmSettingsOverlayInteraction,
    removeSettingsInstantBridge,
    scheduleSettingsOverlayInteractionArm,
} from '@/app/runtime/settingsInstantPaint';
import './settingsChrome.css';

export type HamiSettingsHostProps = HamiSettingsProps & {
    /** مركّب مخفياً — الشجرة دافئة؛ الفتح = إظهار CSS فقط */
    keepAlive?: boolean;
};

function settingsHostLayerClass(open: boolean, keepAlive: boolean): string {
    return [
        'fixed inset-0 z-[200] flex flex-col overflow-hidden font-sans',
        'hami-settings-overlay-layer',
        'hami-settings-overlay-host',
        keepAlive ? 'hami-settings-overlay-layer--snap' : '',
        open ? 'hami-settings-overlay-layer--visible' : '',
    ]
        .filter(Boolean)
        .join(' ');
}

/**
 * Host — نفس معيار المستودع/المنتدى:
 * createPortal(document.body) + keepAlive + visibility + useOpaqueFeatureSurface.
 */
export function HamiSettingsHost({
    keepAlive = false,
    ...props
}: HamiSettingsHostProps): React.ReactElement | null {
    const { open = true } = props;

    useLayoutEffect(() => {
        if (!open && !keepAlive) return;
        if (open) {
            removeSettingsInstantBridge();
            scheduleSettingsOverlayInteractionArm();
            return () => disarmSettingsOverlayInteraction();
        }
        /* إغلاق: لا hydrate/warm هنا — كان ينافس إعادة الفتح السريع */
        disarmSettingsOverlayInteraction();
        return undefined;
    }, [keepAlive, open]);

    useBodyScrollLock(open);
    useOpaqueFeatureSurface(open);

    if (!open && !keepAlive) {
        return null;
    }

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className={settingsHostLayerClass(open, keepAlive)}
            style={{ backgroundColor: 'var(--hami-surface-bg, #0B1021)' }}
            data-testid="hami-settings-overlay-host"
            aria-hidden={!open}
            {...inertProps(!open)}
        >
            <HamiSettings {...props} />
        </div>,
        document.body,
    );
}
