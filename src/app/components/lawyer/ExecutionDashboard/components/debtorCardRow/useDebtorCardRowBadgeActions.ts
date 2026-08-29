import { useCallback } from 'react';
import {
    dispatchDecisionsReload,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { DebtorCardRowBadgesClusterProps } from '../DebtorCardRowBadgesCluster.types';

type ConfirmFn = (message: string) => Promise<boolean>;

type BadgeActionsInput = Pick<
    DebtorCardRowBadgesClusterProps,
    | 'isPrimary'
    | 'debtorKey'
    | 'primaryDebtorKeyResolved'
    | 'rowIsEmployee'
    | 'rowTaklifAssignmentBadge'
    | 'rowPublicationNoticeBadgeResolved'
    | 'rowRegularTablighBadge'
    | 'executionData'
    | 'persistExecutionMerge'
    | 'buildPublicationNoticePatchForDebtorKey'
    | 'getPublicationNoticeForDebtorKey'
    | 'getDebtorSummonsMarkerForKey'
    | 'buildDebtorSummonsMarkerPatchForKey'
    | 'debtorSummonsMarkerLocal'
    | 'setDebtorSummonsMarkerLocal'
    | 'decisionsStorageExecutionId'
    | 'pushTimelineEvent'
    | 'nextTimelineId'
    | 'timelineDebtorMetadata'
    | 'showToast'
    | 'getEmployeeAssignmentForDebtorKey'
    | 'buildEmployeeAssignmentPatchForDebtorKey'
    | 'onOpenUnifiedSummonsHub'
>;

/** منطق شارات الصف — يُستخرج من JSX لتقليل حجم DebtorCardRowBadgesCluster */
export function useDebtorCardRowBadgeActions(input: BadgeActionsInput, confirmInSection: ConfirmFn) {
    const {
        isPrimary,
        debtorKey,
        primaryDebtorKeyResolved,
        rowIsEmployee,
        rowTaklifAssignmentBadge,
        rowPublicationNoticeBadgeResolved,
        rowRegularTablighBadge,
        executionData,
        persistExecutionMerge,
        buildPublicationNoticePatchForDebtorKey,
        getPublicationNoticeForDebtorKey,
        getDebtorSummonsMarkerForKey,
        buildDebtorSummonsMarkerPatchForKey,
        debtorSummonsMarkerLocal,
        setDebtorSummonsMarkerLocal,
        decisionsStorageExecutionId,
        pushTimelineEvent,
        nextTimelineId,
        timelineDebtorMetadata,
        showToast,
        getEmployeeAssignmentForDebtorKey,
        buildEmployeeAssignmentPatchForDebtorKey,
        onOpenUnifiedSummonsHub,
    } = input;

    const onDismissPublicationNoticeBadge =
        rowPublicationNoticeBadgeResolved && executionData?.id
            ? () => {
                  const st = getPublicationNoticeForDebtorKey(executionData, debtorKey);
                  if (!st) return;
                  const ts = new Date().toISOString();
                  persistExecutionMerge({
                      ...buildPublicationNoticePatchForDebtorKey(executionData, debtorKey, {
                          ...st,
                          badgeHiddenAt: ts,
                      }),
                  });
              }
            : undefined;

    const onDismissRegularTablighBadge =
        rowRegularTablighBadge && executionData?.id
            ? () => {
                  const m = getDebtorSummonsMarkerForKey(
                      executionData,
                      debtorKey,
                      primaryDebtorKeyResolved,
                  );
                  if (!m?.id) return;
                  const ts = new Date().toISOString();
                  const next = { ...m, badgeHiddenAt: ts };
                  persistExecutionMerge({
                      ...buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          debtorKey,
                          primaryDebtorKeyResolved,
                          next,
                      ),
                  });
                  if (debtorSummonsMarkerLocal?.id === m.id) {
                      setDebtorSummonsMarkerLocal(next);
                  }
              }
            : undefined;

    const onWithdrawTravelBan =
        isPrimary && !rowIsEmployee && executionData?.id
            ? async () => {
                  const accepted = await confirmInSection(
                      'سيتم سحب طلب منع السفر وإخفاء الشارة. هل تريد المتابعة؟',
                  );
                  if (!accepted) return;
                  const now = new Date().toISOString();
                  const exId = String(
                      decisionsStorageExecutionId || executionData.id || '',
                  ).trim();
                  const rows = readExecutorDecisionsArray(exId);
                  const last = rows.find(
                      (r) =>
                          String((r as { requestKind?: string }).requestKind || '') ===
                              'personal_coercive' &&
                          String(
                              (r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype ||
                                  '',
                          ) === 'travel_ban',
                  );
                  const did = String((last as { id?: string })?.id || '').trim();
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
                      description: 'إعادة دورة طلب منع السفر.',
                      type: 'coercive',
                      source: 'بطاقة المدين',
                      metadata: timelineDebtorMetadata(debtorKey),
                  });
                  showToast('تم التراجع عن منع السفر.', 'success');
              }
            : undefined;

    const onTaklifAssignmentActivate = rowTaklifAssignmentBadge
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
              onOpenUnifiedSummonsHub?.({
                  debtorKey: String(debtorKey),
                  initialMainTab: 'taklif',
              });
          }
        : undefined;

    const onDismissTaklifAssignmentBadge =
        rowTaklifAssignmentBadge && executionData?.id
            ? () => {
                  const ta = getEmployeeAssignmentForDebtorKey(
                      executionData,
                      debtorKey,
                      primaryDebtorKeyResolved,
                  );
                  if (!ta || ta.phase === 'none') return;
                  const ts = new Date().toISOString();
                  persistExecutionMerge({
                      ...buildEmployeeAssignmentPatchForDebtorKey(
                          executionData,
                          debtorKey,
                          { ...ta, badgeHiddenAt: ts },
                          primaryDebtorKeyResolved,
                      ),
                  });
              }
            : undefined;

    const openNashrHub = useCallback(() => {
        onOpenUnifiedSummonsHub?.({
            debtorKey: String(debtorKey),
            initialMainTab: 'nashr',
        });
    }, [debtorKey, onOpenUnifiedSummonsHub]);

    const openTablighHub = useCallback(() => {
        onOpenUnifiedSummonsHub?.({
            debtorKey: String(debtorKey),
            initialMainTab: 'tabligh',
        });
    }, [debtorKey, onOpenUnifiedSummonsHub]);

    return {
        onDismissPublicationNoticeBadge,
        onDismissRegularTablighBadge,
        onWithdrawTravelBan,
        onTaklifAssignmentActivate,
        onDismissTaklifAssignmentBadge,
        openNashrHub,
        openTablighHub,
    };
}
