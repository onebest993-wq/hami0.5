/** Documents + real-estate seizure + decisions — EarlyCluster sibling */
import React, { Suspense } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import {
    ExecutionDecisionsInstantFrame,
    ExecutionDocumentsInstantFrame,
    ExecutionNamedOverlayInstantFrame,
} from './executionOverlayInstantPresets';
import {
    LazyDocumentVault as LazyDocumentVaultStrict,
    LazyExecutionDecisionsModalContainer as LazyExecutionDecisionsModalContainerStrict,
    LazyRealEstateSeizurePostApprovalModal as LazyRealEstateSeizurePostApprovalModalStrict,
    LazyDecisionsAndAppealsEngine,
} from '../executionDashboardLazyRegistryOverlays';

type LooseComp = React.ComponentType<Record<string, unknown>>;
const LazyDocumentVault = LazyDocumentVaultStrict as unknown as LooseComp;
const LazyRealEstateSeizurePostApprovalModal =
    LazyRealEstateSeizurePostApprovalModalStrict as unknown as LooseComp;
const LazyExecutionDecisionsModalContainer =
    LazyExecutionDecisionsModalContainerStrict as unknown as LooseComp;

export function ExecutionDashboardHeavyModalsEarlyDocumentsDecisions({
    s,
}: {
    s: Record<string, unknown>;
}) {
    return (
        <>
            {s.showDocumentsModal && (
                <Suspense
                    fallback={
                        <ExecutionDocumentsInstantFrame
                            onClose={
                                typeof s.onCloseDocumentsModal === 'function'
                                    ? (s.onCloseDocumentsModal as () => void)
                                    : () => {
                                          if (typeof s.setShowDocumentsModal === 'function') {
                                              (s.setShowDocumentsModal as (v: boolean) => void)(
                                                  false,
                                              );
                                          }
                                      }
                            }
                        />
                    }
                >
                    <LazyDocumentVault
                        executionId={String(s.executionId || s.file?.id || 'unknown')}
                        onClose={
                            typeof s.onCloseDocumentsModal === 'function'
                                ? s.onCloseDocumentsModal
                                : () => s.setShowDocumentsModal(false)
                        }
                        onDocumentUploaded={(info: {
                            title: string;
                            category: string;
                            fileName: string;
                        }) => {
                            const now = new Date().toISOString();
                            const docEvent: TimelineEvent = {
                                id: s.nextTimelineId(),
                                type: 'other',
                                date: now,
                                timestamp: now,
                                title: `مستند: ${info.title}`,
                                description: `${info.category} — ${info.fileName}`,
                                source: 'المستندات والملفات',
                            };
                            s.setTimelineEvents((prev: TimelineEvent[]) => [docEvent, ...prev]);
                        }}
                    />
                </Suspense>
            )}

            {s.showRealEstateSeizureModal ? (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="بيانات حجز العقار — بعد موافقة المنفذ"
                            onClose={() => {
                                if (typeof s.onCloseRealEstateSeizureModal === 'function') {
                                    (s.onCloseRealEstateSeizureModal as () => void)();
                                    return;
                                }
                                if (typeof s.setShowRealEstateSeizureModal === 'function') {
                                    (s.setShowRealEstateSeizureModal as (v: boolean) => void)(
                                        false,
                                    );
                                }
                                if (typeof s.setRealEstateSeizureModalDecisionId === 'function') {
                                    (
                                        s.setRealEstateSeizureModalDecisionId as (
                                            v: null,
                                        ) => void
                                    )(null);
                                }
                            }}
                        />
                    }
                >
                    <LazyRealEstateSeizurePostApprovalModal
                        open={s.showRealEstateSeizureModal}
                        onOpenChange={(open: boolean) => {
                            if (open) {
                                s.setShowRealEstateSeizureModal(true);
                                return;
                            }
                            if (typeof s.onCloseRealEstateSeizureModal === 'function') {
                                s.onCloseRealEstateSeizureModal();
                            } else {
                                s.setShowRealEstateSeizureModal(false);
                                s.setRealEstateSeizureModalDecisionId(null);
                            }
                        }}
                        decisionId={String(s.realEstateSeizureModalDecisionId || '')}
                        initial={s.realEstateModalInitial}
                        disabled={s.isHistoricalMode}
                        onSave={s.saveRealEstateSeizureFromModal}
                    />
                </Suspense>
            ) : null}

            {s.showDecisionsModal ? (
                <Suspense
                    fallback={
                        <ExecutionDecisionsInstantFrame
                            onClose={
                                typeof s.onCloseDecisionsModal === 'function'
                                    ? (s.onCloseDecisionsModal as () => void)
                                    : () => {
                                          if (typeof s.setShowDecisionsModal === 'function') {
                                              (s.setShowDecisionsModal as (v: boolean) => void)(
                                                  false,
                                              );
                                          }
                                          if (typeof s.clearDecisionsModalBootState === 'function') {
                                              (s.clearDecisionsModalBootState as () => void)();
                                          }
                                      }
                            }
                        />
                    }
                >
                    <LazyExecutionDecisionsModalContainer
                        showDecisionsModal={s.showDecisionsModal}
                        onCloseDecisionsModal={
                            typeof s.onCloseDecisionsModal === 'function'
                                ? s.onCloseDecisionsModal
                                : () => {
                                      if (typeof s.setShowDecisionsModal === 'function') {
                                          s.setShowDecisionsModal(false);
                                      }
                                      if (typeof s.clearDecisionsModalBootState === 'function') {
                                          s.clearDecisionsModalBootState();
                                      }
                                  }
                        }
                        LazyDecisionsAndAppealsEngine={LazyDecisionsAndAppealsEngine}
                        executionId={
                            s.decisionsStorageExecutionId &&
                            s.decisionsStorageExecutionId !== 'default'
                                ? s.decisionsStorageExecutionId
                                : s.executionId && s.executionId !== 'default'
                                  ? s.executionId
                                  : undefined
                        }
                        getMilestoneTimelineSnapshot={s.getMilestoneTimelineSnapshot}
                        onTimelineUpdate={(event: TimelineEvent) => {
                            s.setTimelineEvents((prev: TimelineEvent[]) => {
                                const next = s.mergeSimilarRecentTimelineEvent(prev, event);
                                queueMicrotask(() => {
                                    s.persistExecutionMerge({ timelineEvents: next });
                                    const execId = String(
                                        s.executionDataRef.current?.id ?? s.executionId ?? ''
                                    );
                                    if (!execId || execId === 'undefined') return;
                                    if (event.snapshot == null) return;
                                    const mergedRow =
                                        next.find((e: TimelineEvent) => e.id === event.id) ??
                                        next.find(
                                            (e: TimelineEvent) => e.snapshot === event.snapshot
                                        ) ??
                                        next[0];
                                    const rowForRemote = mergedRow
                                        ? { ...mergedRow, id: event.id, snapshot: event.snapshot }
                                        : { ...event };
                                    void import('@/app/services/timelineEventsSupabase')
                                        .then(({ insertTimelineEventToSupabase }) =>
                                            insertTimelineEventToSupabase({
                                                executionFileId: execId,
                                                event: rowForRemote,
                                                snapshotData: event.snapshot,
                                            })
                                        )
                                        .catch(() => {});
                                });
                                return next;
                            });
                        }}
                        bootHubTab={
                            (s.decisionsModalBootListTab ?? s.decisionsModalBootHubTab) ?? undefined
                        }
                        decisionsScrollToIdOnBoot={s.decisionsModalScrollToDecisionId ?? undefined}
                        appealsScrollToIdOnBoot={
                            s.decisionsModalBootHubTab === 'appeals'
                                ? (s.appealsModalScrollToDecisionId ??
                                  s.firstActiveAppealDecisionId)
                                : undefined
                        }
                        executionData={s.viewExecutionData}
                        isHistoricalMode={s.isHistoricalMode}
                        seizedAssets={s.seizedAssets}
                        seizureDraftsByDecisionId={s.seizureDraftsByDecisionId}
                        persistExecutionMerge={s.persistExecutionMerge}
                        pushTimelineEvent={s.pushTimelineEvent}
                        nextTimelineId={s.nextTimelineId}
                        syncSeizedAssets={(next: unknown) => s.setSeizedAssets(next)}
                        syncSeizureDrafts={(next: unknown) => s.setSeizureDraftsByDecisionId(next)}
                        syncActiveCoerciveActions={(next: unknown) =>
                            s.setActiveCoerciveActions(next)
                        }
                        evictionExecutorWorkflow={
                            s.isEvictionExecutionModule
                                ? {
                                      dossierId: String(
                                          s.executionData?.id ?? s.executionId ?? s.file?.id ?? 'default'
                                      ),
                                      actions: s.executorApprovalActions,
                                  }
                                : undefined
                        }
                    />
                </Suspense>
            ) : null}
        </>
    );
}
