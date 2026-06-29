// @ts-nocheck
/** Phase C Slice 28 — omnibus executionData binding + dossier header metadata */
import type { ExecutionFile } from '@/app/types/execution';
import { useDossierHeaderMetadata } from '../useDossierHeaderMetadata';

export function useExecutionDashboardCoreFileMetadataBinding(p: {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    parentExecutionFile: ExecutionFile | null;
    followupOrchestrator: { evictionCaseExpenses: unknown };
    activeCoerciveActions: string[];
    activeTimelineEvents: unknown[];
}) {
    const {
        executionData,
        viewExecutionData,
        parentExecutionFile,
        followupOrchestrator,
        activeCoerciveActions,
        activeTimelineEvents,
    } = p;

    const {
        directorate = '',
        fileNumber = '',
        fileYear = '',
        executionNumber = fileNumber,
        executionYear = fileYear,
        executionType = '',
        docType = '',
        docNumber = '',
        claimType = '',
        judgmentDate = '',
        classification = '',
        creditors = [],
        debtors = [],
        totalAmount = 0,
        debtAmount = totalAmount,
        lawyerFeesAmount = 0,
        executionFee = lawyerFeesAmount || 0,
        clientFeesAmount = 0,
        courtFees = 0,
        directorateFees = 0,
        monthlyAlimony = 0,
        alimony = null,
        accumulatedAlimony = alimony?.calculated?.totalAccumulated || 0,
        initiator = 'الدائن',
        representedParty = 'creditor',
        daysSinceNotice = 0,
        isAlimonyCase = claimType?.includes('نفقة'),
        lastPaymentDate = null,
        shariaDeedNumber = '',
        shariaRegisterNumber = '',
        shariaIssueDate = '',
        shariaIssuingCourt = '',
        chequeBankName = '',
        chequeIssueDate = '',
        chequeNumber = '',
        status = 'active',
        createdAt = null,
        includesSleepover = false,
        visitationChildrenNames,
        custodyWardNames,
        property_number: evictionPropertyNumber = '',
        district: evictionPropertyDistrict = '',
        property_type: evictionPropertyTypeField = '',
        full_address: evictionFullAddressField = '',
        eviction_premises_use: evictionPremisesUseRaw = undefined,
    } = executionData ?? ({} as ExecutionFile);

    const visitChildNames = Array.isArray(visitationChildrenNames) ? visitationChildrenNames : [];
    const custodyWardNamesList = Array.isArray(custodyWardNames) ? custodyWardNames : [];

    const {
        evictionPremisesUseResolved,
        evictionCaseExpensesSum,
        creditorExtraMinorNames,
        creditorExtraMinorLabel,
        classificationDisplay,
        claimTypeArabicDisplay,
        lawyerStartedPostNoticeExecution,
        judgmentDateDisplay,
        headerFields,
        showJudgmentMeta,
    } = useDossierHeaderMetadata(
        viewExecutionData,
        classification,
        claimType,
        followupOrchestrator.evictionCaseExpenses,
        visitChildNames,
        custodyWardNamesList,
        evictionPremisesUseRaw,
        evictionPropertyTypeField,
        judgmentDate,
        activeCoerciveActions,
        activeTimelineEvents,
        docType,
        docNumber,
    );

    const parentVisitChildNames = Array.isArray(parentExecutionFile?.visitationChildrenNames)
        ? parentExecutionFile.visitationChildrenNames
        : [];
    const parentCustodyWardNamesList = Array.isArray(parentExecutionFile?.custodyWardNames)
        ? parentExecutionFile.custodyWardNames
        : [];
    const parentEvictionCaseExpenses = Array.isArray(parentExecutionFile?.evictionCaseExpenses)
        ? parentExecutionFile.evictionCaseExpenses
        : [];

    const {
        headerFields: parentHeaderFields,
        classificationDisplay: parentClassificationDisplay,
        claimTypeArabicDisplay: parentClaimTypeArabicDisplay,
        judgmentDateDisplay: parentJudgmentDateDisplay,
        showJudgmentMeta: parentShowJudgmentMeta,
    } = useDossierHeaderMetadata(
        parentExecutionFile ?? undefined,
        parentExecutionFile?.classification,
        String(parentExecutionFile?.claimType ?? ''),
        parentEvictionCaseExpenses,
        parentVisitChildNames,
        parentCustodyWardNamesList,
        (parentExecutionFile as { eviction_premises_use?: string } | null)?.eviction_premises_use,
        String((parentExecutionFile as { property_type?: string } | null)?.property_type ?? ''),
        parentExecutionFile?.judgmentDate,
        activeCoerciveActions,
        activeTimelineEvents,
        String(parentExecutionFile?.docType ?? ''),
        String(parentExecutionFile?.docNumber ?? ''),
    );

    return {
        directorate,
        fileNumber,
        fileYear,
        executionNumber,
        executionYear,
        executionType,
        docType,
        docNumber,
        claimType,
        judgmentDate,
        classification,
        creditors,
        debtors,
        totalAmount,
        debtAmount,
        lawyerFeesAmount,
        executionFee,
        clientFeesAmount,
        courtFees,
        directorateFees,
        monthlyAlimony,
        alimony,
        accumulatedAlimony,
        initiator,
        representedParty,
        daysSinceNotice,
        isAlimonyCase,
        lastPaymentDate,
        shariaDeedNumber,
        shariaRegisterNumber,
        shariaIssueDate,
        shariaIssuingCourt,
        chequeBankName,
        chequeIssueDate,
        chequeNumber,
        status,
        createdAt,
        includesSleepover,
        visitationChildrenNames,
        custodyWardNames,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        visitChildNames,
        custodyWardNamesList,
        evictionPremisesUseResolved,
        evictionCaseExpensesSum,
        creditorExtraMinorNames,
        creditorExtraMinorLabel,
        classificationDisplay,
        claimTypeArabicDisplay,
        lawyerStartedPostNoticeExecution,
        judgmentDateDisplay,
        headerFields,
        showJudgmentMeta,
        parentHeaderFields,
        parentClassificationDisplay,
        parentClaimTypeArabicDisplay,
        parentJudgmentDateDisplay,
        parentShowJudgmentMeta,
    };
}
