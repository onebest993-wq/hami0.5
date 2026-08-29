import React, { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { LawyerNewCaseProps } from '@/app/types/components';
import type { JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/wordLists';
import {
    consumePendingLawyerNewCaseJurisdiction,
    getCachedLawyerNewCase,
    getPendingLawyerNewCaseJurisdiction,
    loadLawyerNewCaseModule,
    setPendingIncidentalSpawnContext,
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
    incidentalSpawnContext,
    ...rest
}: LawyerNewCasePortalProps): React.ReactElement | null {
    const Component = useSyncExternalStore(
        subscribeLawyerNewCaseCache,
        getCachedLawyerNewCase,
        () => null,
    );

    const [bootJurisdiction, setBootJurisdiction] = useState<JurisdictionId | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const requestLoad = useCallback(() => {
        setLoadFailed(false);
        void loadLawyerNewCaseModule()
            .then(() => {
                setLoadFailed(false);
            })
            .catch(() => {
                setLoadFailed(true);
            });
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) {
            setBootJurisdiction(null);
            setLoadFailed(false);
            return;
        }
        if (incidentalSpawnContext?.parent) {
            setPendingIncidentalSpawnContext(incidentalSpawnContext);
        }
        const pending =
            (presetSelectedType as JurisdictionId | undefined) ??
            consumePendingLawyerNewCaseJurisdiction() ??
            getPendingLawyerNewCaseJurisdiction();
        setBootJurisdiction((prev) => prev ?? pending);
        if (pending === 'personal') {
            void import('@/app/components/lawyer/personal-status/PersonalStatusNewCaseForm');
        } else if (pending === 'civil') {
            void import('@/app/components/lawyer/LawyerNewCase/components/CivilNewCaseForm');
        } else if (pending === 'criminal') {
            void import('@/app/components/lawyer/criminal-system/CriminalNewCase');
        }
        requestLoad();
    }, [isOpen, incidentalSpawnContext, presetSelectedType, loadGeneration, requestLoad]);

    const handleSelectJurisdiction = useCallback((id: JurisdictionId) => {
        setPendingLawyerNewCaseJurisdiction(id);
        setBootJurisdiction(id);
        setLoadGeneration((g) => g + 1);
    }, []);

    const handleRetryLoad = useCallback(() => {
        setLoadGeneration((g) => g + 1);
    }, []);

    if (!isOpen) return null;

    const resolvedPreset = (presetSelectedType as JurisdictionId | undefined) ?? bootJurisdiction;
    const pendingWhileLoading = resolvedPreset ?? getPendingLawyerNewCaseJurisdiction();

    const layer = Component ? (
        <Component
            key={incidentalSpawnContext?.incidentalId ?? 'new-case'}
            isOpen={isOpen}
            onClose={onClose}
            presetSelectedType={resolvedPreset ?? presetSelectedType}
            incidentalSpawnContext={incidentalSpawnContext}
            {...rest}
        />
    ) : (
        <LawyerNewCaseSelectionInstantShell
            onClose={onClose}
            mode={loadFailed ? 'error' : pendingWhileLoading ? 'loading' : 'picker'}
            onSelectJurisdiction={handleSelectJurisdiction}
            onRetryLoad={handleRetryLoad}
            dossierNewCaseElevated={rest.dossierNewCaseElevated}
        />
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
