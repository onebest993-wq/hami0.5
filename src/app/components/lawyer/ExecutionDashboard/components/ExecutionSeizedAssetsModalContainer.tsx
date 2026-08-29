import React from 'react';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';

export type ModalSeizedAssetsManagerLikeProps = {
    onClose: () => void;
    executionId?: string;
    assets?: unknown[];
    onUpdateAssets?: (assets: unknown[]) => void;
};

type PreloadableSeizedAssetsLazy = React.ComponentType<ModalSeizedAssetsManagerLikeProps> & {
    isPreloaded?: () => boolean;
};

export interface ExecutionSeizedAssetsModalContainerProps {
    showSeizedAssetsModal: boolean;
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyModalSeizedAssetsManager: PreloadableSeizedAssetsLazy;
    setShowSeizedAssetsModal?: (show: boolean) => void;
    onCloseSeizedAssetsModal?: () => void;
    /** يُمرَّر كما في الملف الرئيسي: `executionId || file?.id` */
    seizedAssetsModalExecutionId: string | undefined;
    seizedAssets?: unknown[];
    onUpdateSeizedAssets?: (assets: unknown[]) => void;
}

export const ExecutionSeizedAssetsModalContainer: React.FC<
    ExecutionSeizedAssetsModalContainerProps
> = ({
    showSeizedAssetsModal,
    EXEC_OVERLAY_LAZY_FALLBACK: _EXEC_OVERLAY_LAZY_FALLBACK,
    LazyModalSeizedAssetsManager,
    setShowSeizedAssetsModal,
    onCloseSeizedAssetsModal,
    seizedAssetsModalExecutionId,
    seizedAssets,
    onUpdateSeizedAssets,
}) => {
    const closeSeizedAssetsModal = () => {
        if (typeof onCloseSeizedAssetsModal === 'function') {
            onCloseSeizedAssetsModal();
        } else {
            setShowSeizedAssetsModal?.(false);
        }
    };

    if (!showSeizedAssetsModal) return null;

    return (
        <PreloadableOverlayGate
            lazy={LazyModalSeizedAssetsManager}
            fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
            lazyProps={{
                onClose: closeSeizedAssetsModal,
                executionId: seizedAssetsModalExecutionId,
                assets: seizedAssets,
                onUpdateAssets: onUpdateSeizedAssets,
            }}
        />
    );
};
