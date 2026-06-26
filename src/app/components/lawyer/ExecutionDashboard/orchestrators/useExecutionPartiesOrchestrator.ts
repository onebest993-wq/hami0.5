import { useEffect, useState } from 'react';
import type { ExecutionFileKey } from './executionOrchestratorTypes';
import type { ExecutionPartiesOrchestratorSlice } from './executionOrchestratorSliceTypes';

/** عرض دائنين/مدينين إضافيين عند التعدد */
export function useExecutionPartiesOrchestrator(
    executionFileKey: ExecutionFileKey,
): ExecutionPartiesOrchestratorSlice {
    const [showExtraCreditors, setShowExtraCreditors] = useState(false);
    const [showExtraDebtors, setShowExtraDebtors] = useState(false);

    useEffect(() => {
        setShowExtraCreditors(false);
        setShowExtraDebtors(false);
    }, [executionFileKey]);

    return {
        showExtraCreditors,
        setShowExtraCreditors,
        showExtraDebtors,
        setShowExtraDebtors,
    };
}
