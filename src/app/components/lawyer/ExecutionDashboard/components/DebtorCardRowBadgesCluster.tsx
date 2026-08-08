import React from 'react';
import type {
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type {
    PublicationNoticeBadgeInfo,
    TaklifAssignmentBadgeInfo,
} from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import {
    dispatchDecisionsReload,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { DebtorsSectionProps } from './DebtorsSection.types';

export type DebtorCardRowBadgesClusterProps = {
    isRepresentingDebtor: boolean;
    isPrimary: boolean;
    debtorBrowserTabsMode: boolean;
    debtorKey: string;
    primaryDebtorKeyResolved: string;
    rowIsEmployee: boolean;
    rowForcedAttendancePending: boolean;
    rowMemoNoticeBadge: DebtorsSectionProps['primaryMemoNoticeBadge'];
    rowAbsenceNoticeBadge: DebtorsSectionProps['primaryDebtorAbsenceBadge'];
    rowShowSummonsBadge: boolean;
    rowRegularTablighBadge: {
        noticeDateYmd: string;
        purpose: string;
        recordedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
    } | null;
    rowPublicationNoticeBadgeResolved: PublicationNoticeBadgeInfo | null;
    rowTaklifAssignmentBadge: TaklifAssignmentBadgeInfo | null;
    safeSeizedAssets: SeizedAsset[];
    safeRealEstateSeizureAssets: RealEstateSeizureAsset[];
    safeThirdPartySeizureAssets: ThirdPartySeizureAsset[];
    safeThirdPartySeizures: ThirdPartySeizure[];
    safeStandaloneExecutionMarks: StandaloneExecutionMark[];
    safeActiveTimelineEvents: TimelineEvent[];
    safeActiveTimelineEventsDebtorScoped: TimelineEvent[];
    DebtorSeizureCategoryBadges: DebtorsSectionProps['DebtorSeizureCategoryBadges'];
    ExecutionPartyInteractiveBadges: DebtorsSectionProps['ExecutionPartyInteractiveBadges'];
    partyBadgesExecutionId: DebtorsSectionProps['partyBadgesExecutionId'];
    viewExecutionData: DebtorsSectionProps['viewExecutionData'];
    debtorAttendedVoluntarily: DebtorsSectionProps['debtorAttendedVoluntarily'];
    voluntaryAttendanceCount: DebtorsSectionProps['voluntaryAttendanceCount'];
    executionData: DebtorsSectionProps['executionData'];
    setSummonsMarkerPopoverOpen: DebtorsSectionProps['setSummonsMarkerPopoverOpen'];
    setExecutionMemoBadgePopoverOpen: DebtorsSectionProps['setExecutionMemoBadgePopoverOpen'];
    evictionGraceBadgeInfo: DebtorsSectionProps['evictionGraceBadgeInfo'];
    evictionGracePinned: DebtorsSectionProps['evictionGracePinned'];
    toggleEvictionGracePinned: DebtorsSectionProps['toggleEvictionGracePinned'];
    setEvictionGraceDecisionId: DebtorsSectionProps['setEvictionGraceDecisionId'];
    openEvictionResidentialGraceModal: DebtorsSectionProps['openEvictionResidentialGraceModal'];
    completeEvictionResidentialGrace: DebtorsSectionProps['completeEvictionResidentialGrace'];
    policeAssistanceBadgeInfo: DebtorsSectionProps['policeAssistanceBadgeInfo'];
    openPoliceAssistanceFromBadge: DebtorsSectionProps['openPoliceAssistanceFromBadge'];
    completePoliceAssistance: DebtorsSectionProps['completePoliceAssistance'];
    getPublicationNoticeForDebtorKey: DebtorsSectionProps['getPublicationNoticeForDebtorKey'];
    persistExecutionMerge: DebtorsSectionProps['persistExecutionMerge'];
    buildPublicationNoticePatchForDebtorKey: DebtorsSectionProps['buildPublicationNoticePatchForDebtorKey'];
    onOpenUnifiedSummonsHub: DebtorsSectionProps['onOpenUnifiedSummonsHub'];
    dismissDebtorAbsenceBadge: DebtorsSectionProps['dismissDebtorAbsenceBadge'];
    getDebtorSummonsMarkerForKey: DebtorsSectionProps['getDebtorSummonsMarkerForKey'];
    buildDebtorSummonsMarkerPatchForKey: DebtorsSectionProps['buildDebtorSummonsMarkerPatchForKey'];
    debtorSummonsMarkerLocal: DebtorsSectionProps['debtorSummonsMarkerLocal'];
    setDebtorSummonsMarkerLocal: DebtorsSectionProps['setDebtorSummonsMarkerLocal'];
    debtorArrested: DebtorsSectionProps['debtorArrested'];
    decisionsStorageExecutionId: DebtorsSectionProps['decisionsStorageExecutionId'];
    pushTimelineEvent: DebtorsSectionProps['pushTimelineEvent'];
    nextTimelineId: DebtorsSectionProps['nextTimelineId'];
    timelineDebtorMetadata: DebtorsSectionProps['timelineDebtorMetadata'];
    showToast: DebtorsSectionProps['showToast'];
    getEmployeeAssignmentForDebtorKey: DebtorsSectionProps['getEmployeeAssignmentForDebtorKey'];
    buildEmployeeAssignmentPatchForDebtorKey: DebtorsSectionProps['buildEmployeeAssignmentPatchForDebtorKey'];
    decisionsReloadEpoch: DebtorsSectionProps['decisionsReloadEpoch'];
    isHistoricalMode: DebtorsSectionProps['isHistoricalMode'];
};

export function DebtorCardRowBadgesCluster({
    isRepresentingDebtor,
    isPrimary,
    debtorBrowserTabsMode,
    debtorKey,
    primaryDebtorKeyResolved,
    rowIsEmployee,
    rowForcedAttendancePending,
    rowMemoNoticeBadge,
    rowAbsenceNoticeBadge,
    rowShowSummonsBadge,
    rowRegularTablighBadge,
    rowPublicationNoticeBadgeResolved,
    rowTaklifAssignmentBadge,
    safeSeizedAssets,
    safeRealEstateSeizureAssets,
    safeThirdPartySeizureAssets,
    safeThirdPartySeizures,
    safeStandaloneExecutionMarks,
    safeActiveTimelineEvents,
    safeActiveTimelineEventsDebtorScoped,
    DebtorSeizureCategoryBadges,
    ExecutionPartyInteractiveBadges,
    partyBadgesExecutionId,
    viewExecutionData,
    debtorAttendedVoluntarily,
    voluntaryAttendanceCount,
    executionData,
    setSummonsMarkerPopoverOpen,
    setExecutionMemoBadgePopoverOpen,
    evictionGraceBadgeInfo,
    evictionGracePinned,
    toggleEvictionGracePinned,
    setEvictionGraceDecisionId,
    openEvictionResidentialGraceModal,
    completeEvictionResidentialGrace,
    policeAssistanceBadgeInfo,
    openPoliceAssistanceFromBadge,
    completePoliceAssistance,
    getPublicationNoticeForDebtorKey,
    persistExecutionMerge,
    buildPublicationNoticePatchForDebtorKey,
    onOpenUnifiedSummonsHub,
    dismissDebtorAbsenceBadge,
    getDebtorSummonsMarkerForKey,
    buildDebtorSummonsMarkerPatchForKey,
    debtorSummonsMarkerLocal,
    setDebtorSummonsMarkerLocal,
    debtorArrested,
    decisionsStorageExecutionId,
    pushTimelineEvent,
    nextTimelineId,
    timelineDebtorMetadata,
    showToast,
    getEmployeeAssignmentForDebtorKey,
    buildEmployeeAssignmentPatchForDebtorKey,
    decisionsReloadEpoch,
    isHistoricalMode,
}: DebtorCardRowBadgesClusterProps) {
                                                                    if (isRepresentingDebtor) return null;
                                                                    const hasSeizureBadges =
                                                                        safeSeizedAssets.length > 0 ||
                                                                        safeRealEstateSeizureAssets.length > 0 ||
                                                                        safeThirdPartySeizureAssets.length > 0 ||
                                                                        safeThirdPartySeizures.length > 0 ||
                                                                        safeStandaloneExecutionMarks.length > 0;
                                                                    const showInteractive = Boolean(isPrimary || debtorBrowserTabsMode);
                                                                    if (!hasSeizureBadges && !showInteractive) return null;
                                                                    return (
                                                                        <div
                                                                            className="mt-2 flex flex-row-reverse flex-wrap items-center justify-start gap-1.5"
                                                                            dir="rtl"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onKeyDown={(e) => e.stopPropagation()}
                                                                            role="presentation"
                                                                        >
                                                                            {showInteractive ? (
                                                                                <ExecutionPartyInteractiveBadges
                                                                                    embeddedInRow
                                                                                    executionId={partyBadgesExecutionId}
                                                                                    party="debtor"
                                                                                    isPrimaryDebtor={isPrimary}
                                                                                    executionData={viewExecutionData}
                                                                                    debtorAttendedVoluntarily={
                                                                                        isPrimary
                                                                                            ? debtorAttendedVoluntarily
                                                                                            : false
                                                                                    }
                                                                                    voluntaryAttendanceCount={
                                                                                        isPrimary
                                                                                            ? voluntaryAttendanceCount
                                                                                            : 0
                                                                                    }
                                                                                    seizedAssets={safeSeizedAssets}
                                                                                    timelineEvents={
                                                                                        debtorBrowserTabsMode
                                                                                            ? safeActiveTimelineEventsDebtorScoped
                                                                                            : safeActiveTimelineEvents
                                                                                    }
                                                                                    memoBadge={rowMemoNoticeBadge}
                                                                                    onMemoActivate={() => {
                                                                                        setSummonsMarkerPopoverOpen(false);
                                                                                        setExecutionMemoBadgePopoverOpen(true);
                                                                                    }}
                                                                                    evictionGraceBadge={
                                                                                        isPrimary
                                                                                            ? evictionGraceBadgeInfo
                                                                                            : null
                                                                                    }
                                                                                    evictionGracePinned={evictionGracePinned}
                                                                                    onToggleEvictionGracePinned={toggleEvictionGracePinned}
                                                                                    onEvictionGraceActivate={
                                                                                        isPrimary &&
                                                                                        evictionGraceBadgeInfo &&
                                                                                        typeof openEvictionResidentialGraceModal ===
                                                                                            'function'
                                                                                            ? () => {
                                                                                                  setEvictionGraceDecisionId(null);
                                                                                                  openEvictionResidentialGraceModal();
                                                                                              }
                                                                                            : undefined
                                                                                    }
                                                                                    onCompleteEvictionGrace={
                                                                                        isPrimary &&
                                                                                        evictionGraceBadgeInfo &&
                                                                                        typeof completeEvictionResidentialGrace ===
                                                                                            'function'
                                                                                            ? completeEvictionResidentialGrace
                                                                                            : undefined
                                                                                    }
                                                                                    policeAssistanceBadge={
                                                                                        isPrimary
                                                                                            ? policeAssistanceBadgeInfo
                                                                                            : null
                                                                                    }
                                                                                    onPoliceAssistanceActivate={
                                                                                                    isPrimary &&
                                                                                                    policeAssistanceBadgeInfo &&
                                                                                                    typeof openPoliceAssistanceFromBadge ===
                                                                                                        'function'
                                                                                                        ? openPoliceAssistanceFromBadge
                                                                                                        : undefined
                                                                                                }
                                                                                                onCompletePoliceAssistance={
                                                                                                    isPrimary &&
                                                                                                    policeAssistanceBadgeInfo &&
                                                                                                    typeof completePoliceAssistance ===
                                                                                                        'function'
                                                                                                        ? completePoliceAssistance
                                                                                                        : undefined
                                                                                                }
                                                                                                publicationNoticeBadge={rowPublicationNoticeBadgeResolved}
                                                                                                onDismissPublicationNoticeBadge={
                                                                                                    rowPublicationNoticeBadgeResolved &&
                                                                                                    executionData?.id
                                                                                                        ? () => {
                                                                                                              const st = getPublicationNoticeForDebtorKey(
                                                                                                                  executionData,
                                                                                                                  debtorKey
                                                                                                              );
                                                                                                              if (!st) return;
                                                                                                              const ts = new Date().toISOString();
                                                                                                              persistExecutionMerge({
                                                                                                                  ...buildPublicationNoticePatchForDebtorKey(
                                                                                                                      executionData,
                                                                                                                      debtorKey,
                                                                                                                      {
                                                                                                                          ...st,
                                                                                                                          badgeHiddenAt: ts,
                                                                                                                      }
                                                                                                                  ),
                                                                                                              });
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                onPublicationNoticeActivate={() => {
                                                                                                    onOpenUnifiedSummonsHub({
                                                                                                        debtorKey: String(debtorKey),
                                                                                                        initialMainTab: 'nashr',
                                                                                                    });
                                                                                                }}
                                                                                                absenceBadge={rowAbsenceNoticeBadge}
                                                                                                onDismissAbsence={
                                                                                                    rowAbsenceNoticeBadge
                                                                                                        ? dismissDebtorAbsenceBadge
                                                                                                        : undefined
                                                                                                }
                                                                                                showSummonsBadge={rowShowSummonsBadge}
                                                                                                onSummonsActivate={() => {
                                                                                                    onOpenUnifiedSummonsHub({
                                                                                                        debtorKey: String(debtorKey),
                                                                                                        initialMainTab: 'tabligh',
                                                                                                    });
                                                                                                }}
                                                                                                regularTablighBadge={rowRegularTablighBadge}
                                                                                                onDismissRegularTablighBadge={
                                                                                                    rowRegularTablighBadge && executionData?.id
                                                                                                        ? () => {
                                                                                                              const m = getDebtorSummonsMarkerForKey(
                                                                                                                  executionData,
                                                                                                                  debtorKey,
                                                                                                                  primaryDebtorKeyResolved
                                                                                                              );
                                                                                                              if (!m?.id) return;
                                                                                                              const ts = new Date().toISOString();
                                                                                                              const next = {
                                                                                                                  ...m,
                                                                                                                  badgeHiddenAt: ts,
                                                                                                              };
                                                                                                              persistExecutionMerge({
                                                                                                                  ...buildDebtorSummonsMarkerPatchForKey(
                                                                                                                      executionData,
                                                                                                                      debtorKey,
                                                                                                                      primaryDebtorKeyResolved,
                                                                                                                      next
                                                                                                                  ),
                                                                                                              });
                                                                                                              if (debtorSummonsMarkerLocal?.id === m.id) {
                                                                                                                  setDebtorSummonsMarkerLocal(next);
                                                                                                              }
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                debtorArrested={Boolean(
                                                                                                    debtorArrested || executionData?.debtorArrested
                                                                                                )}
                                                                                                personalCoerciveDecisionBadges={!rowIsEmployee}
                                                                                                debtorIsEmployee={rowIsEmployee}
                                                                                                activeDebtorKey={String(debtorKey)}
                                                                                                primaryDebtorKey={primaryDebtorKeyResolved}
                                                                                                forcedAttendancePending={rowForcedAttendancePending}
                                                                                                onWithdrawTravelBan={
                                                                                                    isPrimary &&
                                                                                                    !rowIsEmployee &&
                                                                                                    executionData?.id
                                                                                                        ? () => {
                                                                                                              if (
                                                                                                                  !window.confirm(
                                                                                                                      'سيتم سحب طلب منع السفر وإخفاء الشارة. هل تريد المتابعة؟'
                                                                                                                  )
                                                                                                              ) {
                                                                                                                  return;
                                                                                                              }
                                                                                                              const now =
                                                                                                                  new Date().toISOString();
                                                                                                              const exId = String(
                                                                                                                  decisionsStorageExecutionId ||
                                                                                                                      executionData.id ||
                                                                                                                      ''
                                                                                                              ).trim();
                                                                                                              const rows =
                                                                                                                  readExecutorDecisionsArray(
                                                                                                                      exId
                                                                                                                  );
                                                                                                              const last = rows.find(
                                                                                                                  (r) =>
                                                                                                                      String(
                                                                                                                          (r as { requestKind?: string })
                                                                                                                              .requestKind || ''
                                                                                                                      ) === 'personal_coercive' &&
                                                                                                                      String(
                                                                                                                          (r as { personalCoerciveSubtype?: string })
                                                                                                                              .personalCoerciveSubtype || ''
                                                                                                                      ) === 'travel_ban'
                                                                                                              );
                                                                                                              const did = String(
                                                                                                                  (last as { id?: string })?.id || ''
                                                                                                              ).trim();
                                                                                                              if (did) {
                                                                                                                  patchExecutorDecisionRow(exId, did, {
                                                                                                                      lawyerWithdrawn: true,
                                                                                                                      executorOutcome: 'withdrawn',
                                                                                                                      personalCoerciveWithdrawnAt: now,
                                                                                                                  });
                                                                                                              }
                                                                                                              dispatchDecisionsReload();
                                                                                                              persistExecutionMerge({
                                                                                                                  debtor_travel_ban_active: false,
                                                                                                                  travel_ban_withdrawn_at: now,
                                                                                                              });
                                                                                                              pushTimelineEvent({
                                                                                                                  id: nextTimelineId(),
                                                                                                                  date: now.slice(0, 10),
                                                                                                                  timestamp: now,
                                                                                                                  title: '↩️ التراجع عن طلب منع السفر',
                                                                                                                  description:
                                                                                                                      'إعادة دورة طلب منع السفر.',
                                                                                                                  type: 'coercive',
                                                                                                                  source: 'بطاقة المدين',
                                                                                                                  metadata:
                                                                                                                      timelineDebtorMetadata(
                                                                                                                          debtorKey
                                                                                                                      ),
                                                                                                              });
                                                                                                              showToast(
                                                                                                                  'تم التراجع عن منع السفر.',
                                                                                                                  'success'
                                                                                                              );
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                taklifAssignmentBadge={rowTaklifAssignmentBadge}
                                                                                                onTaklifAssignmentActivate={
                                                                                                    rowTaklifAssignmentBadge
                                                                                                        ? () => {
                                                                                                              const tb = rowTaklifAssignmentBadge;
                                                                                                              const ts = new Date().toISOString();
                                                                                                              const remLine =
                                                                                                                  tb.remainingDays === null
                                                                                                                      ? '?'
                                                                                                                      : tb.remainingDays === 0
                                                                                                                        ? 'انتهت المهلة'
                                                                                                                        : `${tb.remainingDays} أيام`;
                                                                                                              pushTimelineEvent({
                                                                                                                  id: nextTimelineId(),
                                                                                                                  date: ts.slice(0, 10),
                                                                                                                  timestamp: ts,
                                                                                                                  title: 'مذكرة تبليغ تكليف موظف (من دورة سابقة)',
                                                                                                                  description: `الغرض: ${tb.purpose}\nتاريخ التبليغ: ${tb.notifyDateYmd}\nتاريخ التسليم: ${tb.deadlineYmd || '?'}\nالمتبقي: ${remLine}`,
                                                                                                                  type: 'summons',
                                                                                                                  source: 'taklif_badge',
                                                                                                                  metadata: {
                                                                                                                      ...timelineDebtorMetadata(debtorKey),
                                                                                                                      timelineThreadKey: `taklif_badge_snapshot:${debtorKey}`,
                                                                                                                  },
                                                                                                              });
                                                                                                              onOpenUnifiedSummonsHub({
                                                                                                                  debtorKey: String(debtorKey),
                                                                                                                  initialMainTab: 'taklif',
                                                                                                              });
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                onDismissTaklifAssignmentBadge={
                                                                                                    rowTaklifAssignmentBadge && executionData?.id
                                                                                                        ? () => {
                                                                                                              const ta = getEmployeeAssignmentForDebtorKey(
                                                                                                                  executionData,
                                                                                                                  debtorKey,
                                                                                                                  primaryDebtorKeyResolved
                                                                                                              );
                                                                                                              if (!ta || ta.phase === 'none') return;
                                                                                                              const ts = new Date().toISOString();
                                                                                                              persistExecutionMerge({
                                                                                                                  ...buildEmployeeAssignmentPatchForDebtorKey(
                                                                                                                      executionData,
                                                                                                                      debtorKey,
                                                                                                                      {
                                                                                                                          ...ta,
                                                                                                                          badgeHiddenAt: ts,
                                                                                                                      },
                                                                                                                      primaryDebtorKeyResolved
                                                                                                                  ),
                                                                                                              });
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                decisionsReloadEpoch={decisionsReloadEpoch}
                                                                                                isHistoricalMode={isHistoricalMode}
                                                                                />
                                                                            ) : null}
                                                                            {hasSeizureBadges ? (
                                                                                <DebtorSeizureCategoryBadges
                                                                                    embeddedInRow
                                                                                    executionId={partyBadgesExecutionId}
                                                                                    decisionsExecutionId={partyBadgesExecutionId}
                                                                                    seizedAssets={safeSeizedAssets}
                                                                                    realEstateSeizureAssets={safeRealEstateSeizureAssets}
                                                                                    thirdPartySeizureAssets={safeThirdPartySeizureAssets}
                                                                                    thirdPartySeizures={safeThirdPartySeizures}
                                                                                    standaloneExecutionMarks={safeStandaloneExecutionMarks}
                                                                                />
                                                                            ) : null}
                                                                        </div>
                                                                    );
}
