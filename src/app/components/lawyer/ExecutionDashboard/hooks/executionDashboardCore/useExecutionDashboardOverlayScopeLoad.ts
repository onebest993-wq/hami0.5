import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { hasSelectedScopeDeltaForLazySync } from './executionScopeLazySyncDelta';

const executionDashboardCoreScopeSourcesOverlayImport = () =>
    import('./executionDashboardCoreScopeSourcesOverlayLazy');

export function useExecutionDashboardOverlayScopeLoad(input: {
    overlayUrgent: boolean;
    overlayAnyModalOpen: boolean;
    overlayIntentUrgent: boolean;
    overlayScopeLoadFingerprint: string;
    lastAppliedOverlayFingerprintRef: MutableRefObject<string>;
    overlayPatchRef: MutableRefObject<Record<string, unknown>>;
    scopeSourcesBuildInputRef: MutableRefObject<unknown>;
    setOverlayPatchEpoch: Dispatch<SetStateAction<number>>;
}) {
    const {
        overlayUrgent,
        overlayAnyModalOpen,
        overlayIntentUrgent,
        overlayScopeLoadFingerprint,
        lastAppliedOverlayFingerprintRef,
        overlayPatchRef,
        scopeSourcesBuildInputRef,
        setOverlayPatchEpoch,
    } = input;

    useEffect(() => {
        let cancelled = false;
        const loadFingerprint = overlayScopeLoadFingerprint;
        const loadOverlay = () => {
            if (lastAppliedOverlayFingerprintRef.current === loadFingerprint) {
                return;
            }
            void executionDashboardCoreScopeSourcesOverlayImport()
                .then(({ buildExecutionDashboardCoreDeferredOverlayChunkScopeSources }) => {
                    if (cancelled) return;
                    if (lastAppliedOverlayFingerprintRef.current === loadFingerprint) {
                        return;
                    }
                    const nextPatch = buildExecutionDashboardCoreDeferredOverlayChunkScopeSources(
                        scopeSourcesBuildInputRef.current as Parameters<
                            typeof buildExecutionDashboardCoreDeferredOverlayChunkScopeSources
                        >[0],
                    );
                    if (!hasSelectedScopeDeltaForLazySync(overlayPatchRef.current, nextPatch)) {
                        lastAppliedOverlayFingerprintRef.current = loadFingerprint;
                        return;
                    }
                    overlayPatchRef.current = nextPatch;
                    lastAppliedOverlayFingerprintRef.current = loadFingerprint;
                    setOverlayPatchEpoch((epoch) => epoch + 1);
                })
                .catch(() => {});
        };

        if (overlayUrgent || overlayAnyModalOpen || overlayIntentUrgent) {
            loadOverlay();
            return () => {
                cancelled = true;
            };
        }

        const cancelIdleLoad = scheduleIdleWork(loadOverlay, 240);
        return () => {
            cancelled = true;
            cancelIdleLoad();
        };
    }, [
        overlayUrgent,
        overlayAnyModalOpen,
        overlayIntentUrgent,
        overlayScopeLoadFingerprint,
        lastAppliedOverlayFingerprintRef,
        overlayPatchRef,
        scopeSourcesBuildInputRef,
        setOverlayPatchEpoch,
    ]);
}
