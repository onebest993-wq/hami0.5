import React, { Suspense, useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { ALERTS_DOCK_FEATURE } from '@/app/services/alerts/dockAlertsOpen';
import {
    guardedHomeHubNavigateRoute,
    isSafeHomeHubNavigateRoute,
    openHomeHubCardInteraction,
} from '@/app/services/alerts/homeHubCardLogic';
import type { CommandCenterDockActions } from './useCommandCenterDockActions';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { WorkspacePinnedItem } from '@/app/workspace/types';

const HomeDockQuickSheet = React.lazy(() =>
    import('./HomeDockQuickSheet').then((m) => ({ default: m.HomeDockQuickSheet })),
);

type CommandCenterOverlaysProps = {
    userId?: string;
    actions: CommandCenterDockActions;
    onNavigateRoute?: (routePath: string) => void;
};

export function CommandCenterOverlays({ userId, actions, onNavigateRoute }: CommandCenterOverlaysProps) {
    const { hubDockSheet, setHubDockSheet, secretaryAlerts, onOpenEntity, onUnpinItem } = actions;
    const pinnedItems = useWorkspaceStore((s) => s.pinnedItems);
    const signedIn = isRealSignedIn(userId);

    const guardInteraction = useCallback(
        (onProceed: () => void) => {
            openHomeHubCardInteraction({
                signedIn,
                onProceed,
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${ALERTS_DOCK_FEATURE}`),
            });
        },
        [signedIn],
    );

    const navigateGuarded = useCallback(
        (path: string) => {
            const ok = guardedHomeHubNavigateRoute(
                path,
                signedIn,
                (safePath) => onNavigateRoute?.(safePath),
                () => SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${ALERTS_DOCK_FEATURE}`),
            );
            if (!ok && signedIn && path.trim() && !isSafeHomeHubNavigateRoute(path)) {
                SmartToast.warning('تعذر فتح هذا العنصر — المسار غير صالح');
            }
        },
        [onNavigateRoute, signedIn],
    );

    return (
        <div className="z-50">
            {/* null fallback = sheet closed; motion chunk loads only when sheet mounts */}
            <Suspense fallback={null}>
                <HomeDockQuickSheet
                    mode={hubDockSheet}
                    onClose={() => setHubDockSheet(null)}
                    secretaryAlerts={secretaryAlerts ?? []}
                    pinnedItems={pinnedItems}
                    onNavigateRoute={navigateGuarded}
                    onOpenEntity={(alert: SecretaryAlert) =>
                        guardInteraction(() => onOpenEntity?.(alert))
                    }
                    onUnpin={(id: string, type: WorkspacePinnedItem['type']) =>
                        guardInteraction(() => onUnpinItem?.(id, type))
                    }
                />
            </Suspense>
        </div>
    );
}
