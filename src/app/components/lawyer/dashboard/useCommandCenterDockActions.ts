import { useCallback, useEffect, useState } from 'react';
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
import { prefetchCommunityScreen, prefetchSmartLegalRadar } from '@/app/utils/lazyComponents';
import {
    FORUM_SHELL_FEATURE,
    openLawyerForumFromShell,
} from '@/app/services/forum/forumShellNavigation';
import {
    HAMI_DISMISS_OVERLAYS_EVENT,
    dismissTransientOverlays,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
import type { CommandCenterNote, VoiceNoteSavePayload } from '../commandCenterTypes';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import type { HomeDockQuickSheetMode } from './HomeDockQuickSheet';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { createQuickNoteId, inferQuickNoteType } from './quickNoteUtils';
import { focusSovereignPromptInput } from './sovereignPromptFocus';
import { useQuickNoteDraft } from './useQuickNoteDraft';
import {
    isVoiceBlobWithinLimit,
    isVoiceDurationValid,
    persistVoiceRecording,
} from '@/app/services/voice/voiceRecordingLimits';

export type VoiceNotePayload = VoiceNoteSavePayload;

export type CommandCenterDockActionsOptions = {
    userId?: string;
    onOpenCalendar?: () => void;
    onOpenFullNotepad?: () => void;
    onOpenFieldTasksSheet?: () => void;
    onOpenCommunity?: () => void;
    onAddNote?: (note: CommandCenterNote) => void;
    onOpenArchive?: (id: string) => void;
    onPrefetchExecution?: () => void;
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
    onOpenFieldTasksSheet,
    onOpenCommunity,
    onAddNote,
    onOpenArchive,
    onPrefetchExecution,
    secretaryAlerts = [],
    onNavigateRoute,
    onOpenEntity,
    onUnpinItem,
    pinnedCount = 0,
    urgentAlertsCount = 0,
}: CommandCenterDockActionsOptions) {
    const [showVault, setShowVault] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const { quickNote, setQuickNote, clearQuickNote } = useQuickNoteDraft(userId);
    const [hubDockSheet, setHubDockSheet] = useState<HomeDockQuickSheetMode>(null);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'vault') setShowVault(false);
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

    const openVoiceModal = useCallback(() => {
        if (!requireSignedIn('التسجيل الصوتي')) return;
        setShowVoiceModal(true);
    }, [requireSignedIn]);

    const saveQuickNote = useCallback(
        (text: string) => {
            if (!requireSignedIn('الملاحظة السريعة')) return;

            const cleanText = text.trim();
            if (!cleanText) {
                SmartToast.info('اكتب ملاحظة أولاً');
                return;
            }
            if (!onAddNote) {
                SmartToast.error('تعذّر حفظ الملاحظة — حاول مجدداً');
                return;
            }

            const type = inferQuickNoteType(cleanText);

            onAddNote({
                id: createQuickNoteId(),
                content: cleanText,
                type,
                date: new Date(),
            });

            SmartToast.success(type === 'schedule' ? 'تمت جدولة الموعد في التقويم 📅' : 'تم حفظ الملاحظة 📝');
            clearQuickNote();
        },
        [clearQuickNote, onAddNote, requireSignedIn],
    );

    const saveVoiceNote = useCallback(
        async (payload: VoiceNotePayload) => {
            if (!requireSignedIn('التسجيل الصوتي')) return;
            if (!isVoiceDurationValid(payload.durationSeconds)) {
                SmartToast.error('التسجيل قصير جداً أو تجاوز 3 دقائق');
                return;
            }
            if (!isVoiceBlobWithinLimit(payload.blob.size)) {
                SmartToast.error('حجم التسجيل غير مدعوم');
                return;
            }
            if (!onAddNote) {
                SmartToast.error('تعذّر حفظ التسجيل — حاول مجدداً');
                return;
            }

            const noteId = createQuickNoteId();
            try {
                const { body } = await persistVoiceRecording(noteId, payload.blob);
                const transcript = payload.transcript?.trim();

                onAddNote({
                    id: noteId,
                    content: body,
                    type: 'voice',
                    transcript: transcript || undefined,
                    durationSeconds: payload.durationSeconds,
                    date: new Date(),
                });

                SmartToast.success(
                    transcript
                        ? 'تم حفظ التسجيل والنص في المفكرة 🎙️'
                        : 'تم حفظ التسجيل في المفكرة 🎙️',
                );
                setShowVoiceModal(false);
            } catch {
                SmartToast.error('تعذّر حفظ التسجيل — حجم كبير أو مساحة غير كافية');
            }
        },
        [onAddNote, requireSignedIn],
    );

    const resolveDockWidgetClick = useCallback(
        (widgetId: HomeWidgetId, isEditing: boolean): (() => void) | undefined => {
            if (isEditing) return undefined;

            switch (widgetId) {
                case 'dockNotepad':
                    return () => {
                        if (!requireSignedIn('المفكرة')) return;
                        if (onOpenFullNotepad) onOpenFullNotepad();
                        else SmartToast.info('المفكرة الكاملة');
                    };
                case 'dockCalendar':
                    return () => {
                        openCalendarFromDock({
                            signedIn: requireSignedIn(CALENDAR_DOCK_FEATURE),
                            onSignedOut: () => undefined,
                            onOpenCalendar: () => {
                                dismissTransientOverlays();
                                prefetchSmartLegalRadar();
                                if (onOpenCalendar) onOpenCalendar();
                                else SmartToast.info('📅 فتح التقويم...');
                            },
                        });
                    };
                case 'dockVault':
                    return () => {
                        if (!requireSignedIn('مخزن الملفات')) return;
                        dismissTransientOverlays('vault');
                        setShowVault(true);
                    };
                case 'dockTasks':
                    return () => {
                        if (!requireSignedIn('مهام اليوم')) return;
                        dismissTransientOverlays('field-tasks');
                        if (onOpenFieldTasksSheet) onOpenFieldTasksSheet();
                        else SmartToast.info('مهام اليوم');
                    };
                case 'alerts':
                    return () => {
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
                    };
                case 'dockQuickNote':
                    return () => focusSovereignPromptInput();
                case 'forum':
                    return () => {
                        openLawyerForumFromShell({
                            signedIn: requireSignedIn(FORUM_SHELL_FEATURE),
                            onOpen: () => {
                                dismissTransientOverlays();
                                prefetchCommunityScreen();
                                if (onOpenCommunity) onOpenCommunity();
                                else SmartToast.info(FORUM_SHELL_FEATURE);
                            },
                        });
                    };
                case 'hubExecution':
                case 'hubLawsuit':
                case 'hubTransaction': {
                    const archiveId = hubArchiveIdFromWidget(widgetId);
                    if (!archiveId) return undefined;
                    return () => {
                        openHubArchiveFromShell({
                            signedIn: requireSignedIn(hubShellFeature(archiveId)),
                            archiveId,
                            onSignedOut: () => undefined,
                            onOpen: (id) => {
                                dismissTransientOverlays();
                                if (id === 'execution') onPrefetchExecution?.();
                                onOpenArchive?.(id);
                            },
                        });
                    };
                }
                default:
                    return undefined;
            }
        },
        [
            onOpenFullNotepad,
            onOpenCalendar,
            requireSignedIn,
            onOpenFieldTasksSheet,
            onOpenCommunity,
            onPrefetchExecution,
            onOpenArchive,
            pinnedCount,
            urgentAlertsCount,
        ],
    );

    return {
        showVault,
        setShowVault,
        showVoiceModal,
        setShowVoiceModal,
        quickNote,
        setQuickNote,
        openVoiceModal,
        saveQuickNote,
        saveVoiceNote,
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
