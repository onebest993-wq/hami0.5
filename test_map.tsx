import React from 'react';

const effectiveDebtors = [];
const activeTimelineEventsDebtorScoped = [];
const activeTimelineEvents = [];
const executeOnDebtorRef = {};
const checkCoercionAction = () => {};
const updateNotesPortal = null;
const isTestMode = false;
const executionData = {guarantor_followup: {executor_approved: true, guarantee_type: 'amount'}};
const specialRequestTemplateMenuOpen = false;

export default function DebtorBlock() {
return (
  <>
    {effectiveDebtors.map((raw, loopIdx) => {
      const debtorKey = raw.id;
      return (
        <div key={debtorKey}>
                                                        !multiDebtorMode &&
                                                effectiveDebtors.length > 2 &&
                                                !showExtraDebtors &&
                                                loopIdx >= 2
                                            ) {
                                                return null;
                                            }
                                            const wsDebt = multiDebtorMode;
                                            const d = wsDebt ? raw.d : raw;
                                            const idx = wsDebt ? (raw.fileDebtorIndex ?? 0) : loopIdx;
                                            const isPrimary = wsDebt ? raw.isPrimary : loopIdx === 0;
                                            /** يجب أن يطابق `toggleDebtorEmploymentStatus` و`debtorWorkspaceEntries[0].key` */
                                            const primaryDebtorStableKey = (() => {
                                                const primaryId = (
                                                    effectiveDebtors[0] as Debtor | undefined
                                                )?.id;
                                                return primaryId != null &&
                                                    String(primaryId).trim() !== ''
                                                    ? String(primaryId)
                                                    : 'primary_debtor';
                                            })();
                                            const debtorKey = wsDebt
                                                ? raw.key
                                                : isPrimary
                                                  ? primaryDebtorStableKey
                                                  : d.id != null && String(d.id) !== ''
                                                    ? String(d.id)
                                                    : `d-${idx}`;
                                            const debtorOpen = expandedDebtorById[debtorKey] ?? false;
                                            const salaryStored = isPrimary
                                                ? executionData?.employeeSalary
                                                : executionExtras.perDebtorSalaries?.[debtorKey];
                                            const garnishStored = isPrimary
                                                ? executionData?.garnishmentAmount
                                                : executionExtras.perDebtorGarnishments?.[debtorKey];
                                            const debtorDisp = getExecutionPartyDisplayName(
                                                d as unknown as Party,
                                                'debtor',
                                                wsDebt ? (isPrimary ? 0 : 1) : idx,
                                                executionData
                                            );
                                            const debtorHeirsRows = buildPartyHeirsRows(d as unknown as Party, 'debtor');
                                            const debtorHasHeirs = debtorHeirsRows.length > 0;
                                            const debtorHeirsWord =
                                                debtorHasHeirs
                                                    ? debtorHeirsRows.length > 1
                                                        ? 'ورثة'
                                                        : 'وريث'
                                                    : null;
                                            const debtorPartyPreserveAppealInline =
                                                debtorHasHeirs || debtorDisp.showDeceasedGlyph;
                                            /** استقلال إضبارة فرعية: صف المدين الحالي (تبويب ذمة مقسومة أو مدين إضافي متضامن) */
                                            const useRowScopedExecProfile =
                                                debtorBrowserTabsMode || (!isPrimary && wsDebt);
                                            const rowOccLower = String(
                                                (d as { occupation?: string }).occupation || ''
                                            ).toLowerCase();
                                            const rowIsGovEmp =
                                                rowOccLower.includes('موظف') ||
                                                rowOccLower.includes('حكومي') ||
                                                rowOccLower === 'موظف';
                                            const rowIsRetired =
                                                rowOccLower.includes('متقاعد') ||
                                                rowOccLower.includes('تقاعد');
                                            const rowIsEmployee = (() => {
                                                if (!executionData) {
                                                    return isDebtorRowEmployee(
                                                        effectiveDebtors[0] as Debtor | undefined
                                                    );
                                                }
                                                if (isPrimary) {
                                                    return isDebtorRowEmployee(
                                                        (executionData.debtors?.[0] as Debtor | undefined) ??
                                                            (d as Debtor)
                                                    );
                                                }
                                                const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                                                    (a) => String(a.id) === debtorKey
                                                );
                                                if (ad) return ad.isEmployee !== false;
                                                return isDebtorRowEmployee(d as Debtor);
                                            })();
                                            const rowInitialWasEmployee = (() => {
                                                if (!executionData) return undefined;
                                                if (isPrimary) {
                                                    const p = executionData.debtors?.[0] as Debtor | undefined;
                                                    return typeof p?.employmentInitialWasEmployee === 'boolean'
                                                        ? p.employmentInitialWasEmployee
                                                        : undefined;
                                                }
                                                const adInit =
                                                    executionData.party_multiplicity?.additionalDebtors?.find(
                                                        (a) => String(a.id) === debtorKey
                                                    );
                                                return adInit &&
                                                    typeof adInit.employmentInitialWasEmployee === 'boolean'
                                                    ? adInit.employmentInitialWasEmployee
                                                    : undefined;
                                            })();
                                            const rowEmploymentToggleLabel = debtorEmploymentToggleMenuLabel(
                                                rowIsEmployee,
                                                rowInitialWasEmployee
                                            );
                                            const rowIsGovEmpEffective = useRowScopedExecProfile
                                                ? rowIsGovEmp
                                                : isDebtorGovernmentEmployee;
                                            const rowDebtorSummonsProfile = useRowScopedExecProfile
                                                ? getDebtorSummonsProfile({
                                                      isGovernmentEmployee: rowIsGovEmp || rowIsRetired,
                                                      parsedDebtAmount: principalDebtAmount,
                                                      parsedLawyerFees,
                                                      claimType: claimType || '',
                                                      isNonFinancialClaim,
                                                  })
                                                : debtorSummonsProfile;
                                            const rowShowSalaryCaptureForEmployee = useRowScopedExecProfile
                                                ? shouldShowEmployeeSalaryCapture({
                                                      profile: rowDebtorSummonsProfile,
                                                      claimType: claimType || '',
                                                      parsedLawyerFees,
                                                  })
                                                : showSalaryCaptureForEmployee;
                                            const rowIsDeceased = Boolean(
                                                (d as { isDeceased?: boolean })?.isDeceased ||
                                                    (isPrimary && executionData?.is_debtor_deceased)
                                            );
                                            const showDebtorNotificationPanel =
                                                (isPrimary || debtorBrowserTabsMode) && !rowIsDeceased;
                                            const rowPublicationNoticeBadge: PublicationNoticeBadgeInfo | null =
                                                (() => {
                                                    if (rowIsDeceased) return null;
                                                    const st = getPublicationNoticeForDebtorKey(
                                                        executionData,
                                                        debtorKey
                                                    );
                                                    if (!st?.publicationDateYmd) return null;
                                                    const deadlineYmd = publicationNoticeDeadlineYmd(
                                                        st.publicationDateYmd
                                                    );
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
                                            const rowTaklifAssignmentBadge: TaklifAssignmentBadgeInfo | null =
                                                (() => {
                                                    if (rowIsDeceased || !executionData) return null;
                                                    const ta = getEmployeeAssignmentForDebtorKey(
                                                        executionData,
                                                        debtorKey,
                                                        primaryDebtorKeyResolved
                                                    );
                                                    if (!ta || ta.phase === 'none') return null;
                                                    const dlYmd =
                                                        ta.notifyDate != null && ta.notifyDate !== ''
                                                            ? computeTaklifDeadlineYmd(
                                                                  ta.notifyDate,
                                                                  ta.durationDays ?? 1
                                                              )
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
                                                        phase: ta.phase,
                                                        remainingDays,
                                                        cycleGeneration: ta.taklifCycleGeneration,
                                                        confirmedAt: ta.confirmedAt,
                                                        badgeHiddenAt: ta.badgeHiddenAt,
                                                        periodEndedAt: ta.periodEndedAt,
                                                        durationDays: ta.durationDays ?? 1,
                                                    };
                                                })();
                                            const rowForcedBringDecisionState =
                                                getPersonalCoerciveSubtypeOutcome(
                                                    executionData?.id ?? executionId,
                                                    'forced_bring_in',
                                                    {
                                                        debtorKey: String(debtorKey),
                                                        primaryDebtorKey: primaryDebtorKeyResolved,
                                                    }
                                                );
                                            let rowMemoNoticeBadge =
                                                isPrimary && !rowIsDeceased
                                                    ? primaryMemoNoticeBadge
                                                    : null;
                                            const rowAbsenceNoticeBadge =
                                                isPrimary && !rowIsDeceased
                                                    ? primaryDebtorAbsenceBadge
                                                    : null;
                                            let rowShowSummonsBadge =
                                                !rowIsDeceased &&
                                                Boolean(
                                                    getDebtorSummonsMarkerForKey(
                                                        executionData,
                                                        debtorKey,
                                                        primaryDebtorKeyResolved
                                                    )
                                                );
                                            let rowRegularTablighBadge =
                                                !rowIsDeceased && executionData
                                                    ? (() => {
                                                          const m = getDebtorSummonsMarkerForKey(
                                                              executionData,
                                                              debtorKey,
                                                              primaryDebtorKeyResolved
                                                          );
                                                          if (!m?.date) return null;
                                                          return {
                                                              noticeDateYmd: String(m.date),
                                                              purpose: String(m.purpose || 'تبليغ'),
                                                              recordedAt: (m as { recordedAt?: string })
                                                                  .recordedAt,
                                                              badgeHiddenAt: (m as { badgeHiddenAt?: string })
                                                                  .badgeHiddenAt,
                                                              periodEndedAt: (m as { periodEndedAt?: string })
                                                                  .periodEndedAt,
                                                          };
                                                      })()
                                                    : null;
                                            let rowPublicationNoticeBadgeResolved =
                                                rowIsDeceased ? null : rowPublicationNoticeBadge;
                                            if (rowTaklifAssignmentBadge) {
                                                rowMemoNoticeBadge = null;
                                                rowPublicationNoticeBadgeResolved = null;
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowPublicationNoticeBadgeResolved) {
                                                rowMemoNoticeBadge = null;
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowMemoNoticeBadge) {
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowRegularTablighBadge) {
                                                rowShowSummonsBadge = true;
                                            }
                                            const rowForcedAttendancePending = rowIsEmployee
                                                ? (() => {
                                                      const ra = executionData
                                                          ? getEmployeeAssignmentForDebtorKey(
                                                                executionData,
                                                                debtorKey,
                                                                primaryDebtorKeyResolved
                                                            )
                                                          : null;
                                                      const warrantOk =
                                                          ra?.phase === 'warrant_ui' &&
                                                          ra?.arrestOrderRecorded;
                                                      if (!warrantOk) return false;
                                                      if (rowForcedBringDecisionState.pending) return true;
                                                      if (!isPrimary) return false;
                                                      return (
                                                          rowForcedBringDecisionState.approved &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'brought' &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'absconded'
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
                                                      const forcedIndicator = isPrimary
                                                          ? forcedAttendanceIssued ||
                                                            activeNoticeState === 'forced_attendance' ||
                                                            Boolean(executionData?.forcedAttendanceIssued)
                                                          : false;
                                                      if (forcedIndicator) return true;
                                                      if (rowForcedBringDecisionState.pending) return true;
                                                      if (!isPrimary) return false;
                                                      return (
                                                          rowForcedBringDecisionState.approved &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'brought' &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'absconded'
                                                      );
                                                  })();
                                            return (
                                            <div key={debtorKey} className="mt-2 w-full flex flex-col gap-6" dir="rtl">
                                            <div
                                                className="relative w-full min-h-[56px] px-3 pb-2.5 pt-2 text-right backdrop-blur-2xl transition-all rounded-2xl border border-rose-500/25 bg-[#0B1120]/35 shadow-[0_14px_46px_rgba(0,0,0,0.45)] ring-1 ring-rose-500/10 hover:ring-rose-500/20"
                                                style={{
                                                    backgroundImage:
                                                        'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0) 100%),' +
                                                        'repeating-linear-gradient(45deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 16px),' +
                                                        'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 16px)',
                                                    backgroundBlendMode: 'overlay',
                                                }}
                                            >
                                                    {!debtorOpen ? (
                                                        <button
                                                            type="button"
                                                            className="absolute inset-0 z-0 rounded-2xl"
                                                            aria-label="Expand debtor"
                                                            onClick={() => toggleDebtorExpanded(debtorKey)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    toggleDebtorExpanded(debtorKey);
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className="relative z-10">
                                                    <span className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap rounded-full border border-rose-400/35 bg-[#0B1120]/80 px-3 py-1 text-[11px] font-extrabold leading-none text-rose-300 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                                                        المدين
                                                        {multiDebtorMode ? (
                                                            <span className="mr-1 inline text-[9px] font-semibold text-rose-300/85">
                                                                ·فرعية
                                                            </span>
                                                        ) : effectiveDebtors.length > 1 ? (
                                                            <span className="ms-0.5 inline tabular-nums text-[10px] font-bold text-rose-300/90">
                                                                {idx + 1}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                    <div
                                                        className="flex w-full items-center justify-between gap-2"
                                                        dir="rtl"
                                                    >
                                                        {isPrimary && (
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                className="flex min-w-0 flex-1 cursor-pointer flex-col items-stretch gap-0.5 text-right"
                                                                onClick={() => toggleDebtorExpanded(debtorKey)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        toggleDebtorExpanded(debtorKey);
                                                                    }
                                                                }}
                                                            >
                                                                <div
                                                                    className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                                        dir="rtl"
                                                                    >
                                                                        {debtorHeirsWord ? (
                                                                            <span
                                                                                className="shrink-0 text-amber-500 text-xl font-bold cursor-pointer hover:underline"
                                                                                role="button"
                                                                                tabIndex={0}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    openHeirsQuickView(d as unknown as Party, 'debtor', 'ورثة المدين');
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        openHeirsQuickView(d as unknown as Party, 'debtor', 'ورثة المدين');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {debtorHeirsWord}
                                                                            </span>
                                                                        ) : null}
                                                                        <span className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white py-2 block">
                                                                            {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                                                                            {(debtorHasHeirs
                                                                                ? heirsDetailsIncludeClient(
                                                                                      (d as unknown as Party).heirs_details
                                                                                  )
                                                                                : d.isClient) &&
                                                                            !debtorDisp.showDeceasedGlyph ? (
                                                                                <span
                                                                                    className="ms-1 inline-block text-[#E6C673] text-[14px] leading-none select-none"
                                                                                    title="موكلي"
                                                                                    aria-label="موكلي"
                                                                                >
                                                                                    ★
                                                                                </span>
                                                                            ) : null}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="mt-1 flex flex-row flex-wrap items-center justify-start gap-1"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                    role="presentation"
                                                                    dir="rtl"
                                                                >
                                                                    {debtorDisp.showDeceasedGlyph && !debtorHeirsWord ? (
                                                                        <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                            متوفى
                                                                        </span>
                                                                    ) : null}
                                                                    {debtorPartyPreserveAppealInline &&
                                                                    executionAppealBanner.show ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDecisionsModalBootHubTab('appeals');
                                                                                setShowDecisionsModal(true);
                                                                            }}
                                                                            className="shrink-0 whitespace-nowrap inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                                                                            title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                                                                        >
                                                                            {executionAppealBanner.label}
                                                                        </button>
                                                                    ) : null}
                                                                    {showDebtorNotificationPanel &&
                                                                    isPrimary &&
                                                                    showDebtorUnservedMemoBadge ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSummonsMarkerPopoverOpen(false);
                                                                                setExecutionMemoBadgePopoverOpen(true);
                                                                            }}
                                                                            className="shrink-0 whitespace-nowrap rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                                                                            title="لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ"
                                                                        >
                                                                            غير مبلّغ
                                                                        </button>
                                                                    ) : null}
                                                                    {null}
                                                                </div>
                                                                {(() => {
                                                                    const hasSeizureBadges =
                                                                        (seizedAssets?.length || 0) > 0 ||
                                                                        (realEstateSeizureAssets?.length || 0) > 0 ||
                                                                        (thirdPartySeizureAssets?.length || 0) > 0 ||
                                                                        (standaloneExecutionMarks?.length || 0) > 0;
                                                                    const showInteractive = Boolean(isPrimary || debtorBrowserTabsMode);
                                                                    if (!hasSeizureBadges && !showInteractive) return null;
                                                                    return (
                                                                        <div
                                                                            className="flex flex-col"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onKeyDown={(e) => e.stopPropagation()}
                                                                            role="presentation"
                                                                        >
                                                                            {hasSeizureBadges ? (
                                                                                <DebtorSeizureCategoryBadges
                                                                                    seizedAssets={seizedAssets}
                                                                                    realEstateSeizureAssets={realEstateSeizureAssets}
                                                                                    thirdPartySeizureAssets={thirdPartySeizureAssets}
                                                                                    standaloneExecutionMarks={standaloneExecutionMarks}
                                                                                />
                                                                            ) : null}

                                                                            {showInteractive ? (
                                                                                <div className="mt-2 flex flex-row-reverse flex-wrap items-center justify-start gap-1">
                                                                                    <ExecutionPartyInteractiveBadges
                                                                                        executionId={partyBadgesExecutionId}
                                                                                        party="debtor"
                                                                                        isPrimaryDebtor={isPrimary}
                                                                                        executionData={viewExecutionData}
                                                                                        activeCoerciveActions={activeCoerciveActions}
                                                                                        seizedAssets={seizedAssets}
                                                                                        realEstateSeizureAssets={realEstateSeizureAssets}
                                                                                        thirdPartySeizureAssets={thirdPartySeizureAssets}
                                                                                        standaloneExecutionMarks={standaloneExecutionMarks}
                                                                                        timelineEvents={
                                                                                            debtorBrowserTabsMode
                                                                                                ? activeTimelineEventsDebtorScoped
                                                                                                : activeTimelineEvents
                                                                                        }
                                                                                        hasGuarantor={Boolean(
                                                                                            smHasGuarantorFile ||
                                                                                                (effectiveDebtors[0] as Debtor | undefined)
                                                                                                    ?.hasGuarantor ||
                                                                                                (typeof smExecutionTarget === 'string' &&
                                                                                                    smExecutionTarget.includes('كفيل')) ||
                                                                                                executionData?.guarantor_followup
                                                                                                    ?.executor_approved
                                                                                        )}
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
                                                                                            isPrimary && evictionGraceBadgeInfo
                                                                                                ? () => {
                                                                                                      setEvictionGraceDecisionId(null);
                                                                                                      openEvictionResidentialGraceModal();
                                                                                                  }
                                                                                                : undefined
                                                                                        }
                                                                                        onCompleteEvictionGrace={
                                                                                            isPrimary && evictionGraceBadgeInfo
                                                                                                ? completeEvictionResidentialGrace
                                                                                                : undefined
                                                                                        }
                                                                                        policeAssistanceBadge={
                                                                                            isPrimary
                                                                                                ? policeAssistanceBadgeInfo
                                                                                                : null
                                                                                        }
                                                                                        onPoliceAssistanceActivate={
                                                                                            isPrimary && policeAssistanceBadgeInfo
                                                                                                ? openPoliceAssistanceFromBadge
                                                                                                : undefined
                                                                                        }
                                                                                        onCompletePoliceAssistance={
                                                                                            isPrimary && policeAssistanceBadgeInfo
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
                                                                                            setSummonsContextDebtorKey(String(debtorKey));
                                                                                            setSummonsHubInitialMainTab('nashr');
                                                                                            setShowUnifiedSummonsModal(true);
                                                                                        }}
                                                                                        absenceBadge={rowAbsenceNoticeBadge}
                                                                                        onDismissAbsence={
                                                                                            rowAbsenceNoticeBadge
                                                                                                ? dismissDebtorAbsenceBadge
                                                                                                : undefined
                                                                                        }
                                                                                        showSummonsBadge={rowShowSummonsBadge}
                                                                                        onSummonsActivate={() => {
                                                                                            setSummonsContextDebtorKey(String(debtorKey));
                                                                                            setSummonsHubInitialMainTab('tabligh');
                                                                                            setShowUnifiedSummonsModal(true);
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
                                                                                        onPersistGuarantorFollowup={persistGuarantorFollowupDetails}
                                                                                        personalCoerciveDecisionBadges={!rowIsEmployee}
                                                                                        activeDebtorKey={String(debtorKey)}
                                                                                        primaryDebtorKey={primaryDebtorKeyResolved}
                                                                                        forcedAttendancePending={rowForcedAttendancePending}
                                                                                        taklifAssignmentBadge={rowTaklifAssignmentBadge}
                                                                                        onTaklifAssignmentActivate={
                                                                                            rowTaklifAssignmentBadge
                                                                                                ? () => {
                                                                                                      const tb = rowTaklifAssignmentBadge;
                                                                                                      const ts = new Date().toISOString();
                                                                                                      const remLine =
                                                                                                          tb.remainingDays === null
                                                                                                              ? '—'
                                                                                                              : tb.remainingDays === 0
                                                                                                                ? 'انتهت المدة'
                                                                                                                : `${tb.remainingDays} يوماً`;
                                                                                                      pushTimelineEvent({
                                                                                                          id: nextTimelineId(),
                                                                                                          date: ts.slice(0, 10),
                                                                                                          timestamp: ts,
                                                                                                          title: 'عرض تفاصيل التكليف بالحضور (من بطاقة المدين)',
                                                                                                          description: `الغاية: ${tb.purpose}\nتاريخ التكليف: ${tb.notifyDateYmd}\nآخر أجل: ${tb.deadlineYmd || '—'}\nالمتبقي: ${remLine}`,
                                                                                                          type: 'summons',
                                                                                                          source: 'التبليغ',
                                                                                                          metadata: {
                                                                                                              ...timelineDebtorMetadata(debtorKey),
                                                                                                              timelineThreadKey: `taklif_badge_snapshot:${debtorKey}`,
                                                                                                          },
                                                                                                      });
                                                                                                      setSummonsContextDebtorKey(String(debtorKey));
                                                                                                      setSummonsHubInitialMainTab('taklif');
                                                                                                      setShowUnifiedSummonsModal(true);
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
                                                                                </div>
                                                                            ) : null}
                                                                            {null}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                        {!isPrimary && (
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                className="min-w-0 flex-1 cursor-pointer text-right"
                                                                onClick={() => toggleDebtorExpanded(debtorKey)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        toggleDebtorExpanded(debtorKey);
                                                                    }
                                                                }}
                                                            >
                                                                <div
                                                                    className="flex w-full min-w-0 flex-col items-stretch gap-1"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                        dir="rtl"
                                                                    >
                                                                        <div
                                                                            className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                                            dir="rtl"
                                                                        >
                                                                            {debtorHeirsWord ? (
                                                                                <span
                                                                                    className="shrink-0 text-amber-500 text-xl font-bold cursor-pointer hover:underline"
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        openHeirsQuickView(d as unknown as Party, 'debtor', 'ورثة المدين');
                                                                                    }}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            openHeirsQuickView(d as unknown as Party, 'debtor', 'ورثة المدين');
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {debtorHeirsWord}
                                                                                </span>
                                                                            ) : null}
                                                                            <span
                                                                                className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white"
                                                                                style={
                                                                                    isPrimary && idx === 0
                                                                                        ? {
                                                                                              paddingTop: 10,
                                                                                              paddingBottom: 10,
                                                                                              display: 'block',
                                                                                          }
                                                                                        : undefined
                                                                                }
                                                                            >
                                                                                {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                                                                                {(debtorHasHeirs
                                                                                    ? heirsDetailsIncludeClient(
                                                                                          (d as unknown as Party).heirs_details
                                                                                      )
                                                                                    : d.isClient) &&
                                                                                !debtorDisp.showDeceasedGlyph ? (
                                                                                    <span
                                                                                        className="ms-1 inline-block text-[#E6C673] text-[14px] leading-none select-none"
                                                                                        title="موكلي"
                                                                                        aria-label="موكلي"
                                                                                    >
                                                                                        ★
                                                                                    </span>
                                                                                ) : null}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div
                                                                        className="mt-1 flex flex-row flex-wrap items-center justify-start gap-1"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onKeyDown={(e) => e.stopPropagation()}
                                                                        role="presentation"
                                                                        dir="rtl"
                                                                    >
                                                                        {debtorDisp.showDeceasedGlyph && !debtorHeirsWord ? (
                                                                            <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                                متوفى
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>

                                                {debtorOpen && (
                                                    <div
                                                        className="rounded-b-xl border-t border-rose-500/10 px-0 pb-1 pt-2 space-y-1.5 overflow-hidden text-right"
                                                        dir="rtl"
                                                    >
                                                        <div className="mb-2 flex items-center justify-end px-0">
                                                            <ExecutionPartySpecialActionsMenu
                                                                variant="debtor"
                                                                debtorDeathEntryLabel={debtorDeathMenuLabel}
                                                                onReportDebtorDeath={handleDebtorDeathMenuAction}
                                                                debtorIsEmployee={rowIsEmployee}
                                                                debtorEmploymentToggleLabel={rowEmploymentToggleLabel}
                                                                onToggleDebtorEmployment={() =>
                                                                    handleDebtorEmploymentToggle({
                                                                        debtorKey,
                                                                        isPrimary,
                                                                    })
                                                                }
                                                                debtorEmploymentToggleToKasabDisabled={false}
																hideDebtorEmploymentToggle={Boolean(
																(d as unknown as Debtor)?.isDeceased ||
																	(isPrimary && executionData?.is_debtor_deceased)
															)}
                                                                isHistoricalMode={isHistoricalMode}
                                                            />
                                                        </div>
                                                        {debtorDisp.heirSubstituteLines &&
                                                        debtorDisp.heirSubstituteLines.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openHeirsNotificationCenter()}
                                                            className="mb-2 w-full rounded-xl border border-cyan-400/45 bg-gradient-to-r from-cyan-900/35 to-blue-900/35 px-3 py-2 text-[10px] font-black text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:from-cyan-800/40 hover:to-blue-800/40"
                                                        >
                                                            فتح مركز تبليغ الورثة
                                                        </button>
                                                    ) : null}
                                                    {showDebtorNotificationPanel && (
                                                        <div className="mb-1 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-cyan-950/25 p-2.5 shadow-inner shadow-black/20">
                                                            <div className="mb-1.5 flex flex-row-reverse flex-wrap items-center justify-between gap-2">
                                                                <span className="text-[11px] font-bold text-cyan-100/95">
                                                                    التبليغ والإخبار
                                                                </span>
                                                            </div>
                                                            {null}
                                                            <button
                                                                type="button"
                                                                disabled={executionToolsTimelineLockedUi}
                                                                onClick={() => {
                                                                    if (
                                                                        activeDebtorIsDeceased &&
                                                                        activeDebtorHeirsForNotification.length > 0
                                                                    ) {
                                                                        openHeirsNotificationCenter();
                                                                        return;
                                                                    }
                                                                    setSummonsContextDebtorKey(null);
                                                                    setSummonsHubInitialMainTab(null);
                                                                    setShowUnifiedSummonsModal(true);
                                                                }}
                                                                className={`w-full flex flex-row-reverse items-center justify-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 transition-all ${
                                                                    executionToolsTimelineLockedUi
                                                                        ? 'opacity-40 cursor-not-allowed'
                                                                        : 'hover:bg-cyan-900/50 hover:border-cyan-400/45'
                                                                }`}
                                                            >
                                                                <Bell size={16} className="text-cyan-300 shrink-0" />
                                                                {activeDebtorIsDeceased &&
                                                                activeDebtorHeirsForNotification.length > 0
                                                                    ? 'فتح مركز تبليغ الورثة'
                                                                    : 'فتح مركز التبليغ والتكليف'}
															</button>
													</div>
											)}
                                                    <div className="flex flex-col gap-2">
                                                        {(isPrimary || d.occupation || multiDebtorMode) || d.phone ? (
                                                            <div
                                                                className={
                                                                    (isPrimary || d.occupation || multiDebtorMode) &&
                                                                    d.phone
                                                                        ? 'grid grid-cols-2 gap-2'
                                                                        : 'grid grid-cols-1 gap-2'
                                                                }
                                                            >
                                                                {(isPrimary || d.occupation || multiDebtorMode) ? (
                                                                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                        <p className="mb-0.5 text-[10px] text-gray-400">
                                                                            الوظيفة
                                                                        </p>
                                                                        <p className="text-xs font-medium text-slate-200 break-words">
                                                                            {rowIsEmployee ? 'موظف' : 'كاسب'}
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                                {d.phone ? (
                                                                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                            <span>الهاتف</span>
                                                                            <Phone
                                                                                size={12}
                                                                                className="shrink-0 text-rose-400"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs font-medium text-white [unicode-bidi:plaintext] break-all">
                                                                            {d.phone}
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                        {d.address ? (
                                                            <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                    <span>العنوان (للتبليغ)</span>
                                                                    <MapPin
                                                                        size={12}
                                                                        className="shrink-0 text-rose-400"
                                                                    />
                                                                </div>
                                                                <p className="text-xs leading-snug text-white break-words [unicode-bidi:plaintext]">
                                                                    {d.address}
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-1.5 flex justify-end border-t border-rose-500/10 pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (
                                                                    multiDebtorMode &&
                                                                    raw.fileDebtorIndex === null
                                                                ) {
                                                                    showToast(
                                                                        'تعديل المدين الإضافي من بيانات إنشاء الإضبارة.',
                                                                        'info'
                                                                    );
                                                                    return;
                                                                }
                                                                openEditParty('debtor', idx);
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
                                                        >
                                                            <Pencil size={12} />
                                                            تعديل الاسم والهاتف والعنوان
                                                        </button>
                                                    </div>

                                                    {rowIsEmployee &&
                                                        !isEvictionExecutionModule &&
                                                        rowIsGovEmpEffective &&
                                                        rowShowSalaryCaptureForEmployee && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {salaryStored ? (
                                                                    <span className="text-emerald-300 text-sm font-mono font-bold">
                                                                        {parseFloat(String(salaryStored)).toLocaleString('ar-IQ')} دينار
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const salary = prompt('أدخل صافي الراتب الشهري بالدينار:');
                                                                            if (!salary || isNaN(parseFloat(salary))) return;
                                                                            const parsedSalary = parseFloat(salary);
                                                                            const garnishment = parsedSalary / 5;
                                                                            const persistId =
                                                                                executionId != null && String(executionId).trim() !== ''
                                                                                    ? String(executionId).trim()
                                                                                    : String(executionData?.id ?? '').trim();
                                                                            if (!persistId || persistId === 'undefined') {
                                                                                showToast('⚠️ تعذر حفظ الراتب', 'warning');
                                                                                return;
                                                                            }
                                                                            const lsKey = executionStorageKey(persistId);
                                                                            const stored = storageCache.get(lsKey);
                                                                            let execution: Record<string, unknown>;
                                                                            if (stored) {
                                                                                execution = typeof stored === 'object' ? { ...(stored as object) } : { ...(executionData as object) };
                                                                            } else {
                                                                                execution = { ...(executionData as object) };
                                                                            }
                                                                            if (isPrimary) {
                                                                                execution.employeeSalary = parsedSalary;
                                                                                execution.garnishmentAmount = garnishment;
                                                                            } else {
                                                                                const prevSal =
                                                                                    execution.perDebtorSalaries != null &&
                                                                                    typeof execution.perDebtorSalaries ===
                                                                                        'object' &&
                                                                                    !Array.isArray(
                                                                                        execution.perDebtorSalaries
                                                                                    )
                                                                                        ? {
                                                                                              ...(execution.perDebtorSalaries as Record<
                                                                                                  string,
                                                                                                  string
                                                                                              >),
                                                                                          }
                                                                                        : {};
                                                                                const prevGar =
                                                                                    execution.perDebtorGarnishments !=
                                                                                        null &&
                                                                                    typeof execution.perDebtorGarnishments ===
                                                                                        'object' &&
                                                                                    !Array.isArray(
                                                                                        execution.perDebtorGarnishments
                                                                                    )
                                                                                        ? {
                                                                                              ...(execution.perDebtorGarnishments as Record<
                                                                                                  string,
                                                                                                  string
                                                                                              >),
                                                                                          }
                                                                                        : {};
                                                                                execution.perDebtorSalaries = {
                                                                                    ...prevSal,
                                                                                    [debtorKey]: String(parsedSalary),
                                                                                };
                                                                                execution.perDebtorGarnishments = {
                                                                                    ...prevGar,
                                                                                    [debtorKey]: String(garnishment),
                                                                                };
                                                                            }
                                                                            storageCache.set(lsKey, execution);
                                                                            const salaryEvent = {
                                                                                id: Date.now().toString(),
                                                                                date: new Date().toISOString(),
                                                                                title: '💼 تسجيل راتب الموظف المدين',
                                                                                description: `${d.name || 'مدين'} — صافي الراتب: ${parsedSalary.toLocaleString('ar-IQ')} دينار. مقدار الحجز الشهري (1/5): ${garnishment.toLocaleString('ar-IQ')} دينار.`,
                                                                                type: 'payment'
                                                                            };
                                                                            setTimelineEvents(prev => [salaryEvent, ...prev]);
                                                                            showToast('✅ تم تسجيل راتب الموظف وحساب مقدار الحجز', 'success');
                                                                            setExecutionStorageTick((n) => n + 1);
                                                                        }}
                                                                        className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                                    >
                                                                        <DollarSign size={12} />
                                                                        ➕ إدخال مقدار الراتب كتابةً
                                                                    </button>
                                                                )}
                                                                <div className="flex items-center gap-1">
                                                                    <Wallet size={14} className="text-amber-400" />
                                                                    <span className="text-gray-400 text-xs">مقدار الراتب الصافي</span>
                                                                </div>
                                                            </div>
                                                            {garnishStored != null && String(garnishStored) !== '' && (
                                                                <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-2">
                                                                    <p className="text-amber-300 text-[10px] font-bold text-right mb-1">
                                                                        💼 مقدار الحجز الشهري (1/5):
                                                                    </p>
                                                                    <p className="text-amber-400 text-sm font-mono font-black text-right">
                                                                        {parseFloat(String(garnishStored)).toLocaleString('ar-IQ')} دينار
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {salaryStored && (
                                                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2 text-right">
                                                            <p className="text-[10px] text-emerald-300/90">مقدار الراتب/الدخل المسجل</p>
                                                            <p className="text-sm font-black font-mono text-emerald-200">
                                                                {parseFloat(String(salaryStored)).toLocaleString('ar-IQ')} دينار
                                                            </p>
                                                        </div>
                                                    )}

                                                    {!d.phone && !d.address && (
                                                        <p className="text-gray-500 text-xs text-center py-2">لا توجد بيانات اتصال</p>
                                                    )}
                                                        </div>
                                                    )}

                                                    {typeof document !== 'undefined' &&
                                                        isPrimary &&
                                                        executionMemoBadgePopoverOpen &&
                                                        (primaryMemoNoticeBadge || showDebtorUnservedMemoBadge) &&
                                                        createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
                                                                onClick={() =>
                                                                    setExecutionMemoBadgePopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="execution-memo-badge-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-2xl text-right max-h-[min(85vh,22rem)] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="إغلاق"
                                                                            onClick={() =>
                                                                                setExecutionMemoBadgePopoverOpen(
                                                                                    false
                                                                                )
                                                                            }
                                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <h2
                                                                            id="execution-memo-badge-detail-title"
                                                                            className="text-xs font-bold text-[#E6C673] flex items-center gap-2 flex-row-reverse"
                                                                        >
                                                                            <Calendar
                                                                                size={14}
                                                                                className="text-[#E6C673]/90 shrink-0"
                                                                            />
                                                                            {primaryMemoNoticeBadge
                                                                                ? 'تم تبليغ المدين بالمذكرة'
                                                                                : 'مذكرة الإخبار بالتنفيذ'}
                                                                        </h2>
                                                                    </div>
                                                                    <div className="space-y-2 overflow-y-auto px-3 py-3 text-right flex-1 min-h-0">
                                                                        {primaryMemoNoticeBadge ? (
                                                                            <>
                                                                                <div>
                                                                                    <p className="text-[9px] text-slate-500 mb-0.5">
                                                                                        تاريخ المذكرة (مرجع المهلة)
                                                                                    </p>
                                                                                    <p className="text-xs text-white font-mono tabular-nums">
                                                                                        {primaryMemoNoticeBadge.anchor}
                                                                                    </p>
                                                                                </div>
                                                                                <p
                                                                                    className={`text-[10px] font-semibold tabular-nums leading-relaxed ${
                                                                                        primaryMemoNoticeBadge.graceExpired
                                                                                            ? 'text-amber-200/95'
                                                                                            : 'text-emerald-300/95'
                                                                                    }`}
                                                                                >
                                                                                    باقي {primaryMemoNoticeBadge.remaining}{' '}
                                                                                    يوماً ضمن المهلة التقويمية.
                                                                                    {primaryMemoNoticeBadge.graceExpired && (
                                                                                        <span className="block mt-1.5 text-amber-200/85 text-[9px]">
                                                                                            يمكنك تسجيل «تم انتهاء المدة» أو «حضور
                                                                                            المدين» من نافذة التبليغ.
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <p className="text-[11px] font-bold text-amber-100">
                                                                                    لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ
                                                                                </p>
                                                                                <p className="text-[10px] leading-relaxed text-slate-300">
                                                                                    هذه الإشارة مرتبطة بمرحلة مذكرة الإخبار فقط،
                                                                                    وتختفي نهائياً عند: تسجيل تبليغ المذكرة، أو
                                                                                    حضور المدين دون تبليغ، أو إنهاء مدة المذكرة.
                                                                                </p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setExecutionMemoBadgePopoverOpen(false);
                                                                                        setSummonsContextDebtorKey(null);
                                                                                        setSummonsHubInitialMainTab('tabligh');
                                                                                        setShowUnifiedSummonsModal(true);
                                                                                    }}
                                                                                    className="w-full rounded-xl border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 hover:bg-cyan-900/50 hover:border-cyan-400/45"
                                                                                >
                                                                                    فتح مركز التبليغ والتكليف
                                                                                </button>
                                                                            </>
                                                                        )}
												</div>
										</div>
									</div>,
								document.body
							)}

                                                    {typeof document !== 'undefined' &&
                                                        isPrimary &&
                                                        showDebtorSummonsAttendanceBadge &&
                                                        summonsMarkerPopoverOpen &&
                                                        debtorSummonsMarkerLocal?.id &&
                                                        createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
                                                                onClick={() =>
                                                                    setSummonsMarkerPopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="summons-marker-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-2xl text-right max-h-[85vh] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="إغلاق"
                                                                            onClick={() =>
                                                                                setSummonsMarkerPopoverOpen(false)
                                                                            }
                                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <h2
                                                                            id="summons-marker-detail-title"
                                                                            className="text-xs font-bold text-[#E6C673] flex items-center gap-2 flex-row-reverse"
                                                                        >
                                                                            <Bell
                                                                                size={14}
                                                                                className="text-[#E6C673]/90 shrink-0"
                                                                            />
                                                                            تطلب حضوره
                                                                        </h2>
                                                                    </div>
                                                                    <div className="space-y-3 overflow-y-auto px-3 py-3 flex-1 min-h-0">
                                                                        <div>
                                                                            <p className="text-[9px] text-slate-500 mb-0.5">
                                                                                تاريخ التبليغ
                                                                            </p>
                                                                            <p className="text-xs text-white font-mono tabular-nums">
                                                                                {debtorSummonsMarkerLocal?.date ||
                                                                                    '—'}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <label
                                                                                htmlFor="summons-purpose-floating"
                                                                                className="block text-[9px] text-slate-500 mb-1"
                                                                            >
                                                                                الغاية من التبليغ أو الحضور
                                                                            </label>
                                                                            <textarea
                                                                                id="summons-purpose-floating"
                                                                                value={summonsPurposeDraft}
                                                                                onChange={(e) =>
                                                                                    setSummonsPurposeDraft(
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                rows={3}
                                                                                className="w-full rounded-lg bg-white/[0.06] border border-[#E6C673]/20 px-2.5 py-2 text-white text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-[#E6C673]/40 min-h-[4.5rem]"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col gap-2 shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={
                                                                                    saveSummonsMarkerPurposeEdit
                                                                                }
                                                                                className="rounded-lg bg-emerald-600/85 py-2 text-[11px] font-bold text-white shadow-md shadow-emerald-950/20"
                                                                            >
                                                                                حفظ التعديل
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSummonsMarkerPopoverOpen(
                                                                                        false
                                                                                    );
                                                                                    clearDebtorSummonsMarker();
                                                                                }}
                                                                                className="rounded-lg border border-rose-500/45 bg-rose-950/45 py-2 text-[11px] font-bold text-rose-200"
                                                                            >
                                                                                إخفاء من الإشارة
																		</button>
																		</div>
																	</div>
																</div>
														</div>,
														document.body
												)}
											</div>
										</div>
                                        {isPrimary && executionData?.guarantor_followup?.executor_approved ? (
                                            <div className="w-full" dir="rtl">
                                                <div className="relative rounded-2xl border border-white/10 bg-[#0A0F1C]/55 px-3 py-3">
                                                    {guarantorMenuOpen ? (
                                                        <div
                                                            className="fixed inset-0 z-[9998]"
                                                            role="presentation"
                                                            onClick={() => setGuarantorMenuOpen(false)}
                                                        />
                                                    ) : null}
                                                    {guarantorSeizureOpen ? (
                                                        <div
                                                            className="fixed inset-0 z-[9998]"
                                                            role="presentation"
                                                            onClick={() => setGuarantorSeizureOpen(false)}
                                                        />
                                                    ) : null}

                                                    <div className="flex items-start justify-between gap-2 flex-row-reverse">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-row-reverse">
                                                                <p className="text-sm font-black text-white">
                                                                    الكفيل الضامن
                                                                </p>
                                                                <span
                                                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                                                        executionData.guarantor_followup?.guarantee_type ===
                                                                        'attendance'
                                                                            ? 'bg-orange-500/20 text-orange-400'
                                                                            : 'bg-emerald-500/20 text-emerald-400'
                                                                    }`}
                                                                >
                                                                    {executionData.guarantor_followup?.guarantee_type ===
                                                                    'attendance'
                                                                        ? 'كفالة إحضار شخصية'
                                                                        : 'كفالة ضامنة للمبلغ'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            aria-expanded={guarantorMenuOpen}
                                                            aria-label="قائمة إجراءات الكفيل"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setGuarantorSeizureOpen(false);
                                                                setGuarantorMenuOpen((v) => !v);
                                                            }}
                                                            className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        {guarantorMenuOpen ? (
                                                            <div className="absolute left-3 top-12 z-[9999] w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0A0F1C]/95 shadow-2xl">
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-right text-[12px] font-bold text-white hover:bg-white/5"
                                                                    onClick={() => {
                                                                        setGuarantorMenuOpen(false);
                                                                        openGuarantorDetailsModal();
                                                                    }}
                                                                >
                                                                    تعديل بيانات الكفيل
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-right text-[12px] font-bold text-amber-100 hover:bg-white/5"
                                                                    onClick={() => {
                                                                        setGuarantorMenuOpen(false);
                                                                        setGuarantorReplaceConfirmOpen(true);
                                                                    }}
                                                                >
                                                                    استبدال الكفيل
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-right text-[12px] font-bold text-rose-100 hover:bg-white/5"
                                                                    onClick={() => {
                                                                        setGuarantorMenuOpen(false);
                                                                        setGuarantorUnlinkConfirmOpen(true);
                                                                    }}
                                                                >
                                                                    فك الكفالة / حذف
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    {typeof document !== 'undefined' &&
                                                    (guarantorReplaceConfirmOpen || guarantorUnlinkConfirmOpen) &&
                                                        createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                                                                role="presentation"
                                                                onClick={() => {
                                                                    setGuarantorReplaceConfirmOpen(false);
                                                                    setGuarantorUnlinkConfirmOpen(false);
                                                                }}
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    className="w-full max-w-sm rounded-2xl border border-rose-500/25 bg-[#0A0F1C] p-4 text-right shadow-2xl"
                                                                    dir="rtl"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <p className="text-sm font-black text-rose-100">
                                                                        تحذير
                                                                    </p>
                                                                    <p className="mt-2 text-[12px] leading-relaxed text-slate-200/90">
                                                                        تحذير: هذا الإجراء يقوم بأرشفة بيانات الكفيل الحالية.
                                                                    </p>
                                                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-white hover:bg-slate-700"
                                                                            onClick={() => {
                                                                                setGuarantorReplaceConfirmOpen(false);
                                                                                setGuarantorUnlinkConfirmOpen(false);
                                                                            }}
                                                                        >
                                                                            تراجع
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="rounded-xl border border-rose-500/35 bg-rose-950/35 py-2.5 text-[11px] font-black text-rose-100 hover:bg-rose-950/50"
                                                                            onClick={() => {
                                                                                if (guarantorReplaceConfirmOpen) {
                                                                                    setGuarantorReplaceConfirmOpen(false);
                                                                                    archiveAndClearGuarantor('replace');
                                                                                    handleGuarantorRequestFromFollowup();
                                                                                    return;
                                                                                }
                                                                                setGuarantorUnlinkConfirmOpen(false);
                                                                                archiveAndClearGuarantor('unlink');
                                                                            }}
                                                                        >
                                                                            {guarantorReplaceConfirmOpen
                                                                                ? 'تأكيد الاستبدال'
                                                                                : 'تأكيد فك الكفالة'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>,
                                                            document.body
                                                        )}

                                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-gray-400">الاسم</div>
                                                            <div className="font-bold text-white truncate">
                                                                {executionData.guarantor_followup?.guarantor_name?.trim() ||
                                                                    '—'}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-gray-400">عنوان العمل</div>
                                                            <div className="font-bold text-white truncate">
                                                                {executionData.guarantor_followup?.guarantor_workplace?.trim() ||
                                                                    '—'}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-gray-400">الراتب</div>
                                                            <div className="font-bold text-white font-mono tabular-nums truncate">
                                                                {typeof executionData.guarantor_followup?.guarantor_salary_iqd ===
                                                                    'number' &&
                                                                Number.isFinite(
                                                                    executionData.guarantor_followup.guarantor_salary_iqd as number
                                                                ) &&
                                                                (executionData.guarantor_followup.guarantor_salary_iqd as number) >
                                                                    0
                                                                    ? `${(
                                                                          executionData.guarantor_followup.guarantor_salary_iqd as number
                                                                      ).toLocaleString('ar-IQ')} د.ع`
                                                                    : '—'}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-gray-400">الاستقطاع</div>
                                                            <div className="font-bold text-white font-mono tabular-nums truncate">
                                                                {typeof executionData.guarantor_followup?.guarantor_deduction_iqd ===
                                                                    'number' &&
                                                                Number.isFinite(
                                                                    executionData.guarantor_followup.guarantor_deduction_iqd as number
                                                                ) &&
                                                                (executionData.guarantor_followup.guarantor_deduction_iqd as number) >
                                                                    0
                                                                    ? `${(
                                                                          executionData.guarantor_followup.guarantor_deduction_iqd as number
                                                                      ).toLocaleString('ar-IQ')} د.ع`
                                                                    : '—'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex flex-row gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSummonsContextDebtorKey(null);
                                                                setSummonsHubInitialMainTab('guarantor');
                                                                setShowUnifiedSummonsModal(true);
                                                            }}
                                                            className="flex-1 inline-flex items-center justify-center gap-2 flex-row-reverse rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2.5 text-[11px] font-bold text-cyan-50 hover:bg-cyan-500/15"
                                                        >
                                                            <Bell size={14} />
                                                            تبليغ الكفيل
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={executionData.guarantor_followup?.guarantee_type !== 'amount'}
                                                            onClick={() => setGuarantorSeizureOpen((v) => !v)}
                                                            className={`flex-1 inline-flex items-center justify-center gap-2 flex-row-reverse rounded-xl border py-2.5 text-[11px] font-bold transition-colors ${
                                                                executionData.guarantor_followup?.guarantee_type !== 'amount'
                                                                    ? 'border-white/10 bg-white/5 text-slate-400'
                                                                    : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15'
                                                            }`}
                                                            title={
                                                                executionData.guarantor_followup?.guarantee_type !== 'amount'
                                                                    ? 'كفالة إحضار فقط'
                                                                    : undefined
                                                            }
                                                        >
                                                            <Wallet size={14} />
                                                            اتخاذ إجراءات الحجز
                                                        </button>
                                                    </div>

                                                    {guarantorSeizureOpen &&
                                                    executionData.guarantor_followup?.guarantee_type === 'amount' ? (
                                                        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0A0F1C]/70 p-2">
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setGuarantorSeizureOpen(false);
                                                                        requestGuarantorSeizure('salary');
                                                                    }}
                                                                    className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-100 hover:bg-emerald-500/15"
                                                                >
                                                                    طلب حجز راتب الكفيل
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setGuarantorSeizureOpen(false);
                                                                        requestGuarantorSeizure('movable');
                                                                    }}
                                                                    className="w-full rounded-xl border border-sky-500/20 bg-sky-500/10 py-2 text-[11px] font-bold text-sky-100 hover:bg-sky-500/15"
                                                                >
                                                                    طلب حجز أموال منقولة
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setGuarantorSeizureOpen(false);
                                                                        requestGuarantorSeizure('property');
                                                                    }}
                                                                    className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 py-2 text-[11px] font-bold text-amber-100 hover:bg-amber-500/15"
                                                                >
                                                                    طلب حجز عقار
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                        </div>
        </div>
      );
    })}
  </>
);
}
