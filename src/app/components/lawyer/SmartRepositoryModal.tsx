import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { RepositoryFeedFilter } from '@/app/services/repository/repositoryUnifiedFeed';
import { SmartRepositoryUnifiedFeed } from './SmartRepository/SmartRepositoryUnifiedFeed';
import { REPO_HEADER, REPO_ICON_BTN, REPO_OVERLAY, REPO_PANEL } from './SmartRepository/smartRepositoryTheme';
import { concealRepositoryWarmShell } from '@/app/runtime/repositoryInstantPaint';
import { inertProps } from '@/app/utils/inertProps';
import './SmartRepository/repositoryChrome.css';

export type RepositoryTab = 'notepad' | 'vault';

export type SmartRepositoryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    /** يُبقي طبقة الكشف اللحظي بعد الإغلاق — الخلاصة تُركَّب عند الفتح فقط */
    keepAlive?: boolean;
    initialTab?: RepositoryTab;
    notepadMode?: 'list' | 'create';
    focusNoteId?: string;
    vaultOpenScanner?: boolean;
    notes: GlobalNote[];
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    currentUserId?: string;
    onSaveNote: (note: GlobalNote) => void | Promise<void>;
    onDeleteNote: (id: string | number) => void;
    onUpdateLawsuitFile: (file: FileData) => void;
    onUpdateExecutionFile: (file: ExecutionFile) => void;
};

const REPO_OVERLAY_FADE_MS = 140;

function overlaySnapClass(keepAlive: boolean): string {
    return keepAlive ? 'hami-repository-overlay-layer--snap' : '';
}

function initialFilterFromTab(tab: RepositoryTab): RepositoryFeedFilter {
    return tab === 'vault' ? 'media' : 'all';
}

export function SmartRepositoryModal({
    isOpen,
    onClose,
    keepAlive = false,
    initialTab = 'notepad',
    notepadMode = 'list',
    focusNoteId,
    vaultOpenScanner = false,
    notes,
    lawsuitFiles,
    executionFiles,
    currentUserId,
    onSaveNote,
    onDeleteNote,
    onUpdateLawsuitFile,
    onUpdateExecutionFile,
}: SmartRepositoryModalProps) {
    const reduceMotion = useReduceMotion();
    const [layerMounted, setLayerMounted] = useState(isOpen || keepAlive);
    const [isVisible, setIsVisible] = useState(isOpen);
    const wasLayerMountedRef = useRef(layerMounted);
    const [initialFilter, setInitialFilter] = useState<RepositoryFeedFilter>(() =>
        initialFilterFromTab(initialTab),
    );

    useLayoutEffect(() => {
        if (isOpen) {
            setLayerMounted(true);
            wasLayerMountedRef.current = true;
            setInitialFilter(initialFilterFromTab(initialTab));
            setIsVisible(true);
            return;
        }

        setIsVisible(false);
        concealRepositoryWarmShell();
        if (!keepAlive && reduceMotion) {
            setLayerMounted(false);
            wasLayerMountedRef.current = false;
        }
    }, [initialTab, isOpen, keepAlive, reduceMotion]);

    useLayoutEffect(() => {
        if (isOpen || !layerMounted || keepAlive) return;
        const ms = reduceMotion ? 0 : REPO_OVERLAY_FADE_MS + 16;
        const timer = window.setTimeout(() => {
            setLayerMounted(false);
            wasLayerMountedRef.current = false;
        }, ms);
        return () => window.clearTimeout(timer);
    }, [isOpen, keepAlive, layerMounted, reduceMotion]);

    useBodyScrollLock(isOpen);
    useOpaqueFeatureSurface(isOpen);

    const requestClose = useCallback((event?: React.SyntheticEvent) => {
        event?.preventDefault();
        event?.stopPropagation();
        onClose();
    }, [onClose]);

    const overlayVisible = keepAlive ? isOpen : isVisible;

    const handleOverlayTransitionEnd = useCallback(
        (e: React.TransitionEvent<HTMLDivElement>) => {
            if (keepAlive || e.target !== e.currentTarget || e.propertyName !== 'opacity' || isOpen) {
                return;
            }
            setLayerMounted(false);
            wasLayerMountedRef.current = false;
        },
        [isOpen, keepAlive],
    );

    if (!layerMounted) return null;

    const overlayClassName = [
        REPO_OVERLAY,
        'hami-repository-overlay-layer',
        overlaySnapClass(keepAlive),
        overlayVisible ? 'hami-repository-overlay-layer--visible pointer-events-auto' : 'pointer-events-none',
    ]
        .filter(Boolean)
        .join(' ');

    return createPortal(
        <div
            className={overlayClassName}
            dir="rtl"
            data-testid="smart-repository-modal"
            role="presentation"
            aria-hidden={!overlayVisible}
            {...inertProps(!overlayVisible)}
            onTransitionEnd={handleOverlayTransitionEnd}
        >
            <div
                className={`${REPO_PANEL} flex flex-col`}
                role={overlayVisible ? 'dialog' : undefined}
                aria-modal={overlayVisible ? 'true' : undefined}
                aria-label="المستودع"
            >
                <div className={REPO_HEADER}>
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            type="button"
                            onPointerDown={(event) => {
                                requestClose(event);
                            }}
                            onClick={(event) => {
                                requestClose(event);
                            }}
                            data-testid="smart-repository-close"
                            className={REPO_ICON_BTN}
                            aria-label="إغلاق"
                            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <h2 className="font-medium text-[17px] text-[#F4F4F5] truncate">المستودع</h2>
                    </div>
                </div>

                {overlayVisible ? (
                    <SmartRepositoryUnifiedFeed
                        currentUserId={currentUserId}
                        notes={notes}
                        lawsuitFiles={lawsuitFiles}
                        executionFiles={executionFiles}
                        startMode={notepadMode}
                        focusNoteId={focusNoteId}
                        initialFilter={initialFilter}
                        vaultOpenScanner={vaultOpenScanner}
                        onSaveNote={onSaveNote}
                        onDeleteNote={onDeleteNote}
                        onUpdateLawsuitFile={onUpdateLawsuitFile}
                        onUpdateExecutionFile={onUpdateExecutionFile}
                        onRequestClose={requestClose}
                        escapeEnabled={overlayVisible}
                    />
                ) : null}
            </div>
        </div>,
        document.body,
    );
}
