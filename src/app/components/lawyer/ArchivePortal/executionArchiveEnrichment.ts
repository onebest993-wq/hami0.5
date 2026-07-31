import type { CaseFile } from '@/app/types/common';
import type { ComputedSmartStatus, ArchiveEnrichedRow, LooseArchiveFile, StageWithCaseMeta } from './types';
import { isExecutionArchived, isExecutionInTrash } from '@/app/utils/executionTrash';
import { executionTotalDemandEstimate } from './archivePortalAmountUtils';

/** Enrichment ثقيل لمسار التنفيذ فقط — يسحب SecureStore عبر utils. */
export function computeExecutionArchiveEnrichedFiles(
    files: unknown[],
    filteredExecutionFiles: unknown[],
): ArchiveEnrichedRow[] {
    const allFiles = files as LooseArchiveFile[];
    const unifiedChildCountByParent = new Map<string, number>();
    const unifiedDemandByParent = new Map<string, number>();

    for (const row of allFiles) {
        if (isExecutionInTrash(row) || isExecutionArchived(row)) continue;
        const parentId = String((row as { parentId?: unknown }).parentId || '').trim();
        if (!parentId) continue;
        unifiedChildCountByParent.set(parentId, (unifiedChildCountByParent.get(parentId) ?? 0) + 1);
        unifiedDemandByParent.set(
            parentId,
            (unifiedDemandByParent.get(parentId) ?? 0) + executionTotalDemandEstimate(row),
        );
    }

    return filteredExecutionFiles.map((file): ArchiveEnrichedRow => {
        const loose = file as LooseArchiveFile;
        const caseLike = file as CaseFile & { activeStageIndex?: number };
        const stages = (caseLike.stages ?? []) as StageWithCaseMeta[];
        const activeStageIndex =
            caseLike.activeStageIndex !== undefined
                ? caseLike.activeStageIndex
                : Math.max(0, stages.length - 1);
        const currentStage = stages[activeStageIndex];

        let smartStatus: ComputedSmartStatus = {
            type: 'active',
            label: 'مستمرة',
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/30',
            timers: null,
        };

        if (currentStage?.status === 'completed') {
            const decision = currentStage.finalDecision;
            const timers = currentStage.legalTimers;

            const calcDaysRemaining = (deadline: string) => {
                const today = new Date();
                const target = new Date(deadline);
                const diff = Math.ceil(
                    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                );
                return diff > 0 ? diff : 0;
            };

            if (decision?.includes('بانتظار الطعن')) {
                const appealDays = timers?.appealDeadline
                    ? calcDaysRemaining(timers.appealDeadline)
                    : 0;
                const cassationDays = timers?.cassationDeadline
                    ? calcDaysRemaining(timers.cassationDeadline)
                    : 0;

                smartStatus = {
                    type: 'waiting_appeal',
                    label: '⏳ بانتظار طعن الخصم',
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/30',
                    timers: {
                        appeal: appealDays,
                        cassation: cassationDays,
                    },
                };
            } else if (decision === 'متروكة للمراجعة') {
                const reviewDays = timers?.reviewDeadline
                    ? calcDaysRemaining(timers.reviewDeadline)
                    : 0;

                if (reviewDays <= 0) {
                    smartStatus = {
                        type: 'annulled',
                        label: '⚫ مبطلة (انتهت مدة المراجعة)',
                        color: 'text-gray-400',
                        bgColor: 'bg-gray-500/10',
                        borderColor: 'border-gray-500/30',
                        timers: null,
                    };
                } else {
                    smartStatus = {
                        type: 'review',
                        label: '🔄 متروكة للمراجعة',
                        color: 'text-orange-400',
                        bgColor: 'bg-orange-500/10',
                        borderColor: 'border-orange-500/30',
                        timers: {
                            review: reviewDays,
                        },
                    };
                }
            } else if (decision === 'مبطلة') {
                smartStatus = {
                    type: 'annulled',
                    label: '⚫ مبطلة',
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-500/10',
                    borderColor: 'border-gray-500/30',
                    timers: null,
                };
            } else if (decision?.includes('منتهية نهائياً')) {
                const finalDays = timers?.finalAppealDeadline
                    ? calcDaysRemaining(timers.finalAppealDeadline)
                    : 0;

                smartStatus = {
                    type: 'final_close',
                    label: '🛑 منتهية (قيد الإغلاق)',
                    color: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30',
                    timers: {
                        finalAppeal: finalDays,
                    },
                };
            }
        }

        const baseId = String((loose as { id?: unknown })?.id || '').trim();
        const unifiedCount = baseId ? unifiedChildCountByParent.get(baseId) ?? 0 : 0;
        const baseDemand = executionTotalDemandEstimate(loose);
        const unifiedDemand = baseId ? unifiedDemandByParent.get(baseId) ?? 0 : 0;
        return {
            ...loose,
            smartStatus,
            unifiedCount,
            unifiedTotalDemand: unifiedCount > 0 ? baseDemand + unifiedDemand : undefined,
        };
    });
}
