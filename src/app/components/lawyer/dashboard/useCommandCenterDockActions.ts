import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    CALENDAR_DOCK_FEATURE,
    openCalendarFromDock,
} from '@/app/services/calendar/dockCalendarOpen';
import {
    ALERTS_DOCK_FEATURE,
    openAlertsDockFromShell,
} from '@/app/services/alerts/dockAlertsOpen';
import {
    hubArchiveIdFromWidget,
    hubShellFeature,
    openHubArchiveFromShell,
} from '@/app/services/hub/hubShellNavigation';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { prefetchHubArchiveIntent } from '@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch';
import { prefetchDockWidgetIntentImmediate } from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';
import { FORUM_SHELL_FEATURE } from '@/app/services/forum/forumShellNavigation';
import {
    HAMI_DISMISS_OVERLAYS_EVENT,
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import type { CommandCenterNote } from '../commandCenterTypes';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import type { HomeDockQuickSheetMode } from './HomeDockQuickSheet';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

/** يمنع فتح نفس أيقونة الدوك مرتين بسرعة — لكل أيقونة على حدة */
const DOCK_ACTION_COOLDOWN_MS = 120;

/** يُفتح على pointerdown — التسخين يحدث في prime بلا prefetch مكرر على النقر */
const DOCK_TOUCH_FAST_WIDGETS = new Set<HomeWidgetId>([
    'dockCalendar',
    'dockTasks',
    'dockRepository',
]);

export type CommandCenterDockActionsOptions = {
    userId?: string;
    onOpenCalendar?: () => void;
    onOpenFullNotepad?: () => void;
    onOpenRepository?: (opts?: { tab?: 'notepad' | 'vault'; scanner?: boolean; notepadMode?: 'list' | 'create' }) => void;
    onOpenFieldTasksSheet?: () => void;
    onOpenCommunity?: () => void;
    onAddNote?: (note: CommandCenterNote) => void | Promise<void>;
    onOpenArchive?: (id: string) => void;
    onOpenVault?: () => void;
    secretaryAlerts?: SecretaryAlert[];
    onNavigateRoute?: (routePath: string) => void;
    onOpenEntity?: (alert: SecretaryAlert) => void;
    onUnpinItem?: (id: string, type: string) => void;
    pinnedCount?: number;
    urgentAlertsCount?: number;
};

export function useCommandCenterDockActions({
    userId,
    onOpenCalendar,
    onOpenFullNotepad,
    onOpenRepository,
    onOpenFieldTasksSheet,
    onOpenCommunity,
    onOpenArchive,
    onOpenVault,
    secretaryAlerts = [],
    onNavigateRoute,
    onOpenEntity,
    onUnpinItem,
    pinnedCount = 0,
    urgentAlertsCount = 0,
}: CommandCenterDockActionsOptions) {
    const [hubDockSheet, setHubDockSheet] = useState<HomeDockQuickSheetMode>(null);
    const lastDockActionAtRef = useRef<Partial<Record<HomeWidgetId, number>>>({});

    useEffect(() => {
        const onDismiss = (_e: Event) => {
            setHubDockSheet(null);
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    const requireSignedIn = useCallback(
        (feature: string): boolean => {
            if (isRealSignedIn(userId)) return true;
            SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${feature}`);
            return false;
        },
        [userId],
    );

    const openSmartRepository = useCallback(() => {
        if (onOpenRepository) onOpenRepository({ tab: 'notepad' });
        else onOpenFullNotepad?.();
    }, [onOpenFullNotepad, onOpenRepository]);

    const resolveDockWidgetClick = useCallback(
        (widgetId: HomeWidgetId, isEditing: boolean): (() => void) | undefined => {
            if (isEditing) return undefined;

            const run = (handler: () => void) => () => {
                const now = Date.now();
                const last = lastDockActionAtRef.current[widgetId] ?? 0;
                if (now - last < DOCK_ACTION_COOLDOWN_MS) return;
                lastDockActionAtRef.current[widgetId] = now;
                if (!DOCK_TOUCH_FAST_WIDGETS.has(widgetId)) {
                    prefetchDockWidgetIntentImmediate(widgetId);
                }
                handler();
            };

            switch (widgetId) {
                case 'dockRepository':
                    return run(() => {
                        if (!requireSignedIn('المستودع')) return;
                        openSmartRepository();
                    });
                case 'dockNotepad':
                    return run(() => {
                        if (!requireSignedIn('المستودع')) return;
                        openSmartRepository();
                    });
                case 'dockCalendar':
                    return run(() => {
                        openCalendarFromDock({
                            signedIn: requireSignedIn(CALENDAR_DOCK_FEATURE),
                            onSignedOut: () => undefined,
                            onOpenCalendar: () => {
                                /* إغلاق الطبقات يحدث داخل commitScheduleTabOpen — بلا dismiss مبكر يكشف #0a0f1c */
                                if (onOpenCalendar) onOpenCalendar();
                                else SmartToast.info('📅 فتح التقويم...');
                            },
                        });
                    });
                case 'dockVault':
                    return run(() => {
                        if (!requireSignedIn('المستودع')) return;
                        if (onOpenRepository || onOpenFullNotepad) {
                            openSmartRepository();
                            return;
                        }
                        if (onOpenVault) onOpenVault();
                        else SmartToast.info('المستودع');
                    });
                case 'dockTasks':
                    return run(() => {
                        if (!requireSignedIn('مهام اليوم')) return;
                        dismissTransientOverlays('field-tasks');
                        if (onOpenFieldTasksSheet) onOpenFieldTasksSheet();
                        else SmartToast.info('مهام اليوم');
                    });
                case 'alerts':
                    return run(() => {
                        openAlertsDockFromShell({
                            signedIn: requireSignedIn(ALERTS_DOCK_FEATURE),
                            pinnedCount,
                            urgentAlertsCount,
                            onSignedOut: () => undefined,
                            onOpen: (mode) => {
                                dismissTransientOverlays();
                                setHubDockSheet(mode);
                            },
                        });
                    });
                case 'dockQuickNote':
                    return run(() => {
                        if (!requireSignedIn('المستودع')) return;
                        dismissTransientOverlays('repository');
                        if (onOpenRepository) onOpenRepository({ tab: 'notepad', notepadMode: 'create' });
                        else onOpenFullNotepad?.();
                    });
                case 'forum':
                    return run(() => {
                        if (!requireSignedIn(FORUM_SHELL_FEATURE)) return;
                        if (onOpenCommunity) onOpenCommunity();
                        else SmartToast.info(FORUM_SHELL_FEATURE);
                    });
                case 'hubExecution':
                case 'hubLawsuit':
                case 'hubTransaction': {
                    const archiveId = hubArchiveIdFromWidget(widgetId);
                    if (!archiveId) return undefined;
                    return run(() => {
                        openHubArchiveFromShell({
                            signedIn: requireSignedIn(hubShellFeature(archiveId)),
                            archiveId,
                            onSignedOut: () => undefined,
                            onOpen: (id) => {
                                dismissTransientOverlays();
                                prefetchHubArchiveIntent(id);
                                onOpenArchive?.(id);
                            },
                        });
                    });
                }
                default:
                    return undefined;
            }
        },
        [
            onOpenFullNotepad,
            onOpenRepository,
            onOpenCalendar,
            requireSignedIn,
            openSmartRepository,
            onOpenFieldTasksSheet,
            onOpenCommunity,
            onOpenArchive,
            onOpenVault,
            pinnedCount,
            urgentAlertsCount,
        ],
    );

    return {
        resolveDockWidgetClick,
        hubDockSheet,
        setHubDockSheet,
        secretaryAlerts,
        onNavigateRoute,
        onOpenEntity,
        onUnpinItem,
    };
}

export type CommandCenterDockActions = ReturnType<typeof useCommandCenterDockActions>;
