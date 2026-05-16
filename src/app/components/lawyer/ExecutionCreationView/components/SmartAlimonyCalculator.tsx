import React from 'react';
import { DollarSign, User, Zap, Scale, AlertTriangle } from 'lucide-react';

interface AlimonyCalculationResult {
    baseDurationMonths: number;
    baseDurationDays: number;
    baseAccumulation: number;
    pastDurationMonths: number;
    pastAccumulation: number;
    totalAccumulated: number;
    monthlyOngoing: number;
    legalCapApplied: boolean;
    explanation: string;
}

interface SmartAlimonyCalculatorProps {
    alimonyBeneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    alimonyLawsuitDate: string;
    alimonyExecutionDate: string;
    alimonyWifeMonthly: string;
    alimonyChildrenMonthly: string;
    alimonyChildrenCount: string;
    alimonyHasPastWife: boolean;
    alimonyPastLawSystem: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري';
    alimonyPastStartDate: string;
    calculatedAlimonyNew: AlimonyCalculationResult | null;
    onBeneficiaryChange: (v: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد') => void;
    onLawsuitDateChange: (v: string) => void;
    onExecutionDateChange: (v: string) => void;
    onWifeMonthlyChange: (v: string) => void;
    onChildrenMonthlyChange: (v: string) => void;
    onChildrenCountChange: (v: string) => void;
    onHasPastWifeChange: (v: boolean) => void;
    onPastLawSystemChange: (v: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري') => void;
    onPastStartDateChange: (v: string) => void;
}

const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (!isNaN(Number(rawValue))) {
        setter(rawValue);
    }
};

export const SmartAlimonyCalculator: React.FC<SmartAlimonyCalculatorProps> = ({
    alimonyBeneficiary,
    alimonyLawsuitDate,
    alimonyExecutionDate,
    alimonyWifeMonthly,
    alimonyChildrenMonthly,
    alimonyChildrenCount,
    alimonyHasPastWife,
    alimonyPastLawSystem,
    alimonyPastStartDate,
    calculatedAlimonyNew,
    onBeneficiaryChange,
    onLawsuitDateChange,
    onExecutionDateChange,
    onWifeMonthlyChange,
    onChildrenMonthlyChange,
    onChildrenCountChange,
    onHasPastWifeChange,
    onPastLawSystemChange,
    onPastStartDateChange,
}) => {
    return (
        <div className="bg-gradient-to-br from-blue-950/30 to-indigo-950/30 border-2 border-blue-900/50 rounded-xl p-5 space-y-4 animate-fade-in">
            <div className="border-b border-blue-800/30 pb-3">
                <h4 className="text-blue-400 font-black text-lg flex items-center gap-2">
                    <DollarSign size={20} />
                    حاسبة النفقة الذكية
                </h4>
                <p className="text-gray-400 text-xs mt-1">
                    احتساب دقيق للنفقة المتراكمة + المستمرة وفقاً للقانون العراقي
                </p>
            </div>

            <div>
                <label className="text-sm font-bold text-blue-300 mb-2 block flex items-center gap-1">
                    المستفيد من النفقة
                    <span className="text-red-400">*</span>
                </label>
                <select
                    value={alimonyBeneficiary}
                    onChange={(e) => onBeneficiaryChange(e.target.value as 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد')}
                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none transition-all"
                >
                    <option value="زوجة فقط">زوجة فقط</option>
                    <option value="أولاد فقط">أولاد فقط</option>
                    <option value="زوجة وأولاد">زوجة وأولاد</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="text-sm font-bold text-blue-300 mb-2 block flex items-center gap-1">
                        تاريخ إقامة الدعوى
                        <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        value={alimonyLawsuitDate}
                        onChange={(e) => onLawsuitDateChange(e.target.value)}
                        className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none"
                        style={{ direction: 'ltr', textAlign: 'right' }}
                    />
                </div>
                <div>
                    <label className="text-sm font-bold text-blue-300 mb-2 block flex items-center gap-1">
                        تاريخ احتساب التنفيذ
                        <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        value={alimonyExecutionDate}
                        onChange={(e) => onExecutionDateChange(e.target.value)}
                        className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none"
                        style={{ direction: 'ltr', textAlign: 'right' }}
                    />
                </div>
            </div>

            {(alimonyBeneficiary === 'زوجة فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
                <div className="bg-pink-950/20 border border-pink-800/30 rounded-lg p-4 space-y-3">
                    <h5 className="text-pink-400 font-bold text-sm flex items-center gap-2">
                        <User size={16} />
                        نفقة الزوجة
                    </h5>

                    <div>
                        <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                            مقدار نفقة الزوجة الشهرية (دينار)
                            <span className="text-red-400">*</span>
                        </label>
                        <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-pink-500">
                            <DollarSign className="text-gray-500 flex-shrink-0" size={16} />
                            <input
                                type="text"
                                value={formatCurrency(alimonyWifeMonthly)}
                                onChange={(e) => handleAmountChange(e, onWifeMonthlyChange)}
                                className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                                placeholder="0"
                            />
                            <span className="text-gray-500 text-xs">IQD</span>
                        </div>
                    </div>

                    <div className="border-t border-pink-800/20 pt-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alimonyHasPastWife}
                                onChange={(e) => onHasPastWifeChange(e.target.checked)}
                                className="w-5 h-5 accent-pink-500 rounded"
                            />
                            <span className="text-white font-medium text-sm">هل حُكم للزوجة بنفقة ماضية؟</span>
                        </label>
                    </div>

                    {alimonyHasPastWife && (
                        <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 space-y-3 animate-fade-in">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="text-amber-500" size={16} />
                                <h6 className="text-amber-400 font-bold text-xs">القانون المطبق على النفقة الماضية</h6>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-amber-400 mb-2 block">القانون المطبق على العقد *</label>
                                <select
                                    value={alimonyPastLawSystem}
                                    onChange={(e) => onPastLawSystemChange(e.target.value as 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري')}
                                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg text-sm focus:border-amber-500 outline-none"
                                >
                                    <option value="قانون الأحوال الشخصية 1959">قانون الأحوال الشخصية 1959 (حد أقصى سنة واحدة)</option>
                                    <option value="الفقه الجعفري">الفقه الجعفري (بدون حد أقصى)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-amber-400 mb-2 block">تاريخ استحقاق النفقة الماضية *</label>
                                <input
                                    type="date"
                                    value={alimonyPastStartDate}
                                    onChange={(e) => onPastStartDateChange(e.target.value)}
                                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none"
                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                />
                            </div>

                            {calculatedAlimonyNew?.legalCapApplied && (
                                <div className="bg-red-950/20 border border-red-800/30 rounded p-2">
                                    <p className="text-red-400 text-[10px] font-bold flex items-center gap-1">
                                        <AlertTriangle size={12} />
                                        {calculatedAlimonyNew.explanation}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {(alimonyBeneficiary === 'أولاد فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
                <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-4">
                    <h5 className="text-purple-400 font-bold text-sm mb-3 flex items-center gap-2">
                        <User size={16} />
                        نفقة الأولاد
                    </h5>

                    <div>
                        <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                            مقدار نفقة الأولاد الشهرية (دينار)
                            <span className="text-red-400">*</span>
                        </label>
                        <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                            <DollarSign className="text-gray-500 flex-shrink-0" size={16} />
                            <input
                                type="text"
                                value={formatCurrency(alimonyChildrenMonthly)}
                                onChange={(e) => handleAmountChange(e, onChildrenMonthlyChange)}
                                className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                                placeholder="0"
                            />
                            <span className="text-gray-500 text-xs">IQD</span>
                        </div>
                    </div>
                </div>
            )}

            {calculatedAlimonyNew && (
                <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-4 space-y-3">
                    <h5 className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                        <Scale size={16} />
                        النتائج الفورية
                    </h5>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">المدة (أيام):</span>
                            <span className="text-white font-bold">{calculatedAlimonyNew.baseDurationDays} يوم</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">المدة (أشهر):</span>
                            <span className="text-white font-bold">{calculatedAlimonyNew.baseDurationMonths.toFixed(1)} شهر</span>
                        </div>

                        {calculatedAlimonyNew.pastAccumulation > 0 && (
                            <>
                                <div className="border-t border-emerald-800/20 pt-2 mt-2"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-amber-400 text-xs">النفقة الماضية للزوجة:</span>
                                    <span className="text-amber-400 font-bold font-mono">{formatCurrency(calculatedAlimonyNew.pastAccumulation.toString())} د.ع</span>
                                </div>
                            </>
                        )}

                        <div className="border-t border-emerald-800/20 pt-2 mt-2"></div>

                        <div className="flex items-center justify-between text-base">
                            <span className="text-red-300 font-bold">إجمالي النفقة المتراكمة:</span>
                            <span className="text-red-400 font-black font-mono text-lg">{formatCurrency(calculatedAlimonyNew.totalAccumulated.toString())} د.ع</span>
                        </div>

                        <div className="flex items-center justify-between bg-emerald-900/20 p-2 rounded">
                            <span className="text-emerald-300 font-bold text-xs">النفقة المستمرة (شهرياً):</span>
                            <span className="text-emerald-400 font-bold font-mono">+{formatCurrency(calculatedAlimonyNew.monthlyOngoing.toString())} د.ع</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
