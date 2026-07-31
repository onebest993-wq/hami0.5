import { useLayoutEffect, useRef, type MutableRefObject } from 'react';
import { EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS } from '../followupSnapshotFieldKeys';
import { assignExecutionPhoneBodyScope } from './pickExecutionPhoneBodyProps';
import { assignExecutionShellOverlayScope } from './pickExecutionShellOverlayProps';

/**
 * مزامنة scope ref أثناء الـ render عند تغيّر syncToken — وليس فقط في useLayoutEffect.
 *
 * السبب: PhoneBody / ShellOverlays يقرآن الـ ref في نفس دورة الـ render التي يتغيّر فيها
 * الـ fingerprint. إن أُجّلت المزامنة إلى layout effect، يقرآن قيماً قديمة (مثلاً
 * showExecutionFinancialHub=false) ثم لا يحدث re-render ثانٍ بعد تحديث الـ ref — فيبدو
 * أن المركز المالي / سجل الحجز «لا يفتح» أو «لا يُغلق».
 */
function useExecutionScopedChunkScopeRef(
    syncScope: boolean,
    syncToken: string,
    getSources: () => Record<string, unknown>,
    assignScope: (target: Record<string, unknown>, sources: Record<string, unknown>) => void,
): MutableRefObject<Record<string, unknown>> {
    const scopeRef = useRef<Record<string, unknown>>({});
    const getSourcesRef = useRef(getSources);
    const lastSyncedTokenRef = useRef<string | null>(null);
    getSourcesRef.current = getSources;

    if (syncScope && lastSyncedTokenRef.current !== syncToken) {
        assignScope(scopeRef.current, getSourcesRef.current());
        lastSyncedTokenRef.current = syncToken;
    }

    useLayoutEffect(() => {
        if (!syncScope) return;
        // شبكة أمان إن تغيّر getSources بعد commit دون قفزة token جديدة
        assignScope(scopeRef.current, getSourcesRef.current());
        lastSyncedTokenRef.current = syncToken;
    }, [syncScope, syncToken]);

    return scopeRef;
}

export function useExecutionPhoneBodyChunkScopeRef(
    syncPhoneBody: boolean,
    syncToken: string,
    getSources: () => Record<string, unknown>,
): MutableRefObject<Record<string, unknown>> {
    return useExecutionScopedChunkScopeRef(syncPhoneBody, syncToken, getSources, assignExecutionPhoneBodyScope);
}

function assignExecutionShellOverlayScopeWithFollowupSnapshot(
    target: Record<string, unknown>,
    sources: Record<string, unknown>,
): void {
    assignExecutionShellOverlayScope(target, sources);
    for (const key of EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS) {
        if (Object.prototype.hasOwnProperty.call(sources, key)) {
            target[key] = sources[key];
        }
    }
}

export function useExecutionShellOverlayChunkScopeRef(
    syncShellOverlays: boolean,
    syncToken: string,
    getSources: () => Record<string, unknown>,
): MutableRefObject<Record<string, unknown>> {
    return useExecutionScopedChunkScopeRef(
        syncShellOverlays,
        syncToken,
        getSources,
        assignExecutionShellOverlayScopeWithFollowupSnapshot,
    );
}
