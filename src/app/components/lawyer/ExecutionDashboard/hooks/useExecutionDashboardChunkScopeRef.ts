import { useRef, type MutableRefObject } from 'react';
import { assignExecutionDashboardChunkScope } from './assignExecutionDashboardChunkScope';

/** ref موحّد لجسم الداشبورد + shell overlays */
export function useExecutionDashboardChunkScopeRef(
    syncPhoneBody: boolean,
    syncShellOverlays: boolean,
    getSources: () => Record<string, unknown>,
): MutableRefObject<Record<string, unknown>> {
    const scopeRef = useRef<Record<string, unknown>>({});
    const getSourcesRef = useRef(getSources);
    getSourcesRef.current = getSources;

    // محضر المتابعة يُزامَن دائماً — حتى قبل جاهزية lazy chunks (بدون ذلك تبقى المعالجات undefined)
    assignExecutionDashboardChunkScope(scopeRef.current, getSourcesRef.current(), {
        phoneBody: syncPhoneBody,
        shellOverlays: syncShellOverlays,
    });

    return scopeRef;
}
