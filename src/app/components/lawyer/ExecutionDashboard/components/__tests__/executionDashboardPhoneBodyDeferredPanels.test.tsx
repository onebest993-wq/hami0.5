import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import { ExecutionDashboardPhoneBodyDeferredPanels } from '../ExecutionDashboardPhoneBodyDeferredPanels';

const { secureStoreSetItemSync } = vi.hoisted(() => ({
    secureStoreSetItemSync: vi.fn(),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        setItemSync: secureStoreSetItemSync,
    },
}));

vi.mock('../GuarantorExternalHub', () => ({
    GuarantorExternalHub: () => <div>guarantor-external-hub</div>,
}));

vi.mock('../../executionDashboardLazyRegistry', () => ({
    LazyExecutionFinancialHubPortal: () => <div>financial-hub-portal</div>,
    LazyFinancialOperationsCenter: () => null,
    LazyJudicialCustodianCardMenu: (props: { onEdit?: () => void; onDelete?: () => void }) => (
        <>
            <button type="button" onClick={props.onEdit}>
                edit-custodian
            </button>
            <button type="button" onClick={props.onDelete}>
                delete-custodian
            </button>
        </>
    ),
    LazySeizureRequestSubjectModal: (props: { open: boolean; title: string }) =>
        props.open ? <div>{props.title}</div> : null,
    LazyUnifiedSeizureLogHost: () => <div>unified-seizure-log</div>,
    LazyVisitationCalendarModal: (props: { open: boolean }) =>
        props.open ? <div>visitation-calendar-modal</div> : null,
    LazyVisitationScheduleModule: () => <div>visitation-schedule-module</div>,
}));

describe('ExecutionDashboardPhoneBodyDeferredPanels', () => {
    function buildProps(): Parameters<typeof ExecutionDashboardPhoneBodyDeferredPanels>[0] {
        return {
            quaternaryStageReady: true,
            tertiaryStageReady: true,
            safeActiveGraceTasks: [
                {
                    id: 'task-1',
                    title: 'مهمة المهلة',
                    body: 'تفاصيل',
                    dueDate: '2026-07-15T10:00:00.000Z',
                },
            ],
            safeShouldShowGuarantorExternalHub: () => true,
            directOpenUnifiedSummonsHub: vi.fn(),
            removeJudicialCustodianEntry: vi.fn(),
            propertyInlineSaveCtx: {
                dossierId: 'exec-1',
                showToast: vi.fn(),
                persistProperties: vi.fn(),
                pushTimeline: vi.fn(),
                nextTimelineId: () => 'timeline-1',
            } satisfies PropertyInlineSaveContext,
            movableInlineSaveCtx: {
                dossierId: 'exec-1',
                showToast: vi.fn(),
                persistMovables: vi.fn(),
                readMovables: () => [],
                pushTimeline: vi.fn(),
                nextTimelineId: () => 'timeline-1',
            } satisfies MovableInlineSaveContext,
            saveSeizedMovableInitForDecision: vi.fn(),
            openGuarantorFollowupDetails: vi.fn(),
            closeFinancialHubPortal: vi.fn(),
            toggleFinancialCenterExpanded: vi.fn(),
            directOpenPaymentCalculator: vi.fn(),
            directOpenSettlementCalculator: vi.fn(),
            directOpenLedgerModal: vi.fn(),
            directOpenEvictionExpenseModal: vi.fn(),
            scope: {
                activeDebtorIsDeceased: false,
                activeFinancialTab: 0,
                accumulatedAlimony: 0,
                appealPerspective: 'grievance',
                appendGuarantorFollowupRequest: vi.fn(() => ({ ok: true })),
                archiveAndClearGuarantor: vi.fn(),
                assignmentWorkspaceCtx: { activeDebtorKey: 'debtor-1' },
                beginThirdPartyReceiveStep: vi.fn(),
                calculatedExecutionFee: 0,
                cancelThirdPartyReceiveStep: vi.fn(),
                confirmThirdPartyReceive: vi.fn(),
                claimType: 'financial',
                clearActiveSalarySeizurePath: vi.fn(),
                closeUnifiedSeizureLog: vi.fn(),
                openUnifiedSeizureLog: vi.fn(),
                decisionsReloadEpoch: 1,
                decisionsStorageExecutionId: 'exec-1',
                executionData: { id: 'exec-1' } as unknown as ExecutionFile,
                executionId: 'exec-1',
                executionStatus: 'active',
                executionToolsTimelineLockedUi: false,
                evictionAssetsTabUnlocked: true,
                evictionCaseExpenses: [],
                evictionCaseExpensesTotalForFinancial: 0,
                evictionGraceHidden: false,
                evictionGracePinned: true,
                evictionLawyerFeesInTotals: 0,
                financialHubAutoOpenMode: null,
                financialHubSeizedMovableId: null,
                financialHubSeizedPropertyId: null,
                financialLedger: [],
                financialLawyerFeesAmount: 0,
                financialPrincipalAmount: 0,
                financialStatus: { label: 'ok', color: 'green', pulse: false },
                focusSeizureMovableInlineCompletion: vi.fn(),
                focusSeizurePropertyInlineCompletion: vi.fn(),
                followupSalarySeizureLabel: 'راتب',
                followupSpecialization: {},
                getLocalTodayYmd: () => '2026-07-11',
                guarantorFollowupAwaitingDetailsSave: vi.fn(() => false),
                handleCoerciveAction: vi.fn(),
                handleEvictionLawyerFeeRequest: vi.fn(),
                handleEvictionLedgerActivated: vi.fn(),
                handleFundsLedgerPayment: vi.fn(),
                handleGuarantorRequestFromFollowup: vi.fn(),
                isAlimonyClaim: false,
                isEvictionExecutionModule: true,
                isFinancialCenterExpanded: false,
                isMaritalFurnitureClaim: true,
                isNonFinancialClaim: false,
                isPaused: false,
                isRepresentingDebtor: false,
                isVisitationClaim: true,
                judicialCustodiansResolved: [
                    { id: 'custodian-1', fullName: 'حارس أول', salary: '50000' },
                ],
                lawyerFeePayoutApproved: false,
                monthlyAlimony: 0,
                movableSeizureRegistryAssets: [],
                movableSeizureRequestModalOpen: true,
                movableSeizureSubjectDraft: 'منقول',
                nextTimelineId: () => 'timeline-1',
                paidClientFees: 0,
                paidCourtFees: 0,
                paidDebt: 0,
                paidDirectorateFees: 0,
                parsedClientFees: 0,
                parsedCourtFees: 0,
                parsedDirectorateFees: 0,
                patchSalarySeizureAssetDetails: vi.fn(),
                persistExecutionMerge: vi.fn(),
                pushSeizureAuctionCalendarAppointment: vi.fn(),
                pushTimelineEvent: vi.fn(),
                realEstateSeizureRegistryAssets: [],
                releaseSeizureAssetRow: vi.fn(),
                remaining: 0,
                salarySeizureRegistryAssets: [],
                salarySeizureTabRows: [],
                seizureLogExecutorDecisions: [],
                seizureMatrixLedgerParamsRef: {
                    current: {
                        principal_amount: 0,
                        courtOrderedFeesSafe: 0,
                        evictionLawyerFeeWaivedAtIntake: false,
                        executionExpensesSumSafe: 0,
                        evictionCaseExpensesSumSafe: 0,
                        seedLawyerId: 'lawyer-1',
                        seedExpenseId: 'expense-1',
                    },
                },
                setActiveFinancialTab: vi.fn(),
                setCaseTasksPending: vi.fn(),
                setEvictionGraceHidden: vi.fn(),
                setFinancialHubAutoOpenMode: vi.fn(),
                setFinancialHubSeizedMovableId: vi.fn(),
                setFinancialHubSeizedPropertyId: vi.fn(),
                setIsFinancialCenterExpanded: vi.fn(),
                setJudicialCustodianModalCtx: vi.fn(),
                setJudicialCustodianModalOpen: vi.fn(),
                setMovableSeizureRequestModalOpen: vi.fn(),
                setMovableSeizureSubjectDraft: vi.fn(),
                setPropertySeizureRequestModalOpen: vi.fn(),
                setPropertySeizureSubjectDraft: vi.fn(),
                setShowExecutionFinancialHub: vi.fn(),
                setShowVisitationCalendarModal: vi.fn(),
                setThirdPartyFundsDraftById: vi.fn(),
                setThirdPartySeizuresUi: vi.fn(),
                setTimelineEvents: vi.fn(),
                setUnifiedLedgerRevision: vi.fn(),
                setUnifiedSeizureLogTab: vi.fn(),
                showExecutionFinancialHub: true,
                showToast: vi.fn(),
                showUnifiedSeizureLogModal: true,
                showVisitationCalendarModal: true,
                standaloneExecutionMarks: [],
                statusMetadata: {},
                submitMovableSeizureRequest: vi.fn(),
                submitPropertySeizureRequest: vi.fn(),
                thirdPartyFundsDraftById: {},
                thirdPartySeizureRegistryAssets: [],
                thirdPartySeizuresUi: [],
                timelineDebtorMetadata: vi.fn(() => ({})),
                todayYmd: '2026-07-11',
                totalOwed: 0,
                totalWithExecutionFee: 0,
                total_execution_expenses: 0,
                unifiedSeizureLogEntries: [],
                unifiedSeizureLogTab: 'property',
                unifiedSeizureTabCounts: {
                    property: 0,
                    salary: 0,
                    movable: 0,
                    third_party: 0,
                },
                updateThirdPartyReceiveDraft: vi.fn(),
                viewExecutionData: {
                    id: 'exec-1',
                    visitationSchedule: {
                        config: {
                            decisionMode: 'viewing_only',
                            location: 'المحكمة',
                            startTime: '09:00',
                            executionStartDate: '2026-07-01',
                            anchorDate: '2026-07-11',
                            weekDays: [6],
                            monthWeeks: [2],
                        },
                        sessions: [],
                    },
                } as unknown as ExecutionFile,
                visitChildNames: ['طفل أول'],
                propertySeizureRequestModalOpen: true,
                propertySeizureSubjectDraft: 'عقار',
                graceHiddenKey: 'grace-key',
                shouldCalculateExecutionFee: false,
                daysSinceNoticeCalculated: 0,
                gracePeriodEnded: false,
                initiator: 'system',
                hasUnifiedSeizureLogContent: true,
                seizedPropertiesForSeizureLog: [],
                seizedMovablesForSeizureLog: [],
            },
        };
    }

    it('renders the deferred phone-body modules in one bundled pass', async () => {
        const props = buildProps();

        render(<ExecutionDashboardPhoneBodyDeferredPanels {...props} />);

        expect(await screen.findByText('guarantor-external-hub')).toBeInTheDocument();
        expect(screen.getByText('visitation-schedule-module')).toBeInTheDocument();
        expect(screen.queryByText('visitation-calendar-modal')).not.toBeInTheDocument();
        expect(screen.getByText('financial-hub-portal')).toBeInTheDocument();
        expect(screen.getByText('unified-seizure-log')).toBeInTheDocument();
        expect(screen.getByText('طلب حجز عقار')).toBeInTheDocument();
        expect(screen.getByText('طلب حجز مال منقول')).toBeInTheDocument();
    });

    it('wires custodians and grace controls without relying on the parent phone body test', async () => {
        const props = buildProps();

        render(<ExecutionDashboardPhoneBodyDeferredPanels {...props} />);

        fireEvent.click(await screen.findByRole('button', { name: 'edit-custodian' }));
        fireEvent.click(screen.getByRole('button', { name: 'delete-custodian' }));
        fireEvent.click(screen.getByRole('button', { name: 'إخفاء' }));

        expect(props.scope.setJudicialCustodianModalCtx).toHaveBeenCalledWith(
            expect.objectContaining({
                initialName: 'حارس أول',
                initialSalary: '50000',
            }),
        );
        expect(props.scope.setJudicialCustodianModalOpen).toHaveBeenCalledWith(true);
        expect(props.removeJudicialCustodianEntry).toHaveBeenCalledWith('custodian-1');
        expect(props.scope.setEvictionGraceHidden).toHaveBeenCalledWith(true);
        expect(secureStoreSetItemSync).toHaveBeenCalledWith('grace-key', '1');
    });
});
