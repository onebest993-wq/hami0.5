import React, { useMemo } from 'react';
import { Plus, UserPlus, Users } from 'lucide-react';
import PartyCard, { type PartyCardProps } from './PartyCard';
import { ecg } from './executionCreationGlassUi';
import { ExecutionCreationSection } from './ExecutionCreationSection';
import {
    shouldShowIndependentDebtorSharePanels,
} from '../hooks/executionFormUtils';
import { IndependentDebtorSharePanel } from './IndependentDebtorSharePanel';
import { handleMoneyInputChange } from '@/app/utils/moneyInput';

interface CreditorData {
    id: number;
    name: string;
    phone: string;
    address: string;
    occupation: 'موظف' | 'كاسب';
    isClient: boolean;
}

interface DebtorData {
    id: number;
    name: string;
    phone: string;
    address: string;
    occupation: 'موظف' | 'كاسب';
    isClient: boolean;
    isSolidaryLiability?: boolean;
}

interface AdditionalCreditor {
    id: string;
    name: string;
    phone: string;
    address: string;
    occupation: 'موظف' | 'كاسب';
    isClient: boolean;
}

interface AdditionalDebtor {
    id: string;
    name: string;
    phone: string;
    address: string;
    occupation: 'موظف' | 'كاسب';
    isClient: boolean;
    isSolidaryLiability?: boolean;
}

interface PartiesSectionProps {
    creditors: CreditorData[];
    additionalCreditors: AdditionalCreditor[];
    debtors: DebtorData[];
    additionalDebtorsForm: AdditionalDebtor[];
    allowMultipleDebtors: boolean;
    showDebtorSolidarySplit: boolean;
    classification: string;
    claimType: string;
    effectiveClaimTypes: string[];
    globalClaimTotal: number;
    includeLawyerFees: boolean;
    lockedEntityKind: 'natural_person' | 'legal_entity' | null;
    debtorManualDebtClaims: Record<string, string>;
    debtorLawyerFeesClaims: Record<string, string>;
    formatCurrency: (value: string) => string;
    onDebtorManualDebtChange: (debtorKey: string, raw: string) => void;
    onDebtorLawyerFeesChange: (debtorKey: string, raw: string) => void;
    onAddCreditor: () => void;
    onRemoveAdditionalCreditor: (id: string) => void;
    onUpdateAdditionalCreditor: (id: string, field: string, value: string | boolean | number) => void;
    onUpdateCreditor: (id: number, field: string, value: string | boolean | number) => void;
    onAddIndependentDebtor: () => void;
    onAddSolidaryDebtor: () => void;
    onAddAnotherDebtor: () => void;
    onRemoveAdditionalDebtor: (id: string) => void;
    onUpdateAdditionalDebtor: (id: string, field: string, value: string | boolean | number) => void;
    onUpdateDebtor: (id: number, field: string, value: string | boolean | number) => void;
}

export const PartiesSection: React.FC<PartiesSectionProps> = React.memo(({
    creditors,
    additionalCreditors,
    debtors,
    additionalDebtorsForm,
    allowMultipleDebtors,
    showDebtorSolidarySplit,
    classification,
    claimType,
    effectiveClaimTypes,
    globalClaimTotal,
    includeLawyerFees,
    lockedEntityKind,
    debtorManualDebtClaims,
    debtorLawyerFeesClaims,
    formatCurrency,
    onDebtorManualDebtChange,
    onDebtorLawyerFeesChange,
    onAddCreditor,
    onRemoveAdditionalCreditor,
    onUpdateAdditionalCreditor,
    onUpdateCreditor,
    onAddIndependentDebtor,
    onAddSolidaryDebtor,
    onAddAnotherDebtor,
    onRemoveAdditionalDebtor,
    onUpdateAdditionalDebtor,
    onUpdateDebtor,
}) => {
    const totalCreditorCount = creditors.length + additionalCreditors.length;
    const totalDebtorCount = debtors.length + additionalDebtorsForm.length;
    const showIndependentDebtorSharePanels = shouldShowIndependentDebtorSharePanels(
        classification,
        effectiveClaimTypes,
        claimType,
        totalDebtorCount,
        totalCreditorCount,
    );

    const showDebtorLiabilityLabels = showDebtorSolidarySplit;

    const renderIndependentDebtPanel = (debtorKey: string, isSolidary: boolean) => {
        if (!showIndependentDebtorSharePanels || isSolidary) return null;
        return (
            <div className="px-3 pb-3">
                <IndependentDebtorSharePanel
                    debtDraft={formatCurrency(debtorManualDebtClaims[debtorKey] ?? '')}
                    onDebtInput={(e) => {
                        handleMoneyInputChange(e.target.value, (raw) => {
                            onDebtorManualDebtChange(debtorKey, raw);
                        });
                    }}
                    showLawyerFeesShare={includeLawyerFees}
                    lawyerFeesDraft={formatCurrency(debtorLawyerFeesClaims[debtorKey] ?? '')}
                    onLawyerFeesInput={(e) => {
                        handleMoneyInputChange(e.target.value, (raw) => {
                            onDebtorLawyerFeesChange(debtorKey, raw);
                        });
                    }}
                />
            </div>
        );
    };

    const liabilityLabelFor = (isSolidary: boolean): 'مستقل' | 'ضامن' | null => {
        if (!showDebtorLiabilityLabels) return null;
        return isSolidary ? 'ضامن' : 'مستقل';
    };

    return (
        <ExecutionCreationSection title="أطراف الإضبارة">
            <div className={ecg.partyGroup}>
                <div className="flex flex-col gap-1 p-1">
                    {creditors.map((creditor, index) => (
                        <PartyCard
                            key={creditor.id}
                            party={creditor}
                            index={index}
                            totalCount={totalCreditorCount}
                            type="creditor"
                            onUpdate={onUpdateCreditor as PartyCardProps['onUpdate']}
                            onRemove={() => {}}
                        />
                    ))}
                    {additionalCreditors.map((c, idx) => (
                        <PartyCard
                            key={c.id}
                            party={c}
                            index={creditors.length + idx}
                            totalCount={totalCreditorCount}
                            type="creditor"
                            onUpdate={(id, field, value) =>
                                onUpdateAdditionalCreditor(String(id), field, value)
                            }
                            onRemove={(id) => onRemoveAdditionalCreditor(String(id))}
                        />
                    ))}
                </div>
            </div>

            <button type="button" onClick={onAddCreditor} className={ecg.addBtn}>
                <Plus size={16} /> إضافة دائن آخر
            </button>

            <div className={ecg.partyDivider}>
                <div className={ecg.partyDividerLine} />
            </div>

            <div className={ecg.partyGroup}>
                <div className="flex flex-col gap-1 p-1">
                    {debtors.map((debtor, index) => {
                        const debtorKey = String(debtor.id);
                        const isSolidary = Boolean(debtor.isSolidaryLiability);
                        return (
                            <div key={debtor.id} className="border-b border-white/5 last:border-b-0">
                                <PartyCard
                                    party={debtor}
                                    index={index}
                                    totalCount={totalDebtorCount}
                                    type="debtor"
                                    debtorLiabilityLabel={liabilityLabelFor(isSolidary)}
                                    lockedEntityKind={lockedEntityKind}
                                    onUpdate={onUpdateDebtor as PartyCardProps['onUpdate']}
                                    onRemove={() => {}}
                                />
                                {renderIndependentDebtPanel(debtorKey, isSolidary)}
                            </div>
                        );
                    })}
                    {additionalDebtorsForm.map((d, idx) => {
                        const isSolidary = Boolean(d.isSolidaryLiability);
                        return (
                            <div key={d.id} className="border-b border-white/5 last:border-b-0">
                                <PartyCard
                                    party={d}
                                    index={debtors.length + idx}
                                    totalCount={totalDebtorCount}
                                    type="debtor"
                                    debtorLiabilityLabel={liabilityLabelFor(isSolidary)}
                                    lockedEntityKind={lockedEntityKind}
                                    onUpdate={(id, field, value) =>
                                        onUpdateAdditionalDebtor(String(id), field, value)
                                    }
                                    onRemove={(id) => onRemoveAdditionalDebtor(String(id))}
                                />
                                {renderIndependentDebtPanel(String(d.id), isSolidary)}
                            </div>
                        );
                    })}
                </div>
            </div>

            {allowMultipleDebtors && showDebtorSolidarySplit ? (
                <div className={`${ecg.choiceRow} mt-2`}>
                    <button
                        type="button"
                        onClick={onAddIndependentDebtor}
                        className={`${ecg.choiceBtn} ${ecg.choiceBtnIdle} flex items-center justify-center gap-1.5`}
                    >
                        <UserPlus size={15} className="shrink-0 opacity-80" />
                        إضافة مدين مستقل
                    </button>
                    <button
                        type="button"
                        onClick={onAddSolidaryDebtor}
                        className={`${ecg.choiceBtn} ${ecg.choiceBtnIdle} flex items-center justify-center gap-1.5 border-[#E6C673]/20 hover:border-[#E6C673]/35`}
                    >
                        <Users size={15} className="shrink-0 text-[#E6C673]/80" />
                        إضافة مدين ضامن
                    </button>
                </div>
            ) : allowMultipleDebtors ? (
                <button type="button" onClick={onAddAnotherDebtor} className={`${ecg.addBtn} mt-2`}>
                    <Plus size={16} /> إضافة مدين آخر
                </button>
            ) : null}
        </ExecutionCreationSection>
    );
});

PartiesSection.displayName = 'PartiesSection';
