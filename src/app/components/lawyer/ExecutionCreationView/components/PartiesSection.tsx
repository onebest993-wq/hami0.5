import React from 'react';
import { Plus } from 'lucide-react';
import PartyCard, { type PartyCardProps } from './PartyCard';
import { ecg } from './executionCreationGlassUi';
import { ExecutionCreationSection } from './ExecutionCreationSection';
import { isFinancialClaimForPartySplit } from '../hooks/executionFormUtils';

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
}

interface PartiesSectionProps {
    creditors: CreditorData[];
    additionalCreditors: AdditionalCreditor[];
    debtors: DebtorData[];
    additionalDebtorsForm: AdditionalDebtor[];
    isSolidaryLiability: boolean;
    financialSplitHint: string | null;
    claimType: string;
    onAddCreditor: () => void;
    onRemoveAdditionalCreditor: (id: string) => void;
    onUpdateAdditionalCreditor: (id: string, field: string, value: string | boolean | number) => void;
    onUpdateCreditor: (id: number, field: string, value: string | boolean | number) => void;
    onAddDebtor: () => void;
    onRemoveAdditionalDebtor: (id: string) => void;
    onUpdateAdditionalDebtor: (id: string, field: string, value: string | boolean | number) => void;
    onUpdateDebtor: (id: number, field: string, value: string | boolean | number) => void;
    onSetIsSolidaryLiability: (v: boolean) => void;
}

export const PartiesSection: React.FC<PartiesSectionProps> = React.memo(({
    creditors,
    additionalCreditors,
    debtors,
    additionalDebtorsForm,
    isSolidaryLiability,
    financialSplitHint,
    claimType,
    onAddCreditor,
    onRemoveAdditionalCreditor,
    onUpdateAdditionalCreditor,
    onUpdateCreditor,
    onAddDebtor,
    onRemoveAdditionalDebtor,
    onUpdateAdditionalDebtor,
    onUpdateDebtor,
    onSetIsSolidaryLiability,
}) => {
    const totalCreditorCount = creditors.length + additionalCreditors.length;
    const totalDebtorCount = debtors.length + additionalDebtorsForm.length;
    const showFinancialSplitHint =
        isFinancialClaimForPartySplit(claimType) && Boolean(financialSplitHint);

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
                    {debtors.map((debtor, index) => (
                        <PartyCard
                            key={debtor.id}
                            party={debtor}
                            index={index}
                            totalCount={totalDebtorCount}
                            type="debtor"
                            onUpdate={onUpdateDebtor as PartyCardProps['onUpdate']}
                            onRemove={() => {}}
                        />
                    ))}
                    {additionalDebtorsForm.map((d, idx) => (
                        <PartyCard
                            key={d.id}
                            party={d}
                            index={debtors.length + idx}
                            totalCount={totalDebtorCount}
                            type="debtor"
                            onUpdate={(id, field, value) =>
                                onUpdateAdditionalDebtor(String(id), field, value)
                            }
                            onRemove={(id) => onRemoveAdditionalDebtor(String(id))}
                        />
                    ))}
                </div>
            </div>

            <button type="button" onClick={onAddDebtor} className={ecg.addBtn}>
                <Plus size={16} /> إضافة مدين آخر
            </button>

            {additionalDebtorsForm.length > 0 ? (
                <div className={ecg.hintPanel}>
                    <p className={ecg.hintText}>
                        يظهر هذا الخيار لأنك أضفتَ مديناً إضافياً: إن كان الحكم بالتكافل والتضامن تُعرض
                        الإضبارة لاحقاً كذمة موحّدة؛ وإلا تنتقل بين المدينين كما بين نوافذ المتصفح في لوحة
                        التنفيذ.
                    </p>
                    <label className="flex cursor-pointer items-start gap-3 text-right">
                        <input
                            type="checkbox"
                            checked={isSolidaryLiability}
                            onChange={(e) => onSetIsSolidaryLiability(e.target.checked)}
                            className="mt-0.5 accent-[#E6C673]"
                        />
                        <span className="text-xs font-semibold leading-relaxed text-[#F0DFA8]/95">
                            الحكم بالتكافل والتضامن (ذمة موحّدة بين المدينين)
                        </span>
                    </label>
                    {showFinancialSplitHint ? (
                        <p className={`${ecg.hintText} pr-1`}>{financialSplitHint}</p>
                    ) : null}
                </div>
            ) : null}
        </ExecutionCreationSection>
    );
});

PartiesSection.displayName = 'PartiesSection';
