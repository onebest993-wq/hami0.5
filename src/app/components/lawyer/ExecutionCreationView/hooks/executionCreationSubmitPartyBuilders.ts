import { deriveMonetaryClaimNature } from '@/app/domain/execution/summons/summoningImmunityEngine';
import type { ExecutionArchiveFile } from '@/app/types/common';
import type {
    AdditionalCreditorDraft,
    AdditionalDebtorDraft,
    CreditorDraft,
    DebtorDraft,
    ExecutionDraftRecord,
    ExecutionTargetOption,
} from '../types';
import {
    parseMoneyInput,
    splitAmountEqually,
} from './executionFormUtils';

export function applySummoningAndDebtorMaps(
    executionData: ExecutionDraftRecord,
    input: {
        claimType: string;
        savedClaimTypes: string[];
        executionTarget: ExecutionTargetOption;
        debtors: DebtorDraft[];
        includeLawyerFees: boolean;
        debtorLawyerFeesClaims: Record<string, string>;
        applyPartySplit: boolean;
        debtorAllocatedShares: number[];
    },
): void {
    const {
        claimType,
        savedClaimTypes,
        executionTarget,
        debtors,
        includeLawyerFees,
        debtorLawyerFeesClaims,
        applyPartySplit,
        debtorAllocatedShares,
    } = input;

    const inferIsAlimonyClaim = (ct: string) =>
        Boolean(ct?.includes('نفقة') && !ct?.includes('نفقة عدة') && !ct?.includes('مهر'));
    const hasOngoingAlimonyClaim = savedClaimTypes.some(
        (ct) => ct === 'نفقة' || ct === 'حجة نفقة اتفاقية',
    );
    executionData.summoningClaimNature = deriveMonetaryClaimNature(claimType, null);
    executionData.isAlimony =
        hasOngoingAlimonyClaim || savedClaimTypes.some((ct) => inferIsAlimonyClaim(ct));
    const targetHasGuarantor =
        typeof executionTarget === 'string' && executionTarget.includes('كفيل');
    executionData.hasGuarantor = targetHasGuarantor;
    const firstDebtorOcc = debtors[0]?.occupation;
    executionData.salaryCoversAlimony =
        firstDebtorOcc === 'موظف' && executionData.isAlimony === true;
    executionData.debtors = debtors.map((d, i) => {
        const emp = d.occupation === 'موظف';
        const debtorKey = String(d.id);
        const perDebtorLawyerFees = parseMoneyInput(debtorLawyerFeesClaims[debtorKey] ?? '');
        return {
            ...d,
            employmentType: d.occupation,
            isEmployee: emp,
            employmentInitialWasEmployee: emp,
            hasGuarantor: i === 0 ? targetHasGuarantor : false,
            isSolidaryLiability: Boolean(d.isSolidaryLiability),
            ...(includeLawyerFees && perDebtorLawyerFees > 0 && !d.isSolidaryLiability
                ? { lawyerFeesClaimAmount: perDebtorLawyerFees }
                : {}),
            ...(applyPartySplit
                ? { allocated_debt: debtorAllocatedShares[i] ?? 0, paid_amount: 0 }
                : {}),
        };
    }) as unknown as ExecutionArchiveFile['debtors'];
    if (executionData.debtor && executionData.debtors[0]) {
        executionData.debtor = executionData.debtors[0];
    }
}

export function buildAdditionalPartyRecords(input: {
    additionalDebtorsForm: AdditionalDebtorDraft[];
    additionalCreditors: AdditionalCreditorDraft[];
    includeLawyerFees: boolean;
    debtorLawyerFeesClaims: Record<string, string>;
    applyPartySplit: boolean;
    debtorAllocatedShares: number[];
    anySolidaryDebtor: boolean;
    debtorSolidaryFlags: boolean[];
    solidaryRemainderDebt: number;
    executionData: ExecutionDraftRecord;
    globalClaimTotal: number;
    totalAmount: string;
    claimAmount: string;
}): void {
    const {
        additionalDebtorsForm,
        additionalCreditors,
        includeLawyerFees,
        debtorLawyerFeesClaims,
        applyPartySplit,
        debtorAllocatedShares,
        anySolidaryDebtor,
        debtorSolidaryFlags,
        solidaryRemainderDebt,
        executionData,
        globalClaimTotal,
        totalAmount,
        claimAmount,
    } = input;

    const additionalDebtorRecords = additionalDebtorsForm.map((d, i) => {
        const emp = d.occupation === 'موظف';
        const occ = d.occupation === 'موظف' ? 'موظف' : 'كاسب';
        const perDebtorLawyerFees = parseMoneyInput(debtorLawyerFeesClaims[String(d.id)] ?? '');
        return {
            id: String(d.id),
            name: d.name.trim(),
            phone: d.phone.trim() || undefined,
            address: d.address.trim() || undefined,
            occupation: occ,
            employmentType: occ,
            isEmployee: emp,
            employmentInitialWasEmployee: emp,
            status: 'Active' as const,
            isSolidaryLiability: Boolean(d.isSolidaryLiability),
            ...(includeLawyerFees && perDebtorLawyerFees > 0 && !d.isSolidaryLiability
                ? { lawyerFeesClaimAmount: perDebtorLawyerFees }
                : {}),
            allocated_debt: applyPartySplit ? debtorAllocatedShares[i + 1] ?? 0 : 0,
            paid_amount: 0,
        };
    });

    let trimmedAdditionalCreditors = additionalCreditors
        .filter((c) => c.name.trim())
        .map((c) => {
            const emp = c.occupation === 'موظف';
            const occ = c.occupation === 'موظف' ? 'موظف' : 'كاسب';
            return {
                id: c.id,
                name: c.name.trim(),
                phone: c.phone.trim() || undefined,
                address: c.address.trim() || undefined,
                occupation: occ,
                employmentType: occ,
                isEmployee: emp,
                isClient: c.isClient || false,
                paid_amount: 0,
            };
        });

    const totalCreditorSlots = 1 + trimmedAdditionalCreditors.length;
    const creditorClaimTotal =
        globalClaimTotal > 0
            ? globalClaimTotal
            : parseMoneyInput(totalAmount) > 0
              ? parseMoneyInput(totalAmount)
              : parseMoneyInput(claimAmount);
    if (creditorClaimTotal > 0 && totalCreditorSlots >= 1) {
        const creditorShares = splitAmountEqually(creditorClaimTotal, totalCreditorSlots);
        const primaryCreditor = {
            ...executionData.creditors[0],
            allocated_debt: creditorShares[0] ?? 0,
            paid_amount: 0,
        };
        executionData.creditors = [primaryCreditor];
        executionData.creditor = primaryCreditor;
        trimmedAdditionalCreditors = trimmedAdditionalCreditors.map((c, i) => ({
            ...c,
            allocated_debt: creditorShares[i + 1] ?? 0,
        }));
    }

    if (
        trimmedAdditionalCreditors.length > 0 ||
        additionalDebtorRecords.length > 0 ||
        anySolidaryDebtor
    ) {
        executionData.party_multiplicity = {
            additionalCreditors: trimmedAdditionalCreditors,
            additionalDebtors: additionalDebtorRecords,
            isSolidaryLiability: debtorSolidaryFlags.every(Boolean),
            ...(solidaryRemainderDebt > 0 ? { solidaryRemainderDebt } : {}),
        };
    }
}

export function applyApplicantRespondentFields(
    executionData: ExecutionDraftRecord,
    input: {
        representedParty: 'creditor' | 'debtor';
        creditors: CreditorDraft[];
        additionalCreditors: AdditionalCreditorDraft[];
        debtors: DebtorDraft[];
        additionalDebtorsForm: AdditionalDebtorDraft[];
    },
): void {
    const {
        representedParty,
        creditors,
        additionalCreditors,
        debtors,
        additionalDebtorsForm,
    } = input;
    const creditorClientRow =
        creditors.find((c) => c.isClient) ||
        additionalCreditors.find((c) => c.isClient) ||
        creditors[0];
    const debtorClientRow =
        [...debtors, ...additionalDebtorsForm].find((d) => d.isClient) || debtors[0];
    executionData.applicant =
        representedParty === 'creditor' ? creditorClientRow.name : debtorClientRow.name;
    executionData.respondent =
        representedParty === 'creditor'
            ? debtors[0]?.name ?? ''
            : creditors[0]?.name ?? '';
    executionData.initiatorRole = representedParty as string;
}
