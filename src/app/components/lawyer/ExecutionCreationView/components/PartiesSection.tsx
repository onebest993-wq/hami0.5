import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PartyCard, { type PartyCardProps } from './PartyCard';

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
    phone?: string;
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
    onUpdateAdditionalCreditor: (id: string, field: 'name' | 'phone', value: string) => void;
    onUpdateCreditor: (id: number, field: string, value: string | boolean | number) => void;
    onAddDebtor: () => void;
    onRemoveAdditionalDebtor: (id: string) => void;
    onUpdateAdditionalDebtor: (id: string, field: string, value: string | boolean | number) => void;
    onUpdateDebtor: (id: number, field: string, value: string | boolean | number) => void;
    onSetIsSolidaryLiability: (v: boolean) => void;
}

export const PartiesSection: React.FC<PartiesSectionProps> = ({
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
    const hasDebtorClient =
        debtors.some((d) => d.isClient) ||
        additionalDebtorsForm.some((d) => d.isClient);

    const hasCreditorClient = creditors.some((c) => c.isClient);

    return (
        <div className="w-full px-3 py-4">
            <div className="mb-5 pb-3 border-b border-purple-500/30">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-500 to-fuchsia-600 tracking-wide drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]">
                    أطراف الإضبارة
                </h3>
            </div>

            <div className="rounded-xl border border-emerald-900/30">
                <div className="flex flex-col gap-3 p-1">
                    {creditors.map((creditor, index) => (
                        <PartyCard
                            key={creditor.id}
                            party={creditor}
                            index={index}
                            totalCount={1}
                            type="creditor"
                            onUpdate={onUpdateCreditor as PartyCardProps['onUpdate']}
                            onRemove={() => {}}
                            hasOppositeClient={hasDebtorClient}
                        />
                    ))}
                    {additionalCreditors.map((c, idx) => (
                        <div
                            key={c.id}
                            className="p-3 animate-fade-in rounded-lg border border-emerald-800/40 bg-emerald-950/15"
                        >
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-emerald-900/30">
                                <h4 className="text-emerald-400 font-bold text-sm">
                                    دائن إضافي {idx + 1}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => onRemoveAdditionalCreditor(c.id)}
                                    className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded transition-colors"
                                    title="حذف الدائن الإضافي"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="الاسم الكامل"
                                value={c.name}
                                onChange={(e) =>
                                    onUpdateAdditionalCreditor(c.id, 'name', e.target.value)
                                }
                                className="w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-lg focus:border-emerald-500 outline-none placeholder-gray-600 transition-colors mb-2"
                            />
                            <input
                                type="text"
                                placeholder="رقم الهاتف"
                                value={c.phone || ''}
                                onChange={(e) =>
                                    onUpdateAdditionalCreditor(c.id, 'phone', e.target.value)
                                }
                                className="w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-lg focus:border-emerald-500 outline-none placeholder-gray-600 transition-colors"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <button
                type="button"
                onClick={onAddCreditor}
                className="w-full mt-3 text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 hover:bg-emerald-900/40 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
                <Plus size={16} /> إضافة دائن آخر
            </button>

            <div className="py-4">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-900/40 to-transparent"></div>
            </div>

            <div className="rounded-xl border border-rose-900/30">
                <div className="flex flex-col gap-3 p-1">
                    {debtors.map((debtor, index) => (
                        <PartyCard
                            key={debtor.id}
                            party={debtor}
                            index={index}
                            totalCount={1}
                            type="debtor"
                            onUpdate={onUpdateDebtor as PartyCardProps['onUpdate']}
                            onRemove={() => {}}
                            hasOppositeClient={hasCreditorClient}
                        />
                    ))}
                    {additionalDebtorsForm.map((d, idx) => (
                        <div
                            key={d.id}
                            className="p-3 animate-fade-in rounded-lg border border-rose-800/40 bg-rose-950/15"
                        >
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-rose-900/30">
                                <h4 className="text-rose-400 font-bold text-sm">
                                    مدين إضافي {idx + 1}
                                </h4>
                                <div className="flex items-center gap-3">
                                    <label
                                        className={`flex items-center gap-2 text-xs cursor-pointer ${
                                            hasCreditorClient
                                                ? 'text-gray-600 cursor-not-allowed'
                                                : 'text-gray-400'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="accent-rose-500 cursor-pointer"
                                            checked={d.isClient || false}
                                            onChange={(e) =>
                                                onUpdateAdditionalDebtor(
                                                    d.id,
                                                    'isClient',
                                                    e.target.checked
                                                )
                                            }
                                            disabled={hasCreditorClient}
                                        />
                                        موكلي
                                    </label>
                                    <select
                                        value={d.occupation}
                                        onChange={(e) =>
                                            onUpdateAdditionalDebtor(
                                                d.id,
                                                'occupation',
                                                e.target.value
                                            )
                                        }
                                        className="bg-[#111827] border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 outline-none focus:border-rose-500"
                                    >
                                        <option value="كاسب">كاسب</option>
                                        <option value="موظف">موظف</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAdditionalDebtor(d.id)}
                                        className="text-rose-500 hover:bg-rose-500/10 p-1 rounded transition-colors"
                                        title="حذف المدين الإضافي"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="الاسم الكامل"
                                value={d.name}
                                onChange={(e) =>
                                    onUpdateAdditionalDebtor(d.id, 'name', e.target.value)
                                }
                                className="w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none placeholder-gray-600 transition-colors mb-2"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="رقم الهاتف"
                                    value={d.phone}
                                    onChange={(e) =>
                                        onUpdateAdditionalDebtor(d.id, 'phone', e.target.value)
                                    }
                                    className="w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none placeholder-gray-600 transition-colors"
                                />
                                <input
                                    type="text"
                                    placeholder="العنوان الدقيق (مطلوب للتبليغ)"
                                    value={d.address}
                                    onChange={(e) =>
                                        onUpdateAdditionalDebtor(d.id, 'address', e.target.value)
                                    }
                                    className="w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none placeholder-gray-600 transition-colors"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button
                type="button"
                onClick={onAddDebtor}
                className="w-full mt-3 text-rose-400 bg-rose-950/20 border border-rose-900/50 hover:bg-rose-900/40 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
                <Plus size={16} /> إضافة مدين آخر
            </button>

            {additionalDebtorsForm.length > 0 && (
                <div className="mt-3 space-y-2 rounded-xl border border-amber-900/30 bg-amber-950/10 p-3 text-right">
                    <p className="text-[10px] leading-relaxed text-amber-200/85">
                        يظهر هذا الخيار لأنك أضفتَ مديناً إضافياً: إن كان الحكم بالتكافل والتضامن تُعرض
                        الإضبارة لاحقاً كذمة موحّدة؛ وإلا تنتقل بين المدينين كما بين نوافذ المتصفح في لوحة
                        التنفيذ.
                    </p>
                    <label className="flex cursor-pointer items-start gap-3 text-right">
                        <input
                            type="checkbox"
                            checked={isSolidaryLiability}
                            onChange={(e) => onSetIsSolidaryLiability(e.target.checked)}
                            className="mt-0.5 accent-amber-500"
                        />
                        <span className="text-xs font-semibold leading-relaxed text-amber-100/95">
                            الحكم بالتكافل والتضامن (ذمة موحّدة بين المدينين)
                        </span>
                    </label>
                    {claimType &&
                        (() => {
                            const FINANCIAL_CLAIM_TYPES_PARTY_SPLIT = new Set([
                                'استحصال دين مالي',
                                'استخلاص دين مالي',
                                'مهر مؤجل',
                                'حجة زواج - مهر معجل',
                                'حجة زواج - مهر مؤجل',
                                'حجة وصية',
                                'حجة تخارج',
                                'حجة مخالعة',
                                'حجة إقرار بدين',
                                'نفقة عدة',
                                'تعويض عن طلاق تعسفي',
                                'استيفاء دين من بيع عقار',
                                'نفقة',
                                'أثاث زوجية',
                                'حجة نفقة اتفاقية',
                            ]);
                            return FINANCIAL_CLAIM_TYPES_PARTY_SPLIT.has(claimType) && financialSplitHint ? (
                                <p className="text-[10px] leading-relaxed text-amber-200/80 pr-1">
                                    {financialSplitHint}
                                </p>
                            ) : null;
                        })()}
                </div>
            )}
        </div>
    );
};
