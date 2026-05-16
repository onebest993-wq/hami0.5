import { useState, useEffect } from 'react';
import {
    DECISIONS_RELOAD_EVENT,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    decisionsRowsAppealBannerState,
    type ExecutionAppealBannerKind,
} from '@/app/utils/executionDecisionAppealActive';

export function decisionsRowsHaveActiveAppealPhase(rows: Record<string, unknown>[]): boolean {
    return decisionsRowsAppealBannerState(rows).show;
}

export function executionAppealBannerLabel(kind: ExecutionAppealBannerKind | null): string {
    if (kind === 'tamyeez') return 'الإضبارة قيد التمييز';
    if (kind === 'tadhallum') return 'الإضبارة قيد التظلّم';
    return 'مسار طعن سارٍ';
}

export interface ExecutionAppealBannerState {
    show: boolean;
    kind: ExecutionAppealBannerKind | null;
    label: string;
}

/**
 * يتفاعل مع `hami-decisions-reload` لعرض شارة الطعن في بطاقات الأطراف والرأس.
 */
export function useExecutionAppealBannerState(
    executionId: string | undefined
): ExecutionAppealBannerState {
    const [state, setState] = useState<ExecutionAppealBannerState>({
        show: false,
        kind: null,
        label: executionAppealBannerLabel(null),
    });

    useEffect(() => {
        const sync = () => {
            const rows = readExecutorDecisionsArray(executionId);
            const { show, kind } = decisionsRowsAppealBannerState(rows);
            setState({ show, kind, label: executionAppealBannerLabel(kind) });
        };
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        return () => window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
    }, [executionId]);

    return state;
}

/** @deprecated prefer useExecutionAppealBannerState للحصول على نوع الطعن (تظلم/تمييز) */
export function useHasActiveExecutionAppeals(executionId: string | undefined): boolean {
    const { show } = useExecutionAppealBannerState(executionId);
    return show;
}
