import React, { useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { LawyerNewCaseProps } from '@/app/types/components';
import type { JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/wordLists';
import {
    consumePendingLawyerNewCaseJurisdiction,
    getCachedLawyerNewCase,
    getPendingLawyerNewCaseJurisdiction,
    loadLawyerNewCaseModule,
    setPendingLawyerNewCaseJurisdiction,
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
    presetSelectedType,
    ...rest
}: LawyerNewCasePortalProps): React.ReactElement | null {
    const Component = useSyncExternalStore(
        subscribeLawyerNewCaseCache,
        getCachedLawyerNewCase,
        () => null,
    );

    const [bootJurisdiction, setBootJurisdiction] = React.useState<JurisdictionId | null>(null);

    useLayoutEffect(() => {
        if (!isOpen) {
            setBootJurisdiction(null);
            return;
        }
        setBootJurisdiction((prev) => prev ?? consumePendingLawyerNewCaseJurisdiction());
        void loadLawyerNewCaseModule().catch(() => undefined);
    }, [isOpen]);

    const handleSelectJurisdiction = useCallback((id: JurisdictionId) => {
        setPendingLawyerNewCaseJurisdiction(id);
        setBootJurisdiction(id);
        void loadLawyerNewCaseModule().catch(() => undefined);
    }, []);

    if (!isOpen) return null;

    const resolvedPreset = (presetSelectedType as JurisdictionId | undefined) ?? bootJurisdiction;
    const pendingWhileLoading = resolvedPreset ?? getPendingLawyerNewCaseJurisdiction();

    const layer = Component ? (
        <Component
            onClose={onClose}
            presetSelectedType={resolvedPreset ?? presetSelectedType}
            {...rest}
        />
    ) : (
        <LawyerNewCaseSelectionInstantShell
            onClose={onClose}
            mode={pendingWhileLoading ? 'loading' : 'picker'}
            onSelectJurisdiction={handleSelectJurisdiction}
        />
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
