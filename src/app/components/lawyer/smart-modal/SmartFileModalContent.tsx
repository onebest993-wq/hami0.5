import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SmartFileModalsPortal } from './layout/SmartFileModalsPortal';
import { SmartFileMainPanel } from './layout/SmartFileMainPanel';
import { SmartFileChrome } from './layout/SmartFileChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';
import { useSmartFileModalOrchestrator } from './hooks/useSmartFileModalOrchestrator';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { ColleagueConsultationProvider } from '../caseShare/ColleagueConsultationContext';
import {
    PERSONAL_STATUS_DOSSIER_INNER,
    PERSONAL_STATUS_DOSSIER_PANEL,
    PERSONAL_STATUS_DOSSIER_ROOT,
} from '@/app/components/lawyer/personal-status/personalStatusVisualTheme';
import { SmartFileModalThemeProvider } from './smartFile/smartFileModalTheme';
import { prefetchSmartFileModalShellWidgets } from './lazySmartFileModalWidgets';
import { prefetchLegalActionsModalChunks } from './prefetchLegalActionsModalChunks';
import { prefetchSmartFileMainPanelSecondaryHubs } from './smartFileMainPanelLazyHubs';
import { HUB_DOSSIER_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import { isSmartFileNestedOverlayOpen } from './smartFile/smartFileNestedOverlayState';
import {
    isSmartFileInlineOverlayOpen,
    resetSmartFileInlineOverlayRegistry,
} from './smartFile/smartFileInlineOverlayRegistry';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import { useSmartFileDossierHeaderNavigation } from './hooks/useSmartFileDossierHeaderNavigation';
import { rejectLawsuitFileMutation } from '@/app/domain/lawsuit/lawsuitFileMutationGuard';
import { CaseLinkBrowseBanner } from './parts/CaseLinkBrowseBanner';
import { LazyPersonalStatusDossierSurface } from '@/app/components/lawyer/personal-status/personalStatusDossierLazy';
export type { SmartFileModalProps } from './smartFile/smartFileModalTypes';

function prefetchSmartFileHotModals(): void {
    if (typeof window === 'undefined') return;
    void import('./modals/contentEntryModals').catch(() => undefined);
    void import('./modals/EditCaseInfoModal').catch(() => undefined);
    void import('./parts/LegalActionsMenu').catch(() => undefined);
    prefetchSmartFileMainPanelSecondaryHubs();
    /* Judgment keep-mounted في JudgmentSection — لا prefetch chunk عند كل فتح */
    void import('./AppealTransitionModal').catch(() => undefined);
    void import('./CrossAppealModal').catch(() => undefined);
    /* JudicialNotification فقط — لا سحب barrel كامل عند كل فتح */
    void import('./modals/appealObjectionModals').then((m) => {
        void m.JudicialNotificationModal;
    }).catch(() => undefined);
    prefetchLegalActionsModalChunks();
    void import('./FastTrackModal').catch(() => undefined);
}

function scheduleSmartFileDeferredModalWarm(): () => void {
    if (typeof window === 'undefined') return () => undefined;
    let cancelled = false;
    const run = () => {
        if (cancelled) return;
        void import('./layout/portal/SmartFileModalsFlowSection').catch(() => undefined);
        void import('./layout/portal/SmartFileModalsAdminSection').catch(() => undefined);
        void import('./modals/flow-modals/AddIncidentalCaseModal').catch(() => undefined);
    };
    const idle =
        typeof requestIdleCallback === 'function'
            ? requestIdleCallback(run, { timeout: 3500 })
            : null;
    const timer = window.setTimeout(run, 2800);
    return () => {
        cancelled = true;
        window.clearTimeout(timer);
        if (idle != null && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
    };
}

function ReportDossierSurfaceReady({
    active,
    onReady,
}: {
    active: boolean;
    onReady?: () => void;
}) {
    useLayoutEffect(() => {
        if (!active) return;
        onReady?.();
    }, [active, onReady]);
    return null;
}

export const SmartFileModalContent = (props: import('./smartFile/smartFileModalTypes').SmartFileModalProps) => {
    const {
        onClose,
        onExitToProfile,
        caseLinkViewOnly = false,
        onReturnFromCaseLinkBrowse,
        onUnlinkCaseLink,
        caseLinkBrowseMeta,
        lawsuitFiles,
    } = props;
    const { layout, consolidationNavActive, caseLinkNavActive } = useSmartFileModalOrchestrator(props);
    const isPersonalDossier = isPersonalStatusFile(props.file);
    const surfaceActive = props.surfaceActive !== false;
    const personalFileId = String((props.file as { id?: unknown } | undefined)?.id ?? '');
    const [personalReady, setPersonalReady] = useState(
        () => !isPersonalStatusFile(props.file) || LazyPersonalStatusDossierSurface.isPreloaded(),
    );
    const markPersonalReady = useCallback(() => setPersonalReady(true), []);
    const dossierRevealed = surfaceActive && (!isPersonalDossier || personalReady);

    useLayoutEffect(() => {
        if (!isPersonalDossier) {
            setPersonalReady(true);
            return;
        }
        setPersonalReady(LazyPersonalStatusDossierSurface.isPreloaded());
    }, [isPersonalDossier, personalFileId]);

    useLayoutEffect(() => {
        if (!layout || !dossierRevealed) return;
        props.onPainted?.();
    }, [layout, dossierRevealed, props.onPainted]);

    useBodyScrollLock(dossierRevealed);

    useEffect(() => {
        resetSmartFileInlineOverlayRegistry();
        prefetchSmartFileModalShellWidgets();
        prefetchSmartFileHotModals();
        const cancelDeferred = scheduleSmartFileDeferredModalWarm();
        return () => {
            cancelDeferred();
        };
    }, []);

    useEffect(() => {
        return () => {
            resetSmartFileInlineOverlayRegistry();
        };
    }, []);

    const exitToProfile = useMemo(
        () =>
            onExitToProfile
                ? () => {
                      onClose();
                      onExitToProfile();
                  }
                : undefined,
        [onClose, onExitToProfile],
    );

    const { handleDossierBack, handleDossierExit, dossierNestedNav } = useSmartFileDossierHeaderNavigation({
        onClose,
        onExitToProfile: exitToProfile,
        isTrashOpen: layout?.chrome.isTrashOpen ?? false,
        setIsTrashOpen: layout?.chrome.setIsTrashOpen ?? (() => undefined),
        modalsPortal: layout?.modalsPortal,
        caseLinkViewOnly,
        onReturnFromCaseLinkBrowse,
    });

    useEffect(() => {
        if (!layout || !dossierRevealed) return;
        const tryClose = (): boolean => {
            if (
                isSmartFileNestedOverlayOpen(layout.modalsPortal) ||
                isSmartFileInlineOverlayOpen()
            ) {
                return false;
            }
            handleDossierBack();
            return true;
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (
                isSmartFileNestedOverlayOpen(layout.modalsPortal) ||
                isSmartFileInlineOverlayOpen()
            ) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            handleDossierBack();
        };
        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(tryClose);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [layout, handleDossierBack, dossierRevealed]);

    const resolveShareSource = useMemo(
        () => () => {
            const file = props.file as {
                activeStageIndex?: number;
                stages?: unknown[];
            };
            const stageIndex = file.activeStageIndex ?? 0;
            const stage = Array.isArray(file.stages) ? file.stages[stageIndex] : undefined;
            return import('@/app/services/caseShare/caseShareExtractors').then((m) =>
                m.extractLawsuitShareSource(props.file as never, stage as never),
            );
        },
        [props.file],
    );

    if (!layout) {
        return null;
    }

    const fileLevelReadOnly =
        rejectLawsuitFileMutation(props.file as { status?: string }) !== null;

    const chromeProps = {
        ...layout.chrome,
        isViewingArchived: layout.chrome.isViewingArchived || fileLevelReadOnly,
        onDossierBack: handleDossierBack,
        onDossierExit: handleDossierExit,
        dossierNestedNav,
    };

    const mainPanelProps = {
        ...layout.mainPanel,
        isViewingArchived: layout.mainPanel.isViewingArchived || fileLevelReadOnly,
        isCaseLinkViewOnly: caseLinkViewOnly,
        onUnlinkCaseLink: caseLinkViewOnly ? undefined : onUnlinkCaseLink,
        lawsuitFiles: lawsuitFiles ?? layout.mainPanel.lawsuitFiles,
    };

    const themeVariant = layout.modalsPortal.modalVisualVariant ?? (isPersonalDossier ? 'personal-pearl' : 'civil');

    const rootClass = isPersonalDossier
        ? `${PERSONAL_STATUS_DOSSIER_ROOT} ${consolidationNavActive || caseLinkNavActive ? 'pt-12' : ''}`
        : `fixed inset-0 ${HUB_DOSSIER_Z_CLASS} bg-[#0F121E] font-['Tajawal'] overflow-hidden print:static print:bg-transparent print:overflow-visible pointer-events-auto flex ${
              consolidationNavActive || caseLinkNavActive ? 'pt-12' : ''
          }`;

    const panelClass = isPersonalDossier
        ? `${PERSONAL_STATUS_DOSSIER_PANEL} rounded-none border-0 flex flex-col min-h-0 overflow-hidden shadow-none print:h-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:rounded-none`
        : 'hami-shell-overlay-column w-full h-full mx-auto my-0 bg-[#0F121E] rounded-none border-0 flex flex-col min-h-0 overflow-hidden shadow-none print:h-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:rounded-none';

    const innerClass = isPersonalDossier
        ? PERSONAL_STATUS_DOSSIER_INNER
        : 'flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F121E] relative';

    const modalsPortalProps = {
        ...layout.modalsPortal,
        isViewingArchived: layout.modalsPortal.isViewingArchived || fileLevelReadOnly || caseLinkViewOnly,
        isCaseLinkViewOnly: caseLinkViewOnly,
    };

    const modalsLayer =
        typeof document !== 'undefined' ? (
            createPortal(<SmartFileModalsPortal {...modalsPortalProps} />, document.body)
        ) : (
            <SmartFileModalsPortal {...modalsPortalProps} />
        );

    return (
        <ColleagueConsultationProvider resolveSource={resolveShareSource}>
            <SmartFileModalThemeProvider variant={themeVariant}>
                <div
                    className={rootClass}
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.dossier}
                    data-dossier-variant={isPersonalDossier ? 'personal' : 'civil'}
                    aria-hidden={!dossierRevealed}
                    style={
                        dossierRevealed
                            ? undefined
                            : { visibility: 'hidden', pointerEvents: 'none' }
                    }
                    {...inertProps(!dossierRevealed)}
                >
                    <div className={panelClass}>
                        <div className={innerClass}>
                            {fileLevelReadOnly ? (
                                <div
                                    className="shrink-0 px-3 py-2 text-center text-[11px] font-bold text-amber-200/90 bg-amber-500/10 border-b border-amber-500/20"
                                    role="status"
                                >
                                    الإضبارة مؤرشفة — للقراءة فقط
                                </div>
                            ) : caseLinkViewOnly && caseLinkBrowseMeta && onReturnFromCaseLinkBrowse && onUnlinkCaseLink ? (
                                <CaseLinkBrowseBanner
                                    originCaseNo={caseLinkBrowseMeta.originCaseNo}
                                    peerCaseNo={caseLinkBrowseMeta.peerCaseNo}
                                    peerFileId={caseLinkBrowseMeta.peerFileId}
                                    peerCriminalId={caseLinkBrowseMeta.peerCriminalId}
                                    onReturnToOrigin={onReturnFromCaseLinkBrowse}
                                    onUnlink={onUnlinkCaseLink}
                                />
                            ) : null}
                            {isPersonalDossier ? (
                                <Suspense fallback={null}>
                                    <LazyPersonalStatusDossierSurface
                                        chrome={chromeProps}
                                        panel={mainPanelProps}
                                    />
                                    <ReportDossierSurfaceReady
                                        active
                                        onReady={markPersonalReady}
                                    />
                                </Suspense>
                            ) : (
                                <>
                                    <SmartFileChrome {...chromeProps} />
                                    <SmartFileMainPanel {...mainPanelProps} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {modalsLayer}
            </SmartFileModalThemeProvider>
        </ColleagueConsultationProvider>
    );
};
