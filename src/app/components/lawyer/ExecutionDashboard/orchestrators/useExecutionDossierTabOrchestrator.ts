import { useEffect, useRef, useState } from 'react';
import type { ExecutionDossierTabOrchestratorSlice } from './executionOrchestratorSliceTypes';

/** تبويبات الإضبارة الأم/الموحّدة */
export function useExecutionDossierTabOrchestrator(
    currentFileId: string,
): ExecutionDossierTabOrchestratorSlice {
    const [activeTabId, setActiveTabId] = useState<string>(() => String(currentFileId || ''));
    const stableCurrentFileRef = useRef(String(currentFileId || ''));

    useEffect(() => {
        const cur = String(currentFileId || '');
        if (stableCurrentFileRef.current !== cur) {
            stableCurrentFileRef.current = cur;
            setActiveTabId(cur);
        }
    }, [currentFileId]);

    return { activeTabId, setActiveTabId };
}
