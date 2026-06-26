import type { MutableRefObject } from 'react';
import { computeExecutionPhoneBodyFingerprint } from './buildExecutionPhoneBodyProps';
import { useExecutionDashboardLazyChunkGates } from './useExecutionDashboardLazyChunkGates';
import { useExecutionDashboardChunkScopeRef } from './useExecutionDashboardChunkScopeRef';
import type { ExecutionShellOverlayModalFlags } from './useExecutionShellOverlaysGate';

export type ExecutionDashboardLazyChunkSetupInput = {
    fingerprintInput: Parameters<typeof computeExecutionPhoneBodyFingerprint>[0];
    modalFlags: ExecutionShellOverlayModalFlags;
    getScopeSources: () => Record<string, unknown>;
    chunkDataReady?: boolean;
};

export type ExecutionDashboardLazyChunkSetupResult = {
    phoneBodyFingerprint: string;
    phoneBodyReady: boolean;
    shellOverlaysReady: boolean;
    chunkScopeRef: MutableRefObject<Record<string, unknown>>;
};

/** بصمة + بوابات + ref موحّد لـ lazy chunks */
export function useExecutionDashboardLazyChunkSetup({
    fingerprintInput,
    modalFlags,
    getScopeSources,
    chunkDataReady = true,
}: ExecutionDashboardLazyChunkSetupInput): ExecutionDashboardLazyChunkSetupResult {
    const phoneBodyFingerprint = computeExecutionPhoneBodyFingerprint(fingerprintInput);

    const { phoneBodyReady, shellOverlaysReady } = useExecutionDashboardLazyChunkGates(
        modalFlags,
        chunkDataReady,
    );

    const chunkScopeRef = useExecutionDashboardChunkScopeRef(
        phoneBodyReady,
        shellOverlaysReady,
        getScopeSources,
    );

    return {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    };
}
