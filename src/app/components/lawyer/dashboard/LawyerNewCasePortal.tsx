import React, { useLayoutEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { LawyerNewCaseProps } from '@/app/types/components';
import {
    getCachedLawyerNewCase,
    loadLawyerNewCaseModule,
    subscribeLawyerNewCaseCache,
} from '@/app/runtime/lawyerNewCaseLoader';
import { LawyerNewCaseSelectionInstantShell } from './LawyerNewCaseSelectionInstantShell';

type LawyerNewCasePortalProps = LawyerNewCaseProps & {
    isOpen: boolean;
};

/** نموذج إنشاء دعوى — portal فوق مخزن الدعاوى (z-220) */
export function LawyerNewCasePortal({
    isOpen,
    onClose,
    ...rest
}: LawyerNewCasePortalProps): React.ReactElement | null {
    const Component = useSyncExternalStore(
        subscribeLawyerNewCaseCache,
        getCachedLawyerNewCase,
        () => null,
    );

    useLayoutEffect(() => {
        if (!isOpen) return;
        void loadLawyerNewCaseModule().catch(() => undefined);
    }, [isOpen]);

    if (!isOpen) return null;

    const layer = Component ? (
        <Component onClose={onClose} {...rest} />
    ) : (
        <LawyerNewCaseSelectionInstantShell onClose={onClose} />
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
