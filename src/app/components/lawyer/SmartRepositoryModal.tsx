import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Warehouse } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { RepositoryFeedFilter } from '@/app/services/repository/repositoryUnifiedFeed';
import { SmartRepositoryUnifiedFeed } from './SmartRepository/SmartRepositoryUnifiedFeed';
import { REPO_HEADER, REPO_ICON_BTN, REPO_OVERLAY, REPO_PANEL } from './SmartRepository/smartRepositoryTheme';

export type RepositoryTab = 'notepad' | 'vault';

export type SmartRepositoryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    /** يُبقي الطبقة والمحتوى mounted بعد الإغلاق — فتح/إغلاق أسرع */
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

    const requestClose = useCallback(() => {
        if (keepAlive) {
            setIsVisible(false);
        }
        onClose();
    }, [keepAlive, onClose]);

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
        isVisible ? 'hami-repository-overlay-layer--visible' : 'pointer-events-none',
    ]
        .filter(Boolean)
        .join(' ');

    return createPortal(
        <div
            className={overlayClassName}
            dir="rtl"
            data-testid="smart-repository-modal"
            role="presentation"
            aria-hidden={!isVisible}
            onTransitionEnd={handleOverlayTransitionEnd}
        >
            <div
                className={`${REPO_PANEL} flex flex-col`}
                role="dialog"
                aria-modal={isVisible ? 'true' : undefined}
                aria-label="المستودع الذكي"
            >
                <div className="pointer-events-none absolute inset-0 hami-repository-ambient" aria-hidden />
                <div className={REPO_HEADER}>
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={requestClose}
                            data-testid="smart-repository-close"
                            className={REPO_ICON_BTN}
                            aria-label="إغلاق"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            <Warehouse size={20} className="text-[#E6C673] shrink-0" />
                            <h2 className="font-bold text-lg text-[#F4F0E8] truncate">المستودع الذكي</h2>
                        </div>
                    </div>
                </div>

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
                    escapeEnabled={isVisible}
                />
            </div>
        </div>,
        document.body,
    );
}
