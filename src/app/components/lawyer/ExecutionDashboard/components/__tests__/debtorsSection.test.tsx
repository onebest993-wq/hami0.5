import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../ExecutionPartyCardFrame', () => ({
    ExecutionPartyCardFrame: ({
        children,
        expandedPanel,
    }: {
        children: React.ReactNode;
        expandedPanel?: React.ReactNode;
    }) => (
        <div>
            <div>{children}</div>
            <div>{expandedPanel}</div>
        </div>
    ),
}));

vi.mock('@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu', () => ({
    ExecutionPartySpecialActionsMenu: () => null,
}));

vi.mock('../HeirsQuickViewTrigger', () => ({
    HeirsQuickViewTrigger: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));

vi.mock('@/app/utils/debtorEntityKindUtils', () => ({
    resolveDebtorEntityKind: () => 'natural_person',
}));

vi.mock('@/app/utils/noticeDebtorScope', () => ({
    debtorShowsUnservedMemoBadge: () => true,
}));

vi.mock('@/app/utils/executionClaimIsolation', () => ({
    isCustodyRemovalExecutionClaim: () => false,
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    dispatchDecisionsReload: vi.fn(),
    patchExecutorDecisionRow: vi.fn(),
    readExecutorDecisionsArray: vi.fn(() => []),
}));

import { DebtorsSection } from '../DebtorsSection';

function IconStub() {
    return <span aria-hidden="true" />;
}

describe('DebtorsSection', () => {
    it('opens unified summons hub through explicit callback for debtor unserved memo badge', () => {
        const onOpenUnifiedSummonsHub = vi.fn();
        const props = {
            Bell: IconStub,
            Calendar: IconStub,
            DebtorSeizureCategoryBadges: () => null,
            ExecutionPartyInteractiveBadges: () => null,
            MapPin: IconStub,
            PartyOverflowToggle: () => null,
            Phone: IconStub,
            X: IconStub,
            activeCoerciveActions: [],
            activeDebtorHeirsForNotification: [],
            activeDebtorIsDeceased: false,
            activeNoticeState: '',
            activeTimelineEvents: [],
            activeTimelineEventsDebtorScoped: [],
            buildDebtorSummonsMarkerPatchForKey: vi.fn(() => ({})),
            buildEmployeeAssignmentPatchForDebtorKey: vi.fn(() => ({})),
            buildPartyHeirsRows: vi.fn(() => []),
            buildPublicationNoticePatchForDebtorKey: vi.fn(() => ({})),
            claimType: 'financial',
            clearDebtorSummonsMarker: vi.fn(),
            completeEvictionResidentialGrace: vi.fn(),
            completePoliceAssistance: vi.fn(),
            computeTaklifDeadlineYmd: vi.fn(() => '2026-07-11'),
            daysRemainingUntilDeadline: vi.fn(() => 1),
            debtorArrested: false,
            debtorAttendedVoluntarily: false,
            debtorBrowserTabsMode: true,
            liabilityGroupTabsMode: false,
            debtorLiabilityGroups: [],
            debtorDeathMenuLabel: 'وفاة المدين',
            debtorEmploymentToggleMenuLabel: vi.fn(() => 'تبديل'),
            debtorForcedToAttend: false,
            debtorSummonsMarkerLocal: null,
            debtorSummonsProfile: {},
            debtorWorkspaceChipStripRef: { current: null },
            debtorWorkspaceEntries: [
                {
                    key: 'debtor-1',
                    d: { name: 'الأول' },
                    isPrimary: true,
                    fileDebtorIndex: 0,
                    unified: { name: 'الأول' },
                },
                {
                    key: 'debtor-2',
                    d: { name: 'الثاني' },
                    isPrimary: false,
                    fileDebtorIndex: 1,
                    unified: { name: 'الثاني' },
                },
            ],
            decisionsReloadEpoch: 0,
            decisionsStorageExecutionId: 'ex-1',
            dismissDebtorAbsenceBadge: vi.fn(),
            effectiveDebtors: [{ name: 'الأول' }, { name: 'الثاني' }],
            evictionGraceBadgeInfo: null,
            evictionGracePinned: false,
            executionAppealBanner: { show: false, label: '' },
            executionData: {
                id: 'ex-1',
                debtors: [{ name: 'الأول' }, { name: 'الثاني' }],
            },
            executionDebtorTabIndex: 1,
            executionId: 'ex-1',
            executionMemoBadgePopoverOpen: false,
            executionToolsTimelineLockedUi: false,
            forcedAttendanceIssued: false,
            forcedPathAttendanceSecured: false,
            getDebtorSummonsMarkerForKey: vi.fn(() => null),
            getDebtorSummonsProfile: vi.fn(() => ({})),
            getEmployeeAssignmentForDebtorKey: vi.fn(() => null),
            getExecutionPartyDisplayName: vi.fn((_party, role:_role, index) => ({
                text: index === 0 ? 'المدين الأول' : 'المدين الثاني',
                baseName: index === 0 ? 'المدين الأول' : 'المدين الثاني',
                showDeceasedGlyph: false,
            })),
            getPersonalCoerciveSubtypeOutcome: vi.fn(() => ({
                pending: false,
                approved: false,
                rejected: false,
                alternative: false,
            })),
            getPublicationNoticeForDebtorKey: vi.fn(() => null),
            handleDebtorDeathMenuAction: vi.fn(),
            handleDebtorEmploymentToggle: vi.fn(),
            heirsDetailsIncludeClient: vi.fn(() => false),
            isAssignmentDeadlinePassed: vi.fn(() => false),
            isDebtorGovernmentEmployee: false,
            isDebtorRowEmployee: vi.fn(() => false),
            isEvictionExecutionModule: false,
            isHistoricalMode: false,
            isNonFinancialClaim: false,
            isRepresentingDebtor: false,
            multiDebtorMode: true,
            nextTimelineId: vi.fn(() => 'tl-1'),
            openEditParty: vi.fn(),
            openEvictionResidentialGraceModal: vi.fn(),
            openHeirsNotificationCenter: vi.fn(),
            openHeirsQuickView: vi.fn(),
            openPoliceAssistanceFromBadge: vi.fn(),
            parsedLawyerFees: 0,
            partyBadgesExecutionId: 'ex-1',
            persistExecutionMerge: vi.fn(),
            persistGuarantorFollowupDetails: vi.fn(),
            policeAssistanceBadgeInfo: null,
            primaryDebtorAbsenceBadge: null,
            primaryDebtorKeyResolved: 'debtor-1',
            primaryMemoNoticeBadge: null,
            principalDebtAmount: 0,
            publicationNoticeDeadlineYmd: vi.fn(() => '2026-07-12'),
            pushTimelineEvent: vi.fn(),
            realEstateSeizureAssets: [],
            saveSummonsMarkerPurposeEdit: vi.fn(),
            seizedAssets: [],
            setDebtorSummonsMarkerLocal: vi.fn(),
            onOpenDecisionsAppealsTab: vi.fn(),
            setEvictionGraceDecisionId: vi.fn(),
            setExecutionDebtorTabIndex: vi.fn(),
            setExecutionMemoBadgePopoverOpen: vi.fn(),
            setShowExtraDebtors: vi.fn(),
            onOpenUnifiedSummonsHub,
            setSummonsMarkerPopoverOpen: vi.fn(),
            setSummonsPurposeDraft: vi.fn(),
            showDebtorSummonsAttendanceBadge: false,
            showDebtorUnservedMemoBadge: true,
            showExtraDebtors: false,
            showToast: vi.fn(),
            smExecutionTarget: null,
            smHasGuarantorFile: false,
            hideAllGuarantorPresence: false,
            standaloneExecutionMarks: [],
            summonsMarkerPopoverOpen: false,
            summonsPurposeDraft: '',
            thirdPartySeizureAssets: [],
            thirdPartySeizures: [],
            timelineDebtorMetadata: vi.fn(() => ({})),
            toggleEvictionGracePinned: vi.fn(),
            viewExecutionData: {
                id: 'ex-1',
                debtors: [{ name: 'الأول' }, { name: 'الثاني' }],
            },
            voluntaryAttendanceCount: 0,
            noticeVoluntaryPeriodEndOptimistic: false,
            voluntaryEndOptimistic: false,
        } as unknown as React.ComponentProps<typeof DebtorsSection>;

        render(
            <DebtorsSection {...props} />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'غير مبلّغ' }));

        expect(onOpenUnifiedSummonsHub).toHaveBeenCalledWith({
            debtorKey: 'debtor-2',
            initialMainTab: 'tabligh',
        });
    });
});
