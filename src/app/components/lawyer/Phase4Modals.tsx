import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, X, AlertCircle, Percent, Gavel, Calendar } from 'lucide-react';

interface SalaryCalcModalProps {
    isOpen: boolean;
    onClose: () => void;
    salaryCalcForm: {
        totalSalary: string;
        isAlimony: boolean;
    };
    setSalaryCalcForm: (form: any) => void;
    salaryCalcResults: any;
    formatCurrency: (amount: number) => string;
}

export const SalaryCalcModal: React.FC<SalaryCalcModalProps> = ({
    isOpen,
    onClose,
    salaryCalcForm,
    setSalaryCalcForm,
    salaryCalcResults,
    formatCurrency
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Calculator className="text-indigo-400" />
                                ⚖️ حاسبة الاستقطاع القانوني للراتب
                            </h3>
                            <button type="button" 
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-300"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-slate-400 text-sm font-bold block mb-2">
                                    الراتب الكلي للموظف مع المخصصات (دينار)
                                </label>
                                <input 
                                    type="text" 
                                    value={salaryCalcForm.totalSalary}
                                    onChange={(e) => setSalaryCalcForm({...salaryCalcForm, totalSalary: e.target.value})}
                                    placeholder="مثال: 850000"
                                    className="bg-slate-800 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700 font-mono text-lg"
                                />
                            </div>

                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={salaryCalcForm.isAlimony}
                                        onChange={(e) => setSalaryCalcForm({...salaryCalcForm, isAlimony: e.target.checked})}
                                        className="mt-1 w-5 h-5 accent-emerald-500"
                                    />
                                    <div>
                                        <span className="text-white font-bold block mb-1">
                                            هل الدين هو نفقة محكوم بها (غير متراكمة)؟
                                        </span>
                                        <span className="text-slate-400 text-xs">
                                            (استثناء المادة 82 - ثالثاً)
                                        </span>
                                    </div>
                                </label>
                            </div>

                            {salaryCalcForm.totalSalary && parseFloat(salaryCalcForm.totalSalary.replace(/,/g, '')) > 0 && (
                                <div className="space-y-4">
                                    {salaryCalcForm.isAlimony ? (
                                        <div className="bg-emerald-500/10 border-2 border-emerald-500 rounded-xl p-5">
                                            <div className="flex items-start gap-3 mb-4">
                                                <AlertCircle size={24} className="text-emerald-400 flex-shrink-0 mt-1" />
                                                <div>
                                                    <h4 className="text-emerald-400 font-black text-lg mb-2">
                                                        {salaryCalcResults.message}
                                                    </h4>
                                                    <div className="text-3xl font-bold text-emerald-300 font-mono mb-3">
                                                        {formatCurrency(salaryCalcResults.allowedAmount)} <span className="text-base">د.ع</span>
                                                    </div>
                                                    <p className="text-emerald-200 text-sm leading-relaxed">
                                                        * {salaryCalcResults.legalNote}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-500/10 border-2 border-blue-500 rounded-xl p-5">
                                            <div className="flex items-start gap-3 mb-4">
                                                <Percent size={24} className="text-blue-400 flex-shrink-0 mt-1" />
                                                <div>
                                                    <h4 className="text-blue-400 font-black text-lg mb-2">
                                                        {salaryCalcResults.message}
                                                    </h4>
                                                    <div className="text-3xl font-bold text-blue-300 font-mono mb-1">
                                                        {formatCurrency(salaryCalcResults.allowedAmount)} <span className="text-base">د.ع</span>
                                                    </div>
                                                    <div className="text-sm text-blue-200 mb-3">
                                                        ({salaryCalcResults.percentage}% من الراتب الكلي)
                                                    </div>
                                                    <p className="text-blue-200 text-sm leading-relaxed">
                                                        * {salaryCalcResults.legalNote}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!salaryCalcForm.totalSalary && (
                                <div className="text-center py-8 text-slate-500">
                                    أدخل الراتب الكلي لعرض الحسابات
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

interface AuctionCalcModalProps {
    isOpen: boolean;
    onClose: () => void;
    auctionCalcForm: {
        assetType: string;
        estimatedValue: string;
        publishDate: string;
    };
    setAuctionCalcForm: (form: any) => void;
    auctionCalcResults: any;
    formatCurrency: (amount: number) => string;
    formatDateArabic: (date: string) => string;
    onGenerateSchedule: () => void;
}

export const AuctionCalcModal: React.FC<AuctionCalcModalProps> = ({
    isOpen,
    onClose,
    auctionCalcForm,
    setAuctionCalcForm,
    auctionCalcResults,
    formatCurrency,
    formatDateArabic,
    onGenerateSchedule
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Gavel className="text-amber-400" />
                                🔨 محرك المزايدة العلنية والضم
                            </h3>
                            <button type="button" 
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-300"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-slate-400 text-sm font-bold block mb-2">
                                    نوع المال المحجوز
                                </label>
                                <select 
                                    value={auctionCalcForm.assetType}
                                    onChange={(e) => setAuctionCalcForm({...auctionCalcForm, assetType: e.target.value})}
                                    className="bg-slate-800 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-700"
                                >
                                    <option value="عقار (المواد 97-98)">عقار (المواد 97-98)</option>
                                    <option value="منقول / سيارة (المادة 73)">منقول / سيارة (المادة 73)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm font-bold block mb-2">
                                    القيمة المقدرة من الخبراء للمال المحجوز (دينار)
                                </label>
                                <input 
                                    type="text" 
                                    value={auctionCalcForm.estimatedValue}
                                    onChange={(e) => setAuctionCalcForm({...auctionCalcForm, estimatedValue: e.target.value})}
                                    placeholder="مثال: 50000000"
                                    className="bg-slate-800 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-700 font-mono text-lg"
                                />
                            </div>

                            {auctionCalcForm.estimatedValue && parseFloat(auctionCalcForm.estimatedValue.replace(/,/g, '')) > 0 && (
                                <div className="space-y-4 bg-slate-950/50 rounded-xl p-5 border border-slate-800">
                                    <h4 className="text-amber-400 font-bold text-lg mb-4 flex items-center gap-2">
                                        <Calculator size={20} />
                                        التفاصيل المالية للمزايدة
                                    </h4>

                                    <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-700">
                                        <div>
                                            <span className="text-slate-400 text-sm block">مبلغ التأمينات المطلوب (10%)</span>
                                            <span className="text-xs text-slate-500">يُدفع لدى التسجيل</span>
                                        </div>
                                        <span className="text-2xl font-bold text-white font-mono">
                                            {formatCurrency(auctionCalcResults.deposit)} <span className="text-sm text-slate-400">د.ع</span>
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-rose-950/20 rounded-lg border border-rose-500/30">
                                        <div>
                                            <span className="text-rose-400 text-sm block font-bold">الحد الأدنى (70%)</span>
                                            <span className="text-xs text-rose-300">* لا تُحال بأقل - مادة 73/97</span>
                                        </div>
                                        <span className="text-2xl font-bold text-rose-400 font-mono">
                                            {formatCurrency(auctionCalcResults.minimumBid)} <span className="text-sm">د.ع</span>
                                        </span>
                                    </div>

                                    {auctionCalcForm.assetType.includes('عقار') && (
                                        <div className="flex justify-between items-center p-3 bg-emerald-950/20 rounded-lg border border-emerald-500/30">
                                            <div>
                                                <span className="text-emerald-400 text-sm block font-bold">هدف الجلسة الأولى (80%)</span>
                                                <span className="text-xs text-emerald-300">* تمديد 15 يوماً إن لم يتحقق - المادة 98</span>
                                            </div>
                                            <span className="text-2xl font-bold text-emerald-400 font-mono">
                                                {formatCurrency(auctionCalcResults.targetFirstSession!)} <span className="text-sm">د.ع</span>
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-700">
                                        <div>
                                            <span className="text-slate-400 text-sm block">حد الضم (5%)</span>
                                            <span className="text-xs text-slate-500">للمزايدة الجديدة</span>
                                        </div>
                                        <span className="text-2xl font-bold text-white font-mono">
                                            {formatCurrency(auctionCalcResults.joinMinimum)} <span className="text-sm text-slate-400">د.ع</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {auctionCalcForm.estimatedValue && parseFloat(auctionCalcForm.estimatedValue.replace(/,/g, '')) > 0 && (
                                <div className="space-y-4 bg-blue-950/20 rounded-xl p-5 border border-blue-500/30">
                                    <h4 className="text-blue-400 font-bold text-lg mb-4 flex items-center gap-2">
                                        <Calendar size={20} />
                                        جدولة المزايدة
                                    </h4>

                                    <div>
                                        <label className="text-slate-400 text-sm font-bold block mb-2">
                                            تاريخ النشر في الصحف
                                        </label>
                                        <input 
                                            type="date" 
                                            value={auctionCalcForm.publishDate}
                                            onChange={(e) => setAuctionCalcForm({...auctionCalcForm, publishDate: e.target.value})}
                                            className="bg-slate-800 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                                        <div>
                                            <span className="text-blue-400 text-sm block font-bold">تاريخ المزايدة</span>
                                            <span className="text-xs text-blue-300">
                                                ({auctionCalcForm.assetType.includes('عقار') ? '30 يوماً للعقار' : '10 أيام للمنقول'})
                                            </span>
                                        </div>
                                        <span className="text-xl font-bold text-blue-300">
                                            {formatDateArabic(auctionCalcResults.auctionDate)}
                                        </span>
                                    </div>

                                    <button type="button" 
                                        onClick={onGenerateSchedule}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                                    >
                                        <Calendar size={20} />
                                        📅 توليد جدول المزايدة
                                    </button>
                                </div>
                            )}

                            {!auctionCalcForm.estimatedValue && (
                                <div className="text-center py-8 text-slate-500">
                                    أدخل القيمة المقدرة لعرض الحسابات
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
