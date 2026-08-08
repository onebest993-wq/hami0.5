import { useEffect, useSyncExternalStore } from 'react';
import type { SparkNudge, SparkSurface } from '@/app/spark/types';
import type { SparkShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';

export type SparkShellRegistration = {
    surface: SparkSurface;
    dossierKey: string;
    dossierLabel?: string;
    passiveNudge: SparkNudge | null;
    /** قائمة تنبيهات إضافية للوحة Shell (بعد الأول) */
    passiveNudges?: SparkNudge[];
    auditNudge?: SparkNudge | null;
    reviewPayload?: SparkShellReviewPayload | null;
    onFollow?: (actionId: string) => void;
};

let activeRegistration: SparkShellRegistration | null = null;
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) {
        listener();
    }
}

export function registerSparkShellContext(registration: SparkShellRegistration | null): void {
    activeRegistration = registration;
    emit();
}

export function readSparkShellRegistration(): SparkShellRegistration | null {
    return activeRegistration;
}

export function subscribeSparkShellRegistration(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useSparkShellRegistration(): SparkShellRegistration | null {
    return useSyncExternalStore(
        subscribeSparkShellRegistration,
        readSparkShellRegistration,
        () => null,
    );
}

export function usePublishSparkShellContext(
    registration: SparkShellRegistration | null,
): void {
    useEffect(() => {
        registerSparkShellContext(registration);
        return () => registerSparkShellContext(null);
    }, [registration]);
}

export function resetSparkShellStoreForTests(): void {
    activeRegistration = null;
    emit();
}
