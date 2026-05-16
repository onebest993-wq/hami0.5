import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DollarSign, Shield, Building, User, FileText, Calendar, Receipt } from 'lucide-react';

type GuaranteeType = 'cash' | 'real-estate' | 'personal' | 'exempt' | null;

interface FinancialData {
    guaranteeType: GuaranteeType;
    // Cash Guarantee
    cashAmount: string;
    receiptNumber: string;
    paymentDate: string;
    // Real Estate Guarantee
    propertyNumber: string;
    propertySequence: string;
    registryOffice: string;
    estimatedValue: string;
    // Personal Guarantee
    guarantorName: string;
    guarantorId: string;
}

interface Props {
    onDataChange?: (data: FinancialData) => void;
}

/**
 * 💰 محرك الكفالات والرسوم - Financial & Guarantee Tracker
 * 
 * نظام متقدم لتتبع الكفالات الضامنة حسب القانون العراقي
 */

export const Widget_Financial_Tracker: React.FC<Props> = ({ onDataChange }) => {
    const [financialData, setFinancialData] = useState<FinancialData>({
        guaranteeType: null,
        cashAmount: '',
        receiptNumber: '',
        paymentDate: '',
        propertyNumber: '',
        propertySequence: '',
        registryOffice: '',
        estimatedValue: '',
        guarantorName: '',
        guarantorId: ''
    });

    const handleDataChange = (updates: Partial<FinancialData>) => {
        const newData = { ...financialData, ...updates };
        setFinancialData(newData);
        if (onDataChange) {
            onDataChange(newData);
        }
    };

    const getGuaranteeTypeConfig = () => {
        switch (financialData.guaranteeType) {
            case 'cash':
                return { icon: DollarSign, color: 'green', label: 'كفالة نقدية' };
            case 'real-estate':
                return { icon: Building, color: 'blue', label: 'كفالة عقارية' };
            case 'personal':
                return { icon: User, color: 'purple', label: 'كفالة شخصية' };
            case 'exempt':
                return { icon: Shield, color: 'amber', label: 'معفى من الكفالة' };
            default:
                return { icon: FileText, color: 'gray', label: 'غير محدد' };
        }
    };

    const typeConfig = getGuaranteeTypeConfig();
    const IconComponent = typeConfig.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 shadow-2xl"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                    <DollarSign className="text-amber-400" size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-bold text-xl">💰 الرسوم والكفالات الضامنة</h3>
                    <p className="text-white/60 text-xs">Fees & Legal Guarantees Tracker</p>
                </div>
            </div>

            {/* Guarantee Type Selector */}
            <div className="mb-6">
                <label className="block text-white/70 text-sm mb-3 font-bold">
                    نوع الكفالة المقدمة <span className="text-amber-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {/* Cash Option */}
                    <label className={`
                        flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border-2
                        ${financialData.guaranteeType === 'cash'
                            ? 'bg-green-900/30 border-green-500/50 shadow-lg shadow-green-500/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }
                    `}>
                        <input
                            type="radio"
                            name="guaranteeType"
                            checked={financialData.guaranteeType === 'cash'}
                            onChange={() => handleDataChange({ guaranteeType: 'cash' })}
                            className="accent-green-500 w-4 h-4"
                        />
                        <DollarSign className="text-green-400" size={20} />
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">كفالة نقدية</p>
                            <p className="text-white/50 text-xs">Cash Guarantee</p>
                        </div>
                    </label>

                    {/* Real Estate Option */}
                    <label className={`
                        flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border-2
                        ${financialData.guaranteeType === 'real-estate'
                            ? 'bg-blue-900/30 border-blue-500/50 shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }
                    `}>
                        <input
                            type="radio"
                            name="guaranteeType"
                            checked={financialData.guaranteeType === 'real-estate'}
                            onChange={() => handleDataChange({ guaranteeType: 'real-estate' })}
                            className="accent-blue-500 w-4 h-4"
                        />
                        <Building className="text-blue-400" size={20} />
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">كفالة عقارية</p>
                            <p className="text-white/50 text-xs">Real Estate</p>
                        </div>
                    </label>

                    {/* Personal Guarantor Option */}
                    <label className={`
                        flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border-2
                        ${financialData.guaranteeType === 'personal'
                            ? 'bg-purple-900/30 border-purple-500/50 shadow-lg shadow-purple-500/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }
                    `}>
                        <input
                            type="radio"
                            name="guaranteeType"
                            checked={financialData.guaranteeType === 'personal'}
                            onChange={() => handleDataChange({ guaranteeType: 'personal' })}
                            className="accent-purple-500 w-4 h-4"
                        />
                        <User className="text-purple-400" size={20} />
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">كفالة شخصية</p>
                            <p className="text-white/50 text-xs">Personal Guarantor</p>
                        </div>
                    </label>

                    {/* Exempt Option */}
                    <label className={`
                        flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border-2
                        ${financialData.guaranteeType === 'exempt'
                            ? 'bg-amber-900/30 border-amber-500/50 shadow-lg shadow-amber-500/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }
                    `}>
                        <input
                            type="radio"
                            name="guaranteeType"
                            checked={financialData.guaranteeType === 'exempt'}
                            onChange={() => handleDataChange({ guaranteeType: 'exempt' })}
                            className="accent-amber-500 w-4 h-4"
                        />
                        <Shield className="text-amber-400" size={20} />
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">معفى من الكفالة</p>
                            <p className="text-white/50 text-xs">Exempt</p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Dynamic Financial Inputs */}
            {financialData.guaranteeType && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-6 border-t border-white/10"
                >
                    {/* CASH GUARANTEE INPUTS */}
                    {financialData.guaranteeType === 'cash' && (
                        <div className="space-y-4">
                            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                                <p className="text-green-300 font-bold text-sm flex items-center gap-2 mb-2">
                                    <DollarSign size={16} />
                                    تفاصيل الكفالة النقدية
                                </p>
                                <p className="text-green-100/70 text-xs">
                                    يرجى إدخال تفاصيل الإيداع النقدي في صندوق المحكمة
                                </p>
                            </div>

                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    مبلغ التأمينات النقدية (دينار عراقي) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={financialData.cashAmount}
                                    onChange={(e) => handleDataChange({ cashAmount: e.target.value })}
                                    placeholder="مثال: 10,000,000"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-green-500/50 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    رقم وصل صندوق المحكمة <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={financialData.receiptNumber}
                                    onChange={(e) => handleDataChange({ receiptNumber: e.target.value })}
                                    placeholder="مثال: 2026/123"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-green-500/50 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    تاريخ الدفع <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={financialData.paymentDate}
                                    onChange={(e) => handleDataChange({ paymentDate: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-green-500/50 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* REAL ESTATE GUARANTEE INPUTS */}
                    {financialData.guaranteeType === 'real-estate' && (
                        <div className="space-y-4">
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                                <p className="text-blue-300 font-bold text-sm flex items-center gap-2 mb-2">
                                    <Building size={16} />
                                    تفاصيل الكفالة العقارية
                                </p>
                                <p className="text-blue-100/70 text-xs">
                                    يرجى إدخال بيانات العقار المرهون كضمان
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        رقم العقار <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={financialData.propertyNumber}
                                        onChange={(e) => handleDataChange({ propertyNumber: e.target.value })}
                                        placeholder="مثال: 456"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        التسلسل <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={financialData.propertySequence}
                                        onChange={(e) => handleDataChange({ propertySequence: e.target.value })}
                                        placeholder="مثال: 12/م الكرخ"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    دائرة التسجيل العقاري <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={financialData.registryOffice}
                                    onChange={(e) => handleDataChange({ registryOffice: e.target.value })}
                                    placeholder="مثال: دائرة التسجيل العقاري في بغداد - الكرخ"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    القيمة التقديرية للعقار (دينار عراقي) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={financialData.estimatedValue}
                                    onChange={(e) => handleDataChange({ estimatedValue: e.target.value })}
                                    placeholder="مثال: 150,000,000"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* PERSONAL GUARANTEE INPUTS */}
                    {financialData.guaranteeType === 'personal' && (
                        <div className="space-y-4">
                            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                                <p className="text-purple-300 font-bold text-sm flex items-center gap-2 mb-2">
                                    <User size={16} />
                                    تفاصيل الكفيل الضامن
                                </p>
                                <p className="text-purple-100/70 text-xs">
                                    يرجى إدخال بيانات الشخص الكفيل
                                </p>
                            </div>

                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    اسم الكفيل الضامن (الرباعي) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={financialData.guarantorName}
                                    onChange={(e) => handleDataChange({ guarantorName: e.target.value })}
                                    placeholder="مثال: أحمد محمد علي حسن"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    رقم الهوية الوطنية / البطاقة الموحدة <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={financialData.guarantorId}
                                    onChange={(e) => handleDataChange({ guarantorId: e.target.value })}
                                    placeholder="مثال: 123456789012"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* EXEMPT STATUS */}
                    {financialData.guaranteeType === 'exempt' && (
                        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-lg p-6 text-center">
                            <Shield className="text-green-400 mx-auto mb-3" size={40} />
                            <p className="text-green-300 font-bold text-lg mb-2">
                                ✅ جهة معفاة قانوناً من تقديم الكفالة
                            </p>
                            <p className="text-green-100/70 text-sm">
                                بعض الجهات الحكومية والدوائر الرسمية معفاة من شرط الكفالة الضامنة وفق القانون العراقي
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};
