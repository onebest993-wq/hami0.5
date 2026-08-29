import React from 'react';
import type { LooseArchiveFile } from '../types';
import { buildExecutionWorkspacePin } from '@/app/workspace/executionWorkspacePin';
import { resolveExecutionArchiveCardView } from '../executionArchiveCardView';
import { dispatchExecutionDossierPrimeHost } from '@/app/runtime/executionDossierPrimeHost';
import { EXECUTION_ARCHIVE_CARD_CLASS } from '../executionArchiveVisualLite';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import { ExecutionSmartCardBody } from './ExecutionSmartCardBody';
import { warmExecutionDossierFromArchiveCard } from '../executionArchiveCardIntentWarm';

interface ExecutionSmartCardProps {
    file: LooseArchiveFile & {
        unifiedCount?: unknown;
        unifiedTotalDemand?: unknown;
    };
    liveRevision?: number;
    lawsuitFilesForCluster?: unknown[];
    onOpen: () => void;
    onPreview: () => void;
    variant: 'active' | 'archived' | 'trash';
    onRequestMoveToTrash?: () => void;
    onRequestArchive?: () => void;
    onRestoreFromTrash?: () => void;
    onRestoreFromArchive?: () => void;
    onRequestPermanentDelete?: () => void;
    trashDaysRemaining?: number;
    selected?: boolean;
    onToggleSelect?: () => void;
}

function ExecutionSmartCard({
    file,
    liveRevision = 0,
    lawsuitFilesForCluster = [],
    onOpen,
    onPreview,
    variant,
    onRequestMoveToTrash,
    onRequestArchive,
    onRestoreFromTrash,
    onRestoreFromArchive,
    onRequestPermanentDelete,
    trashDaysRemaining,
    selected,
    onToggleSelect,
}: ExecutionSmartCardProps) {
    const prefetchFiredRef = React.useRef(false);

    const loose = file;
    const unifiedCount = Number(file.unifiedCount || 0);
    const unifiedTotalDemandRaw = Number(file.unifiedTotalDemand);
    const cardView = React.useMemo(
        () =>
            resolveExecutionArchiveCardView(loose, {
                unifiedCount,
                unifiedTotalDemand: unifiedTotalDemandRaw,
            }),
        [loose, unifiedCount, unifiedTotalDemandRaw, liveRevision],
    );

    // قراءة blob الإضبارة (فك تشفير + JSON.parse) عند النية بدل لحظة النقر —
    // buildExecutionViewData يقرأها متزامناً أثناء أول mount، وهذا يجعلها cache hit.
    const warmDossierBlobRef = React.useRef(false);
    const warmDossierBlob = React.useCallback(() => {
        if (warmDossierBlobRef.current) return;
        warmDossierBlobRef.current = true;
        const fileId = String(loose.id ?? '').trim();
        if (!fileId) return;
        void import('@/app/infrastructure/execution/ExecutionDossierRepository')
            .then((m) => {
                m.readExecutionDossierByIdFromCache(fileId);
            })
            .catch(() => undefined);
    }, [loose.id]);

    const primeExecutionDossier = React.useCallback(() => {
        if (prefetchFiredRef.current) return;
        prefetchFiredRef.current = true;
        warmExecutionDossierFromArchiveCard();
        warmDossierBlob();
        dispatchExecutionDossierPrimeHost({
            ...(loose as Record<string, unknown>),
            type: 'execution',
        });
    }, [warmDossierBlob, loose]);

    const handleOpen = React.useCallback(() => {
        warmExecutionDossierFromArchiveCard('urgent');
        warmDossierBlob();
        // تسليح Host قبل commit — إن كان مركّباً يُظهر فوراً؛ وإلا يُركّب بنفس الملف
        dispatchExecutionDossierPrimeHost({
            ...(loose as Record<string, unknown>),
            type: 'execution',
        });
        onOpen();
    }, [warmDossierBlob, onOpen, loose]);

    // click يُطلق عند pointerup — البدء من pointerdown يكسب تحميل الـ chunks
    const handleCardPointerDown = React.useCallback(
        (e: React.PointerEvent) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('button,a,[role="checkbox"],input,textarea,select,label')) return;
            warmExecutionDossierFromArchiveCard('urgent');
            warmDossierBlob();
        },
        [warmDossierBlob],
    );

    const press = useScrollSafePress({
        onPress: handleOpen,
        onPointerDown: handleCardPointerDown,
    });

    const openSurfaceProps = {
        onClick: press.onClick,
        onPointerDown: press.onPointerDown,
        onPointerMove: press.onPointerMove,
        onPointerUp: press.onPointerUp,
        onPointerCancel: press.onPointerCancel,
        className: 'cursor-pointer touch-manipulation',
    } as const;

    const claimTypeLine = cardView.claimLabelAr;
    const executionTypeLine = cardView.docTypeLabel || cardView.classificationDisplay || '';

    const venueLabel = cardView.directorateLabel
        ? { prefix: 'مديرية التنفيذ', name: cardView.directorateLabel }
        : cardView.court && cardView.court !== 'غير محدد'
          ? { prefix: 'المحكمة', name: cardView.court }
          : null;

    const pinPayload =
        variant === 'active' ? buildExecutionWorkspacePin(cardView.snap, lawsuitFilesForCluster) : null;

    const cardClassName = `${EXECUTION_ARCHIVE_CARD_CLASS}${
        variant === 'trash' ? ' opacity-95' : variant === 'archived' ? ' opacity-90' : ''
    }`;

    const cardBody = (
        <ExecutionSmartCardBody
            loose={loose}
            cardView={cardView}
            unifiedCount={unifiedCount}
            claimTypeLine={claimTypeLine}
            executionTypeLine={executionTypeLine}
            venueLabel={venueLabel}
            pinPayload={pinPayload}
            variant={variant}
            trashDaysRemaining={trashDaysRemaining}
            selected={selected}
            onToggleSelect={onToggleSelect}
            onRequestMoveToTrash={onRequestMoveToTrash}
            onRequestArchive={onRequestArchive}
            onRestoreFromTrash={onRestoreFromTrash}
            onRestoreFromArchive={onRestoreFromArchive}
            onRequestPermanentDelete={onRequestPermanentDelete}
            onPreview={onPreview}
            openSurfaceProps={openSurfaceProps}
        />
    );

    return (
        <div
            data-testid="execution-archive-card"
            data-execution-id={String(loose.id ?? '')}
            onPointerEnter={primeExecutionDossier}
            onFocus={primeExecutionDossier}
            className={cardClassName}
        >
            {cardBody}
        </div>
    );
}

export default ExecutionSmartCard;
