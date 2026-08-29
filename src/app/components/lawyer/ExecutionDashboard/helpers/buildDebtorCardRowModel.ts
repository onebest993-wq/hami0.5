/**
 * Build derived DebtorCardRow model (no JSX).
 * Returns null when the row should not render.
 */
import type {
    Debtor,
    Party,
    ExecutionFile,
} from '@/app/types/execution';
import type {
    PublicationNoticeBadgeInfo,
    TaklifAssignmentBadgeInfo,
} from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import {
    isPartyHeirsEditOnlyMode,
    isPrimaryPartyDeceased,
    type ExecutionPartyDisplayNameResult,
} from '@/app/utils/partyDisplayName';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import { resolveDebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import { debtorShowsUnservedMemoBadge } from '@/app/utils/noticeDebtorScope';
import type { DebtorWorkspaceEntry as DebtorWorkspaceEntryContract } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorWorkspaceEntries';
import { applyDebtorCardRowNoticeBadgePriority } from './applyDebtorCardRowNoticeBadgePriority';
import type { DebtorRowLike, MemoNoticeBadge } from '../components/DebtorsSection.types';

export type { BuildDebtorCardRowModelInput } from './buildDebtorCardRowModel.types';
import type { BuildDebtorCardRowModelInput, DebtorCardRowModel } from './buildDebtorCardRowModel.types';

export function buildDebtorCardRowModel(
    input: BuildDebtorCardRowModelInput,
): DebtorCardRowModel | null {
    const {
        raw,
        loopIdx,
        applyPartyOverlay,
        multiDebtorMode,
        showExtraDebtors,
        safeDebtorWorkspaceEntries,
        safeEffectiveDebtors,
        getExecutionPartyDisplayName,
        buildPartyHeirsRows,
        executionData,
        decisionsStorageExecutionId,
        debtorBrowserTabsMode,
        isDebtorRowEmployee,
        debtorEmploymentToggleMenuLabel,
        principalDebtAmount,
        parsedLawyerFees,
        claimType,
        isNonFinancialClaim,
        debtorSummonsProfile,
        getDebtorSummonsProfile,
        isRepresentingDebtor = false,
        viewExecutionData,
        primaryDebtorKeyResolved,
        isEvictionExecutionModule,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        getPublicationNoticeForDebtorKey,
        publicationNoticeDeadlineYmd,
        isAssignmentDeadlinePassed,
        daysRemainingUntilDeadline,
        getEmployeeAssignmentForDebtorKey,
        computeTaklifDeadlineYmd,
        getPersonalCoerciveSubtypeOutcome,
        executionId,
        primaryMemoNoticeBadge,
        primaryDebtorAbsenceBadge,
        getDebtorSummonsMarkerForKey,
        forcedPathAttendanceSecured,
        debtorForcedToAttend,
    } = input;

    if (!multiDebtorMode && safeEffectiveDebtors.length > 2 && !showExtraDebtors && loopIdx >= 2) {
        return null;
    }

    const wsDebt = multiDebtorMode;
    const wsRow = raw as DebtorWorkspaceEntryContract;
    const dRaw: Debtor = wsDebt ? wsRow.d : (raw as Debtor);
    const d = applyPartyOverlay(
        dRaw as unknown as Record<string, unknown>,
        'debtor',
    ) as unknown as Debtor;
    const fileDebtorOrdinal = wsDebt
        ? Math.max(
              0,
              safeDebtorWorkspaceEntries.findIndex((e) => e.key === wsRow.key),
          )
        : loopIdx;
    const idx = wsDebt ? fileDebtorOrdinal : loopIdx;
    const isPrimary = wsDebt ? wsRow.isPrimary : loopIdx === 0;
    const primaryDebtorStableKey = (() => {
        const primaryId = (safeEffectiveDebtors[0] as Debtor | undefined)?.id;
        return primaryId != null && String(primaryId).trim() !== ''
            ? String(primaryId)
            : 'primary_debtor';
    })();
    const debtorKey = wsDebt
        ? wsRow.key
        : isPrimary
          ? primaryDebtorStableKey
          : d.id != null && String(d.id) !== ''
            ? String(d.id)
            : `d-${idx}`;
    const debtorDisp = getExecutionPartyDisplayName(
        d as Party,
        'debtor',
        fileDebtorOrdinal,
        executionData,
    );
    const debtorHeirsRows = buildPartyHeirsRows(d as Party, 'debtor') ?? [];
    const heirLinesFromDisplay = Array.isArray(debtorDisp.heirSubstituteLines)
        ? debtorDisp.heirSubstituteLines.filter((s) => /\S/.test(String(s)))
        : [];
    /** لا تعتمد فقط على heirUtils البارد — وإلا يظهر شارة «متوفى» ثم تختفي */
    const debtorHasHeirs = debtorHeirsRows.length > 0 || heirLinesFromDisplay.length > 0;
    const heirCountForWord = Math.max(debtorHeirsRows.length, heirLinesFromDisplay.length);
    const debtorHeirsWord = debtorHasHeirs ? (heirCountForWord > 1 ? 'ورثة' : 'وريث') : null;
    const debtorHeirsEditOnly = isPartyHeirsEditOnlyMode(
        executionData,
        'debtor',
        d as Party,
        idx,
        decisionsStorageExecutionId,
    );
    const debtorPartyPreserveAppealInline = debtorHasHeirs || Boolean(debtorDisp.showDeceasedGlyph);
    const useRowScopedExecProfile = debtorBrowserTabsMode || (!isPrimary && wsDebt);
    const rowOccLower = String((d as { occupation?: string }).occupation || '').toLowerCase();
    const rowIsGovEmp =
        rowOccLower.includes('موظف') ||
        rowOccLower.includes('موظفة') ||
        rowOccLower === 'موظف';
    const rowIsRetired = rowOccLower.includes('متقاعد') || rowOccLower.includes('تقاعد');
    const rowIsEmployee = (() => {
        if (!executionData) {
            return isDebtorRowEmployee(safeEffectiveDebtors[0] as DebtorRowLike | undefined);
        }
        if (isPrimary) {
            return isDebtorRowEmployee(
                (executionData.debtors?.[0] as DebtorRowLike | undefined) ?? d,
            );
        }
        const ad = executionData.party_multiplicity?.additionalDebtors?.find(
            (a) => String(a.id) === debtorKey,
        );
        if (ad) return isDebtorRowEmployee(ad as DebtorRowLike);
        return isDebtorRowEmployee(d as DebtorRowLike);
    })();
    const rowInitialWasEmployee = (() => {
        if (!executionData) return undefined;
        if (isPrimary) {
            const p = executionData.debtors?.[0] as Debtor | undefined;
            return typeof p?.employmentInitialWasEmployee === 'boolean'
                ? p.employmentInitialWasEmployee
                : undefined;
        }
        const adInit = executionData.party_multiplicity?.additionalDebtors?.find(
            (a) => String(a.id) === debtorKey,
        );
        return adInit && typeof adInit.employmentInitialWasEmployee === 'boolean'
            ? adInit.employmentInitialWasEmployee
            : undefined;
    })();
    const rowEmploymentToggleLabel = debtorEmploymentToggleMenuLabel(
        rowIsEmployee,
        rowInitialWasEmployee,
    );
    const rowEntityKind = resolveDebtorEntityKind({
        executionData,
        debtor: d,
        debtorKey,
    });
    const rowIsLegalEntity = rowEntityKind === 'legal_entity';
    const rowDebtorSummonsProfile = useRowScopedExecProfile
        ? getDebtorSummonsProfile({
              isGovernmentEmployee: rowIsGovEmp || rowIsRetired,
              parsedDebtAmount: principalDebtAmount,
              parsedLawyerFees,
              claimType: claimType || '',
              isNonFinancialClaim,
          })
        : debtorSummonsProfile;
    const rowIsDeceased = Boolean(
        isPrimary
            ? isPrimaryPartyDeceased('debtor', d as Party | undefined, executionData)
            : (d as { isDeceased?: boolean })?.isDeceased,
    );
    const showDebtorNotificationPanel =
        (isPrimary || debtorBrowserTabsMode) && !rowIsDeceased && !isRepresentingDebtor;
    const rowShowUnservedMemoBadgeRaw = showDebtorNotificationPanel
        ? debtorShowsUnservedMemoBadge(
              viewExecutionData ?? executionData,
              debtorKey,
              primaryDebtorKeyResolved,
              {
                  isEviction: isEvictionExecutionModule,
                  debtorAttendedVoluntarily,
                  voluntaryAttendanceCount,
                  noticeVoluntaryPeriodEndOptimistic,
                  evictionVoluntaryEndOptimistic: voluntaryEndOptimistic,
              },
          )
        : false;
    const rowPublicationNoticeBadge: PublicationNoticeBadgeInfo | null = (() => {
        if (rowIsDeceased) return null;
        const st = getPublicationNoticeForDebtorKey(executionData, debtorKey);
        if (!st?.publicationDateYmd) return null;
        const deadlineYmd = publicationNoticeDeadlineYmd(st.publicationDateYmd);
        const graceExpired = isAssignmentDeadlinePassed(deadlineYmd);
        const remaining = daysRemainingUntilDeadline(deadlineYmd);
        return {
            publicationDateYmd: st.publicationDateYmd,
            deadlineYmd,
            remaining,
            graceExpired,
            newspaper1: st.newspaper1,
            newspaper2: st.newspaper2,
            recordedAt: st.recordedAt,
            badgeHiddenAt: st.badgeHiddenAt,
            periodEndedAt: st.periodEndedAt,
        };
    })();
    const rowTaklifAssignmentBadge: TaklifAssignmentBadgeInfo | null = (() => {
        if (rowIsDeceased || !executionData) return null;
        const ta = getEmployeeAssignmentForDebtorKey(
            executionData,
            debtorKey,
            primaryDebtorKeyResolved,
        );
        if (!ta || ta.phase === 'none') return null;
        const dlYmd =
            ta.notifyDate != null && ta.notifyDate !== ''
                ? computeTaklifDeadlineYmd(ta.notifyDate, ta.durationDays ?? 1)
                : ta.deadlineDate || '';
        let remainingDays: number | null = null;
        if (ta.phase === 'active' && dlYmd) {
            remainingDays = isAssignmentDeadlinePassed(dlYmd)
                ? 0
                : daysRemainingUntilDeadline(dlYmd);
        }
        return {
            purpose: ta.purpose ?? '',
            notifyDateYmd: ta.notifyDate ?? '',
            deadlineYmd: dlYmd,
            phase: ta.phase as TaklifAssignmentBadgeInfo['phase'],
            remainingDays,
            cycleGeneration: ta.taklifCycleGeneration,
            confirmedAt: ta.confirmedAt,
            badgeHiddenAt: ta.badgeHiddenAt,
            periodEndedAt: ta.periodEndedAt,
            durationDays: ta.durationDays ?? 1,
        };
    })();
    const rowForcedBringDecisionState = getPersonalCoerciveSubtypeOutcome(
        String(executionData?.id ?? executionId ?? ''),
        'forced_bring_in',
        {
            debtorKey: String(debtorKey),
            primaryDebtorKey: primaryDebtorKeyResolved,
        },
    );
    const rowAbsenceNoticeBadge =
        isPrimary && !rowIsDeceased ? primaryDebtorAbsenceBadge : null;
    const summonsMarkerForRow =
        !rowIsDeceased && executionData
            ? getDebtorSummonsMarkerForKey(executionData, debtorKey, primaryDebtorKeyResolved)
            : null;
    const regularTablighBadgeRaw = summonsMarkerForRow?.date
        ? {
              noticeDateYmd: String(summonsMarkerForRow.date),
              purpose: String(summonsMarkerForRow.purpose || 'تبليغ'),
              recordedAt: summonsMarkerForRow.recordedAt,
              badgeHiddenAt: summonsMarkerForRow.badgeHiddenAt,
              periodEndedAt: summonsMarkerForRow.periodEndedAt,
          }
        : null;
    const {
        rowMemoNoticeBadge,
        rowShowSummonsBadge,
        rowRegularTablighBadge,
        rowPublicationNoticeBadgeResolved,
        rowShowUnservedMemoBadge,
    } = applyDebtorCardRowNoticeBadgePriority({
        rowIsDeceased,
        isRepresentingDebtor: Boolean(isRepresentingDebtor),
        rowTaklifAssignmentBadge,
        rowPublicationNoticeBadge,
        primaryMemoNoticeBadge,
        isPrimary,
        hasSummonsMarker: Boolean(summonsMarkerForRow),
        regularTablighBadge: regularTablighBadgeRaw,
        showUnservedMemoBadge: rowShowUnservedMemoBadgeRaw,
    });
    const rowForcedAttendancePending = rowIsEmployee
        ? (() => {
              const ra = executionData
                  ? getEmployeeAssignmentForDebtorKey(
                        executionData,
                        debtorKey,
                        primaryDebtorKeyResolved,
                    )
                  : null;
              const warrantOk = ra?.phase === 'warrant_ui' && ra?.arrestOrderRecorded;
              if (!warrantOk) return false;
              if (rowForcedBringDecisionState.pending) return false;
              if (!isPrimary) return false;
              return (
                  Boolean(rowForcedBringDecisionState.approved) &&
                  executionData?.forced_bring_in_personal_outcome !== 'brought' &&
                  executionData?.forced_bring_in_personal_outcome !== 'absconded'
              );
          })()
        : (() => {
              const attendanceResolved = isPrimary
                  ? debtorAttendedVoluntarily ||
                    forcedPathAttendanceSecured ||
                    debtorForcedToAttend ||
                    voluntaryAttendanceCount > 0
                  : false;
              if (attendanceResolved) return false;
              if (rowForcedBringDecisionState.pending) return false;
              if (!isPrimary) return false;
              if (!rowForcedBringDecisionState.approved) return false;
              return (
                  executionData?.forced_bring_in_personal_outcome !== 'brought' &&
                  executionData?.forced_bring_in_personal_outcome !== 'absconded'
              );
          })();

    return {
        wsDebt,
        wsRow,
        d,
        fileDebtorOrdinal,
        idx,
        isPrimary,
        debtorKey,
        debtorDisp,
        debtorHeirsRows,
        debtorHasHeirs,
        debtorHeirsWord,
        debtorHeirsEditOnly,
        debtorPartyPreserveAppealInline,
        rowIsGovEmp,
        rowIsRetired,
        rowIsEmployee,
        rowInitialWasEmployee,
        rowEmploymentToggleLabel,
        rowIsLegalEntity,
        rowDebtorSummonsProfile,
        rowIsDeceased,
        showDebtorNotificationPanel,
        rowShowUnservedMemoBadge,
        rowTaklifAssignmentBadge,
        rowForcedBringDecisionState,
        rowAbsenceNoticeBadge,
        rowMemoNoticeBadge,
        rowShowSummonsBadge,
        rowRegularTablighBadge,
        rowPublicationNoticeBadgeResolved,
        rowForcedAttendancePending,
        showDebtorOrdinalBadge: safeDebtorWorkspaceEntries.length > 1,
    };
}
