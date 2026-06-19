import type { CaseFile } from '@/app/types/common';
import type { ComputedSmartStatus, ArchiveEnrichedRow, LooseArchiveFile, StageWithCaseMeta } from './types';
import { isExecutionInTrash } from '@/app/utils/executionTrash';
import { executionTotalDemandEstimate } from './utils';

const DEFAULT_ARCHIVE_SMART_STATUS: ComputedSmartStatus = {
    type: 'active',
    label: '🟢 مستمرة',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    timers: null,
};

export function computeArchiveEnrichedFiles(
    type: string,
    files: unknown[],
    filteredExecutionFiles: unknown[],
    filteredLawsuitFiles: unknown[],
): ArchiveEnrichedRow[] {
            const filesToEnrich =
                type === 'executions'
                    ? filteredExecutionFiles
                    : type === 'lawsuits'
                      ? filteredLawsuitFiles
                      : files;
    
            if (type !== 'executions') {
                return filesToEnrich.map((file): ArchiveEnrichedRow => ({
                    ...(file as LooseArchiveFile),
                    smartStatus: DEFAULT_ARCHIVE_SMART_STATUS,
                }));
            }
            
            return filesToEnrich.map((file): ArchiveEnrichedRow => {
                const loose = file as LooseArchiveFile;
                const caseLike = file as CaseFile & { activeStageIndex?: number };
                const stages = (caseLike.stages ?? []) as StageWithCaseMeta[];
                const activeStageIndex =
                    caseLike.activeStageIndex !== undefined ? caseLike.activeStageIndex : Math.max(0, stages.length - 1);
                const currentStage = stages[activeStageIndex];
    
                // Default values
                let smartStatus: ComputedSmartStatus = {
                    type: 'active', // active | waiting_appeal | review | annulled | final_close
                    label: '🟢 مستمرة',
                    color: 'text-green-400',
                    bgColor: 'bg-green-500/10',
                    borderColor: 'border-green-500/30',
                    timers: null
                };
    
                // Check if stage has legal timers
                if (currentStage?.status === 'completed') {
                    const decision = currentStage.finalDecision;
                    const timers = currentStage.legalTimers;
    
                    // Calculate remaining days
                    const calcDaysRemaining = (deadline: string) => {
                        const today = new Date();
                        const target = new Date(deadline);
                        const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return diff > 0 ? diff : 0;
                    };
    
                    // محسومة لصالح الموكل - بانتظار الطعن
                    if (decision?.includes('بانتظار الطعن')) {
                        const appealDays = timers?.appealDeadline ? calcDaysRemaining(timers.appealDeadline) : 0;
                        const cassationDays = timers?.cassationDeadline ? calcDaysRemaining(timers.cassationDeadline) : 0;
                        
                        smartStatus = {
                            type: 'waiting_appeal',
                            label: '⏳ بانتظار طعن الخصم',
                            color: 'text-blue-400',
                            bgColor: 'bg-blue-500/10',
                            borderColor: 'border-blue-500/30',
                            timers: {
                                appeal: appealDays,
                                cassation: cassationDays
                            }
                        };
                    }
                    // متروكة للمراجعة
                    else if (decision === 'متروكة للمراجعة') {
                        const reviewDays = timers?.reviewDeadline ? calcDaysRemaining(timers.reviewDeadline) : 0;
                        
                        // Auto-convert to annulled if expired
                        if (reviewDays <= 0) {
                            smartStatus = {
                                type: 'annulled',
                                label: '⚫ مبطلة (انتهت مدة المراجعة)',
                                color: 'text-gray-400',
                                bgColor: 'bg-gray-500/10',
                                borderColor: 'border-gray-500/30',
                                timers: null
                            };
                        } else {
                            smartStatus = {
                                type: 'review',
                                label: '🔄 متروكة للمراجعة',
                                color: 'text-orange-400',
                                bgColor: 'bg-orange-500/10',
                                borderColor: 'border-orange-500/30',
                                timers: {
                                    review: reviewDays
                                }
                            };
                        }
                    }
                    // مبطلة
                    else if (decision === 'مبطلة') {
                        smartStatus = {
                            type: 'annulled',
                            label: '⚫ مبطلة',
                            color: 'text-gray-400',
                            bgColor: 'bg-gray-500/10',
                            borderColor: 'border-gray-500/30',
                            timers: null
                        };
                    }
                    // منتهية نهائياً (30 يوم للطعن)
                    else if (decision?.includes('منتهية نهائياً')) {
                        const finalDays = timers?.finalAppealDeadline ? calcDaysRemaining(timers.finalAppealDeadline) : 0;
                        
                        smartStatus = {
                            type: 'final_close',
                            label: '🛑 منتهية (قيد الإغلاق)',
                            color: 'text-red-400',
                            bgColor: 'bg-red-500/10',
                            borderColor: 'border-red-500/30',
                            timers: {
                                finalAppeal: finalDays
                            }
                        };
                    }
                }
    
                if (type === 'executions') {
                    const baseId = String((loose as any)?.id || '').trim();
                    const unified = baseId
                        ? (files as any[]).filter(
                              (x: any) =>
                                  String(x?.parentId || '').trim() === baseId &&
                                  !isExecutionInTrash(x as LooseArchiveFile)
                          )
                        : [];
                    const baseDemand = executionTotalDemandEstimate(loose);
                    const unifiedDemand = unified.reduce((acc, cur) => acc + executionTotalDemandEstimate(cur as any), 0);
                    return {
                        ...loose,
                        smartStatus,
                        unifiedCount: unified.length,
                        unifiedTotalDemand: unified.length > 0 ? baseDemand + unifiedDemand : undefined,
                    };
                }
    
                return {
                    ...loose,
                    smartStatus,
                };
            });
}
