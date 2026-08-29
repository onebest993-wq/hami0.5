import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FixedPopoverLayout } from '../anchoredPopoverPosition';
import {
    PARTY_BADGE_ICON_SIZE,
    PARTY_BADGE_PILL_CLASS,
} from '../partyBadgeShell';
import { buildPartyBadgeDefinitions } from './buildPartyBadgeDefinitions';
import { buildExtraPartyBadgeDefinitions } from './buildExtraPartyBadgeDefinitions';
import { badgeSortOrder } from './badgeSort';
import {
    absenceBadgeKey,
    buildExecutionBadgeContextKey,
    evictionGraceBadgeKey,
    guarantorFollowupKey,
    memoBadgeSignalKey,
    policeAssistanceBadgeKey,
    publicationNoticeBadgeKey,
    regularTablighBadgeKey,
    taklifAssignmentBadgeKey,
} from './badgeSignalKeys';
import { hiddenBadgeIdsEqual, loadHidden, saveHidden } from './hiddenBadgeStorage';
import { PartyBadgePopover } from './PartyBadgePopover';
import { toneRing } from './toneRing';
import { usePartyBadgePopoverChrome } from './usePartyBadgePopoverChrome';
import { usePartyBadgeSignalUnhideEffects } from './usePartyBadgeSignalUnhideEffects';
import type {
    ExecutionPartyInteractiveBadgesProps,
    PartyInteractiveBadge,
} from './types';

export type {
    PartyBadgeParty,
    MemoBadgeInfo,
    PublicationNoticeBadgeInfo,
    RegularTablighBadgeInfo,
    AbsenceBadgeInfo,
    TaklifAssignmentBadgeInfo,
    EvictionGraceBadgeInfo,
    PoliceAssistanceBadgeInfo,
    PartyInteractiveBadge,
    ExecutionPartyInteractiveBadgesProps,
} from './types';
export { buildPartyBadgeDefinitions } from './buildPartyBadgeDefinitions';

export const ExecutionPartyInteractiveBadges: React.FC<ExecutionPartyInteractiveBadgesProps> = ({
    executionId,
    party,
    isPrimaryDebtor,
    executionData,
    activeCoerciveActions,
    seizedAssets,
    realEstateSeizureAssets = [],
    thirdPartySeizureAssets = [],
    standaloneExecutionMarks = [],
    timelineEvents,
    hasGuarantor,
    memoBadge,
    publicationNoticeBadge = null,
    onPublicationNoticeActivate,
    onMemoActivate,
    absenceBadge,
    onDismissAbsence,
    showSummonsBadge,
    onSummonsActivate,
    regularTablighBadge = null,
    onDismissRegularTablighBadge,
    debtorArrested,
    forcedAttendancePending,
    personalCoerciveDecisionBadges = true,
    decisionsReloadEpoch = 0,
    activeDebtorKey,
    primaryDebtorKey,
    onPersistGuarantorFollowup,
    taklifAssignmentBadge = null,
    onTaklifAssignmentActivate,
    onDismissTaklifAssignmentBadge,
    onDismissPublicationNoticeBadge,
    evictionGracePinned = false,
    onToggleEvictionGracePinned,
    evictionGraceBadge = null,
    onEvictionGraceActivate,
    onCompleteEvictionGrace,
    policeAssistanceBadge = null,
    onPoliceAssistanceActivate,
    onCompletePoliceAssistance,
    onWithdrawTravelBan,
    isHistoricalMode = false,
    debtorIsEmployee = false,
    embeddedInRow = false,
    debtorAttendedVoluntarily: debtorAttendedVoluntarilyProp,
    voluntaryAttendanceCount: voluntaryAttendanceCountProp,
}) => {
    const [hiddenLocal, setHiddenLocal] = useState<string[]>(() => loadHidden(executionId));
    const [openId, setOpenId] = useState<string | null>(null);
    const [guarantorNameDraft, setGuarantorNameDraft] = useState('');
    const [guarantorWorkplaceDraft, setGuarantorWorkplaceDraft] = useState('');
    const [guarantorSalaryDraft, setGuarantorSalaryDraft] = useState('');
    const [guarantorDeductionDraft, setGuarantorDeductionDraft] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const guarantorNameInputRef = useRef<HTMLInputElement>(null);
    const guarantorWorkInputRef = useRef<HTMLInputElement>(null);
    const guarantorSalaryInputRef = useRef<HTMLInputElement>(null);
    const guarantorDeductionInputRef = useRef<HTMLInputElement>(null);
    const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [popoverPos, setPopoverPos] = useState<FixedPopoverLayout | null>(null);
    const executionDataRef = useRef(executionData);
    executionDataRef.current = executionData;
    const visibleRef = useRef<PartyInteractiveBadge[]>([]);

    const executionBadgeKey = buildExecutionBadgeContextKey(executionData, decisionsReloadEpoch);
    const regularTablighSignalKey = regularTablighBadgeKey(regularTablighBadge);
    const publicationNoticeSignalKey = publicationNoticeBadgeKey(publicationNoticeBadge);
    const taklifAssignmentSignalKey = taklifAssignmentBadgeKey(taklifAssignmentBadge);
    const guarantorFollowupSignalKey = guarantorFollowupKey(executionData?.guarantor_followup);

    useEffect(() => {
        const loaded = loadHidden(executionId);
        setHiddenLocal((prev) => (hiddenBadgeIdsEqual(prev, loaded) ? prev : loaded));
    }, [executionId]);

    usePartyBadgeSignalUnhideEffects({
        executionId,
        regularTablighSignalKey,
        publicationNoticeSignalKey,
        taklifAssignmentSignalKey,
        setHiddenLocal,
    });

    useEffect(() => {
        if (openId !== 'guarantor_followup') return;
        const g = executionDataRef.current?.guarantor_followup;
        const name = g?.guarantor_name?.trim() ?? '';
        const workplace = g?.guarantor_workplace?.trim() ?? '';
        const salary =
            g?.guarantor_salary_iqd != null && !Number.isNaN(Number(g.guarantor_salary_iqd))
                ? String(g.guarantor_salary_iqd)
                : '';
        const deduction =
            g?.guarantor_deduction_iqd != null && !Number.isNaN(Number(g.guarantor_deduction_iqd))
                ? String(g.guarantor_deduction_iqd)
                : '';
        setGuarantorNameDraft((prev) => (prev === name ? prev : name));
        setGuarantorWorkplaceDraft((prev) => (prev === workplace ? prev : workplace));
        setGuarantorSalaryDraft((prev) => (prev === salary ? prev : salary));
        setGuarantorDeductionDraft((prev) => (prev === deduction ? prev : deduction));
    }, [openId, guarantorFollowupSignalKey, executionDataRef]);

    useEffect(() => {
        if (openId !== 'guarantor_followup') return;
        const timer = window.setTimeout(() => {
            if (!guarantorNameDraft.trim()) {
                guarantorNameInputRef.current?.focus();
                return;
            }
            if (!guarantorWorkplaceDraft.trim()) {
                guarantorWorkInputRef.current?.focus();
                return;
            }
            if (!guarantorSalaryDraft.trim()) {
                guarantorSalaryInputRef.current?.focus();
                return;
            }
            if (!guarantorDeductionDraft.trim()) {
                guarantorDeductionInputRef.current?.focus();
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [
        openId,
        guarantorNameDraft,
        guarantorWorkplaceDraft,
        guarantorSalaryDraft,
        guarantorDeductionDraft,
    ]);

    const baseDefs = useMemo(
        () =>
            buildPartyBadgeDefinitions({
                party,
                isPrimaryDebtor,
                executionData: executionDataRef.current,
                activeCoerciveActions,
                seizedAssets,
                realEstateSeizureAssets,
                thirdPartySeizureAssets,
                standaloneExecutionMarks,
                timelineEvents,
                hasGuarantor,
                memoBadge: null,
                absenceBadge: null,
                showSummonsBadge: false,
                debtorArrested,
                forcedAttendancePending,
                personalCoerciveDecisionBadges,
                decisionsExecutionId: executionId,
                decisionsReloadEpoch,
                activeDebtorKey,
                primaryDebtorKey,
                onWithdrawTravelBan: isHistoricalMode ? undefined : onWithdrawTravelBan,
                debtorIsEmployee,
            }),
        [
            party,
            isPrimaryDebtor,
            executionBadgeKey,
            debtorIsEmployee,
            activeCoerciveActions,
            seizedAssets,
            realEstateSeizureAssets,
            thirdPartySeizureAssets,
            standaloneExecutionMarks,
            timelineEvents,
            hasGuarantor,
            isHistoricalMode,
            onWithdrawTravelBan,
            debtorArrested,
            forcedAttendancePending,
            personalCoerciveDecisionBadges,
            executionId,
            decisionsReloadEpoch,
            activeDebtorKey,
            primaryDebtorKey,
        ]
    );

    const extraDefs = useMemo(
        () =>
            buildExtraPartyBadgeDefinitions({
                party,
                isPrimaryDebtor,
                executionData: executionDataRef.current,
                memoBadge,
                publicationNoticeBadge,
                regularTablighBadge,
                absenceBadge,
                evictionGraceBadge,
                policeAssistanceBadge,
                showSummonsBadge,
                onMemoActivate,
                onPublicationNoticeActivate,
                onEvictionGraceActivate,
                onPoliceAssistanceActivate,
                onSummonsActivate,
                onDismissPublicationNoticeBadge,
                onDismissRegularTablighBadge,
                onDismissAbsence,
                onDismissTaklifAssignmentBadge,
                onCompleteEvictionGrace,
                onCompletePoliceAssistance,
                executionBadgeKey,
                executionId,
                debtorAttendedVoluntarilyProp,
                voluntaryAttendanceCountProp,
                personalCoerciveDecisionBadges,
                debtorArrested: Boolean(debtorArrested),
                forcedAttendancePending: Boolean(forcedAttendancePending),
                taklifAssignmentSignalKey,
                onTaklifAssignmentActivate,
                activeDebtorKey,
                primaryDebtorKey,
                taklifAssignmentBadge,
            }),
        [
        party,
        isPrimaryDebtor,
        memoBadgeSignalKey(memoBadge),
        publicationNoticeSignalKey,
        regularTablighSignalKey,
        absenceBadgeKey(absenceBadge),
        showSummonsBadge,
        onMemoActivate,
        onPublicationNoticeActivate,
        onSummonsActivate,
        onDismissPublicationNoticeBadge,
        onDismissRegularTablighBadge,
        onDismissTaklifAssignmentBadge,
        onDismissAbsence,
        evictionGraceBadgeKey(evictionGraceBadge),
        onEvictionGraceActivate,
        onCompleteEvictionGrace,
        policeAssistanceBadgeKey(policeAssistanceBadge),
        onPoliceAssistanceActivate,
        onCompletePoliceAssistance,
        executionBadgeKey,
        executionId,
        debtorAttendedVoluntarilyProp,
        voluntaryAttendanceCountProp,
        personalCoerciveDecisionBadges,
        debtorArrested,
        forcedAttendancePending,
        taklifAssignmentSignalKey,
        onTaklifAssignmentActivate,
        activeDebtorKey,
        primaryDebtorKey,
    
        ],
    );

    const allDefs = useMemo(() => [...extraDefs, ...baseDefs], [extraDefs, baseDefs]);

    const visible = useMemo(() => {
        const dossierControlled = new Set(['summons_attendance', 'taklif_attendance', 'publication_notice']);
        const v = allDefs.filter((b) => (dossierControlled.has(b.id) ? true : !hiddenLocal.includes(b.id)));
        return [...v].sort((a, b) => {
            const pa = badgeSortOrder(a.id);
            const pb = badgeSortOrder(b.id);
            if (pa !== pb) return pa - pb;
            return a.shortLabel.localeCompare(b.shortLabel, 'ar');
        });
    }, [allDefs, hiddenLocal]);

    visibleRef.current = visible;

    const hideBadge = useCallback(
        (b: PartyInteractiveBadge) => {
            if (b.dismissMode === 'callback') {
                b.onDismiss?.();
                setOpenId(null);
                return;
            }
            setHiddenLocal((prev) => {
                const next = prev.includes(b.id) ? prev : [...prev, b.id];
                saveHidden(executionId, next);
                return next;
            });
            setOpenId(null);
        },
        [executionId]
    );

    usePartyBadgePopoverChrome({
        openId,
        setOpenId,
        isHistoricalMode,
        btnRefs,
        popoverRef,
        rootRef,
        visibleRef,
        popoverPos,
        setPopoverPos,
    });

    const openBadge = openId ? visible.find((x) => x.id === openId) : null;

    if (!executionId || visible.length === 0) return null;
    const popoverPortal =
        !isHistoricalMode && openBadge && popoverPos ? (
            <PartyBadgePopover
                openBadge={openBadge}
                popoverPos={popoverPos}
                popoverRef={popoverRef}
                onClose={() => setOpenId(null)}
                onHide={() => hideBadge(openBadge)}
                guarantorNameDraft={guarantorNameDraft}
                setGuarantorNameDraft={setGuarantorNameDraft}
                guarantorWorkplaceDraft={guarantorWorkplaceDraft}
                setGuarantorWorkplaceDraft={setGuarantorWorkplaceDraft}
                guarantorSalaryDraft={guarantorSalaryDraft}
                setGuarantorSalaryDraft={setGuarantorSalaryDraft}
                guarantorDeductionDraft={guarantorDeductionDraft}
                setGuarantorDeductionDraft={setGuarantorDeductionDraft}
                guarantorNameInputRef={guarantorNameInputRef}
                guarantorWorkInputRef={guarantorWorkInputRef}
                guarantorSalaryInputRef={guarantorSalaryInputRef}
                guarantorDeductionInputRef={guarantorDeductionInputRef}
                onPersistGuarantorFollowup={onPersistGuarantorFollowup}
                evictionGracePinned={evictionGracePinned}
                onToggleEvictionGracePinned={onToggleEvictionGracePinned}
            />
        ) : null;

    return (
        <>
            <div
                ref={rootRef}
                className={
                    embeddedInRow
                        ? `contents${isHistoricalMode ? ' pointer-events-none opacity-60' : ''}`
                        : `flex min-w-0 flex-1 flex-row-reverse flex-wrap content-start items-center justify-start gap-2${
                              isHistoricalMode ? ' pointer-events-none opacity-60' : ''
                          }`
                }
            >
                {visible.map((b) => {
                    const Icon = b.Icon;
                    return (
                        <div key={b.id} className="relative shrink-0">
                            <button
                                type="button"
                                ref={(el) => {
                                    btnRefs.current[b.id] = el;
                                }}
                                disabled={isHistoricalMode}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isHistoricalMode) return;
                                    setOpenId((id) => (id === b.id ? null : b.id));
                                }}
                                className={`${PARTY_BADGE_PILL_CLASS} ${toneRing[b.tone]}`}
                            >
                                <Icon size={PARTY_BADGE_ICON_SIZE} className="shrink-0 opacity-90" strokeWidth={2} />
                                <span className="whitespace-nowrap">{b.shortLabel}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
            {popoverPortal}
        </>
    );
};

