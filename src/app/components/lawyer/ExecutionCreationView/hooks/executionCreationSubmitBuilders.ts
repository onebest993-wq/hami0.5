import type { ExecutionFileDTO_Supabase } from '@/app/services/SupabaseService';
import { generateExecutionDossierId } from '@/app/utils/executionStorageKeys';
import type { ForeignJudgmentData } from '../components/ForeignJudgmentSection';
import type {
    AdditionalCreditorDraft,
    CreditorDraft,
    DebtorDraft,
    ExecutionDraftParty,
    ExecutionDraftRecord,
    ExecutionTargetOption,
} from '../types';
import {
    isFinancialClaimForPartySplit,
    parseMoneyInput,
} from './executionFormUtils';
import { calculateImprisonmentEligibility } from '@/app/utils/imprisonmentEngine';

export type { DebtorAllocationResult } from './executionCreationSubmitDebtorAllocation';
export { resolveDebtorPartyAllocation } from './executionCreationSubmitDebtorAllocation';
export {
    applyApplicantRespondentFields,
    applySummoningAndDebtorMaps,
    buildAdditionalPartyRecords,
} from './executionCreationSubmitPartyBuilders';

export function resolveSupabaseExecutionType(
    docType: string,
    classification?: string,
): ExecutionFileDTO_Supabase['executionType'] {
    if (docType === 'الحجج الشرعية') return 'شرعي';
    if (docType === 'تسليم شيء معين') return 'التزام بعمل/تسليم';
    const classNorm = String(classification || '').trim();
    if (classNorm.includes('شرعي') || classNorm.toLowerCase() === 'sharia') return 'شرعي';
    return 'مدني';
}

export function buildBaseExecutionDraft(input: {
    directorate: string;
    fileNumber: string;
    classification: string;
    claimType: string;
    creditors: CreditorDraft[];
    debtors: DebtorDraft[];
    additionalCreditors: AdditionalCreditorDraft[];
    docType: string;
    docNumber: string;
    judgmentDate: string;
}): {
    executionData: ExecutionDraftRecord;
    representedParty: 'creditor' | 'debtor';
    extractedNumber: string;
    extractedYear: string;
} {
    const {
        directorate,
        fileNumber,
        classification,
        claimType,
        creditors,
        debtors,
        additionalCreditors,
        docType,
        docNumber,
        judgmentDate,
    } = input;

    const fileParts = fileNumber.split('/');
    const extractedNumber = fileParts[0] || fileNumber;
    const extractedYear =
        fileParts.length > 1 ? fileParts[1] : new Date().getFullYear().toString();

    const clientCreditors = [
        ...creditors.filter((c) => c.isClient),
        ...additionalCreditors.filter((c) => c.isClient),
    ];
    const representedParty = clientCreditors.length > 0 ? 'creditor' : 'debtor';

    const mappedCreditorsForFile: ExecutionDraftParty[] = [
        {
            id: creditors[0].id,
            name: creditors[0].name,
            phone: creditors[0].phone,
            address: creditors[0].address,
            occupation: creditors[0].occupation,
            isClient: creditors[0].isClient,
            role: 'creditor',
            type: 'individual',
            nationality: '',
        },
    ];

    const executionData: ExecutionDraftRecord = {
        id: generateExecutionDossierId(),
        type: classification === 'شرعي' ? 'sharia' : 'civil',
        title: claimType
            ? `${directorate} - ${claimType} - ${extractedNumber}/${extractedYear}`
            : `${directorate} - ${extractedNumber}/${extractedYear}`,
        directorate,
        fileNumber: extractedNumber.trim(),
        fileYear: extractedYear.trim(),
        representedParty,
        creditors: mappedCreditorsForFile,
        debtors: debtors as unknown as ExecutionDraftParty[],
        creditor: creditors[0] as unknown as ExecutionDraftParty,
        debtor: debtors[0] as unknown as ExecutionDraftParty,
        totalAmount: 0,
        docType,
        docNumber,
        judgmentDate,
        status: 'active',
        createdAt: new Date().toISOString(),
        debtorJob: debtors[0]?.occupation || 'كاسب',
    };

    return { executionData, representedParty, extractedNumber, extractedYear };
}

export function applyInstrumentIdentityFields(
    executionData: ExecutionDraftRecord,
    input: {
        docType: string;
        claimType: string;
        chequeBankName: string;
        chequeIssueDate: string;
        chequeNumber: string;
        foreignData: ForeignJudgmentData;
        shariaDeedNumber: string;
        shariaRegisterNumber: string;
        shariaIssueDate: string;
        shariaIssuingCourt: string;
        shariaDeedDetails: string;
    },
): void {
    const {
        docType,
        claimType,
        chequeBankName,
        chequeIssueDate,
        chequeNumber,
        foreignData,
        shariaDeedNumber,
        shariaRegisterNumber,
        shariaIssueDate,
        shariaIssuingCourt,
        shariaDeedDetails,
    } = input;

    if (docType === 'الأوراق التجارية') {
        executionData.chequeBankName = chequeBankName;
        executionData.chequeIssueDate = chequeIssueDate;
        executionData.chequeNumber = chequeNumber;
        executionData.docNumber = chequeNumber;
    }

    if (docType === 'تنفيذ الأحكام الأجنبية') {
        executionData.foreignData = foreignData;
    }

    if (docType === 'الحجج الشرعية') {
        executionData.shariaDeedNumber = shariaDeedNumber;
        executionData.shariaRegisterNumber = shariaRegisterNumber;
        executionData.shariaIssueDate = shariaIssueDate;
        executionData.shariaIssuingCourt = shariaIssuingCourt;

        if (['حجة وصية', 'حجة تخارج'].includes(claimType)) {
            executionData.shariaDeedDetails = shariaDeedDetails;
        }
    }
}

export function applyClaimTypeFields(
    executionData: ExecutionDraftRecord,
    input: {
        activeClaimTypes: string[];
        claimType: string;
        claimAmountsByType: Record<string, string>;
    },
): string[] {
    const { activeClaimTypes, claimType, claimAmountsByType } = input;
    const savedClaimTypes =
        activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
    executionData.claimType = savedClaimTypes[0] ?? claimType;
    if (savedClaimTypes.length > 0) {
        (executionData as Record<string, unknown>).claimTypes = savedClaimTypes;
    }
    const parsedClaimAmounts = Object.fromEntries(
        Object.entries(claimAmountsByType)
            .map(([k, v]) => [k, parseMoneyInput(v)] as const)
            .filter(([, n]) => n > 0),
    );
    if (Object.keys(parsedClaimAmounts).length > 0) {
        (executionData as Record<string, unknown>).claimAmountsByType = parsedClaimAmounts;
    }
    return savedClaimTypes;
}

export function applyAggregatedFinancialTotal(
    executionData: ExecutionDraftRecord,
    input: {
        resolveGlobalClaimTotalNumber: () => number;
        totalAmount: string;
        claimAmount: string;
    },
): number {
    const aggregatedClaimTotal = input.resolveGlobalClaimTotalNumber();
    if (aggregatedClaimTotal > 0) {
        executionData.totalAmount = aggregatedClaimTotal;
    } else if (parseMoneyInput(input.totalAmount) > 0) {
        executionData.totalAmount = parseMoneyInput(input.totalAmount);
    } else if (parseMoneyInput(input.claimAmount) > 0) {
        executionData.totalAmount = parseMoneyInput(input.claimAmount);
    }
    return aggregatedClaimTotal;
}

export function applyClosingFinancialAndMetaFields(
    executionData: ExecutionDraftRecord,
    input: {
        savedClaimTypes: string[];
        claimType: string;
        globalClaimTotal: number;
        classification: string;
        clientFeesAmount: string;
        dueDate: string;
        executionTarget: ExecutionTargetOption;
        intakeLegalSnapshot?: {
            warnings: string[];
            requiredAttachments: string[];
            legalTips: string[];
            statuteMessage?: string | null;
            notificationPeriodMessage?: string | null;
        };
    },
): void {
    const {
        savedClaimTypes,
        claimType,
        globalClaimTotal,
        classification,
        clientFeesAmount,
        dueDate,
        executionTarget,
        intakeLegalSnapshot,
    } = input;

    if (dueDate) {
        executionData.dueDate = dueDate;
    }

    if (executionTarget) {
        executionData.executionTarget = executionTarget;
    }

    if (
        (savedClaimTypes.some((ct) => isFinancialClaimForPartySplit(ct)) ||
            isFinancialClaimForPartySplit(claimType)) &&
        globalClaimTotal > 0
    ) {
        executionData.debtAmount = globalClaimTotal;
        executionData.total_remaining_balance = globalClaimTotal;
        executionData.paidDebt = 0;
    }

    if (classification && classification !== 'none') {
        executionData.classification = classification;
        executionData.executionType =
            classification === 'شرعي' ? 'شرعي / أحوال شخصية' : 'مدني';
    }

    if (parseMoneyInput(clientFeesAmount) > 0) {
        executionData.clientFeesAmount = parseMoneyInput(clientFeesAmount);
    }

    const primaryDebtor = executionData.debtors?.[0];
    const debtorAgeRaw = primaryDebtor && typeof primaryDebtor.age === 'number' ? primaryDebtor.age : '';
    const debtorProfession = primaryDebtor?.occupation === 'موظف' ? 'موظف' : 'كاسب';
    executionData.imprisonment_eligibility = calculateImprisonmentEligibility({
        debtorAge: debtorAgeRaw,
        debtorProfession,
        debtorKinship: '',
        claimType,
        debtAmount: globalClaimTotal,
    });

    if (intakeLegalSnapshot) {
        executionData.intake_legal_snapshot = intakeLegalSnapshot;
    }
}

export function buildSupabaseExecutionFileDto(
    executionData: ExecutionDraftRecord,
): ExecutionFileDTO_Supabase {
    const creditorData = executionData.creditor || executionData.creditors?.[0];
    const debtorData = executionData.debtor || executionData.debtors?.[0];
    return {
        id: executionData.id,
        caseNo: executionData.fileNumber + '/' + executionData.fileYear,
        executionType: resolveSupabaseExecutionType(
            String(executionData.docType ?? ''),
            String(executionData.classification ?? executionData.type ?? ''),
        ),
        court: executionData.directorate,
        executionBasis: executionData.executionBasis || '',
        creditor: creditorData as unknown as Record<string, unknown>,
        debtor: debtorData as unknown as Record<string, unknown>,
        totalAmount: parseFloat(String(executionData.totalAmount || 0).replace(/,/g, '')),
        status:
            executionData.status === 'active' ||
            executionData.status === 'archived' ||
            executionData.status === 'completed'
                ? executionData.status
                : 'active',
    };
}
