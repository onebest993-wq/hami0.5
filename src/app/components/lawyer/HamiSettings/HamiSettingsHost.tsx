import React, { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { HamiSettingsProps } from '@/app/components/lawyer/HamiSettings/hamiSettingsTypes';
import { HamiSettings } from '@/app/components/lawyer/HamiSettings/HamiSettingsApp';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    disarmSettingsOverlayInteraction,
    dismissSettingsInstantBridgeIfHostReady,
    isSettingsLayerOpen,
    scheduleSettingsOverlayInteractionArm,
} from '@/app/runtime/settingsInstantPaint';
import { detachSettingsInstantBridge } from '@/app/runtime/settingsInstantPaintBridge';
import {
    adoptSettingsOverlayHostNode,
    markSettingsOverlayHostReactOwned,
    resolveSettingsOverlayHostNode,
    syncSettingsOverlayHostAppearance,
} from '@/app/runtime/settingsInstantPaintHostAdopt';
import './settingsChrome.css';

type HamiSettingsHostProps = HamiSettingsProps & {
    /** مركّب مخفياً — الشجرة دافئة؛ الفتح = إظهار CSS فقط */
    keepAlive?: boolean;
};

/**
 * Host — portal داخل عقدة overlay موحّدة (قشرة الطلاء تُركَّب في نفس الطبقة).
 * المحتوى sync في نفس المقطع — بلا Suspense/InstantShell.
 */
export function HamiSettingsHost({
    keepAlive = false,
    ...props
}: HamiSettingsHostProps): React.ReactElement | null {
    const { open = true } = props;
    const layerOpen = isSettingsLayerOpen(open);
    const shouldMount = open || keepAlive;

    useLayoutEffect(() => {
        if (!shouldMount) {
            detachSettingsInstantBridge();
            resolveSettingsOverlayHostNode()?.remove();
            return undefined;
        }
        const host = adoptSettingsOverlayHostNode();
        if (!host) return undefined;
        markSettingsOverlayHostReactOwned(host);
        syncSettingsOverlayHostAppearance(host, { layerOpen, keepAlive });
        if (open || layerOpen) {
            dismissSettingsInstantBridgeIfHostReady();
            scheduleSettingsOverlayInteractionArm();
            return undefined;
        }
        disarmSettingsOverlayInteraction();
        return undefined;
    }, [keepAlive, layerOpen, open, shouldMount]);

    useLayoutEffect(() => {
        return () => {
            detachSettingsInstantBridge();
            resolveSettingsOverlayHostNode()?.remove();
        };
    }, []);

    useBodyScrollLock(layerOpen);

    if (!shouldMount) {
        return null;
    }

    if (typeof document === 'undefined') {
        return null;
    }

    const host = adoptSettingsOverlayHostNode();
    if (!host) return null;

    return createPortal(
        <HamiSettings {...props} keepAlive={keepAlive} />,
        host,
    );
}
