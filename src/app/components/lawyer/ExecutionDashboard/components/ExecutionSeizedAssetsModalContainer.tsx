import React, { Suspense } from 'react';

export type ModalSeizedAssetsManagerLikeProps = {
    onClose: () => void;
    executionId?: string;
};

export interface ExecutionSeizedAssetsModalContainerProps {
    showSeizedAssetsModal: boolean;
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyModalSeizedAssetsManager: React.ComponentType<ModalSeizedAssetsManagerLikeProps>;
    setShowSeizedAssetsModal?: (show: boolean) => void;
    onCloseSeizedAssetsModal?: () => void;
    /** يُمرَّر كما في الملف الرئيسي: `executionId || file?.id` */
    seizedAssetsModalExecutionId: string | undefined;
}

export const ExecutionSeizedAssetsModalContainer: React.FC<
    ExecutionSeizedAssetsModalContainerProps
> = ({
    showSeizedAssetsModal,
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyModalSeizedAssetsManager,
    setShowSeizedAssetsModal,
    onCloseSeizedAssetsModal,
    seizedAssetsModalExecutionId,
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
        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyModalSeizedAssetsManager
                onClose={closeSeizedAssetsModal}
                executionId={seizedAssetsModalExecutionId}
            />
        </Suspense>
    );
};
