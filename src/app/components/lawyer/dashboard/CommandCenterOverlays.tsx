import React, { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { HomeDockQuickSheet } from './HomeDockQuickSheet';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { ALERTS_DOCK_FEATURE } from '@/app/services/alerts/dockAlertsOpen';
import { openHomeHubCardInteraction } from '@/app/services/alerts/homeHubCardLogic';
import type { CommandCenterDockActions } from './useCommandCenterDockActions';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { WorkspacePinnedItem } from '@/app/workspace/types';

type CommandCenterOverlaysProps = {
    userId?: string;
    actions: CommandCenterDockActions;
    onNavigateRoute?: (routePath: string) => void;
};

export function CommandCenterOverlays({ userId, actions, onNavigateRoute }: CommandCenterOverlaysProps) {
    const { hubDockSheet, setHubDockSheet, secretaryAlerts, onOpenEntity, onUnpinItem } = actions;
    const pinnedItems = useWorkspaceStore((s) => s.pinnedItems);

    const guardInteraction = useCallback(
        (onProceed: () => void) => {
            openHomeHubCardInteraction({
                signedIn: isRealSignedIn(userId),
                onProceed,
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${ALERTS_DOCK_FEATURE}`),
            });
        },
        [userId],
    );

    return (
        <div className="z-50">
            <HomeDockQuickSheet
                mode={hubDockSheet}
                onClose={() => setHubDockSheet(null)}
                secretaryAlerts={secretaryAlerts ?? []}
                pinnedItems={pinnedItems}
                onNavigateRoute={(path) => guardInteraction(() => onNavigateRoute?.(path))}
                onOpenEntity={(alert: SecretaryAlert) =>
                    guardInteraction(() => onOpenEntity?.(alert))
                }
                onUnpin={(id: string, type: WorkspacePinnedItem['type']) =>
                    guardInteraction(() => onUnpinItem?.(id, type))
                }
            />
        </div>
    );
}
