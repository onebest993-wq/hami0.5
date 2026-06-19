import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';
import { applyJudgmentConfirm } from './judgmentConfirm/applyJudgmentConfirm';

export function useJudgmentConfirmAction(options: UseSmartFileJudgmentActionsOptions) {
    const handleJudgmentConfirm = (judgmentData: Parameters<typeof applyJudgmentConfirm>[0]) =>
        applyJudgmentConfirm(judgmentData, options);

    return { handleJudgmentConfirm };
}
