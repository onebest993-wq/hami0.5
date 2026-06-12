import { useCallback, useEffect, useState } from 'react';
import type { ExecutionFile, ThirdPartySeizure } from '@/app/types/execution';

function readThirdPartySeizures(source: unknown): ThirdPartySeizure[] {
    const list = (source as { thirdPartySeizures?: unknown })?.thirdPartySeizures;
    return Array.isArray(list) ? (list as ThirdPartySeizure[]) : [];
}

export function useThirdPartySeizuresUi(executionData: ExecutionFile | null | undefined) {
    const [thirdPartySeizuresUi, setThirdPartySeizuresUi] = useState<ThirdPartySeizure[]>(() =>
        readThirdPartySeizures(executionData)
    );

    useEffect(() => {
        setThirdPartySeizuresUi(readThirdPartySeizures(executionData));
    }, [(executionData as { thirdPartySeizures?: unknown })?.thirdPartySeizures]);

    const applyThirdPartySeizuresFromPatch = useCallback((patch: Record<string, unknown> | null | undefined) => {
        if (Array.isArray(patch?.thirdPartySeizures)) {
            setThirdPartySeizuresUi(patch.thirdPartySeizures as ThirdPartySeizure[]);
        }
    }, []);

    return {
        thirdPartySeizuresUi,
        setThirdPartySeizuresUi,
        applyThirdPartySeizuresFromPatch,
    };
}
