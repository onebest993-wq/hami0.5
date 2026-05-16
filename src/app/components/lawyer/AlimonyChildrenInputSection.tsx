/**
 * 🎯 V11: Children Alimony Input Section
 * 
 * هذا المكون يحتوي على الكود الصحيح لقسم إدخال نفقة الأولاد
 * 
 * ⚠️ يجب نسخ محتوى هذا الملف واستبداله في ExecutionCreationView.tsx في مكانين:
 * 1. السطر ~1821-1847
 * 2. السطر ~2038-2064
 * 
 * البحث عن: {/* Conditional: نفقة الأولاد *}
 */

import React from 'react';
import { User, DollarSign } from 'lucide-react';

// هذا الكود يجب أن يستبدل القسم القديم في ExecutionCreationView.tsx:

const ChildrenAlimonySection = ({ 
    alimonyBeneficiary, 
    alimonyChildrenCount, 
    setAlimonyChildrenCount,
    alimonyChildrenMonthly,
    setAlimonyChildrenMonthly,
    formatCurrency,
    handleAmountChange
}: any) => {
    return (
        <>
            {/* Conditional: نفقة الأولاد */}
            {(alimonyBeneficiary === 'أولاد فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
                <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-4">
                    <h5 className="text-purple-400 font-bold text-sm mb-3 flex items-center gap-2">
                        <User size={16} />
                        نفقة الأولاد
                    </h5>
                    
                    <div className="space-y-3">
                        {/* 🆕 V11: عدد الأولاد المحكوم لهم */}
                        <div>
                            <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                                عدد الأولاد المحكوم لهم
                                <span className="text-red-400">*</span>
                            </label>
                            <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                                <User className="text-gray-500 flex-shrink-0" size={16} />
                                <input
                                    type="number"
                                    min="1"
                                    value={alimonyChildrenCount}
                                    onChange={(e) => setAlimonyChildrenCount(e.target.value)}
                                    className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                                    placeholder="1"
                                />
                                <span className="text-gray-500 text-xs">ولد</span>
                            </div>
                        </div>
                        
                        {/* مقدار النفقة الشهرية للولد الواحد */}
                        <div>
                            <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                                مقدار نفقة الأولاد الشهرية (للولد الواحد)
                                <span className="text-red-400">*</span>
                            </label>
                            <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                                <DollarSign className="text-gray-500 flex-shrink-0" size={16} />
                                <input
                                    type="text"
                                    value={formatCurrency(alimonyChildrenMonthly)}
                                    onChange={(e) => handleAmountChange(e, setAlimonyChildrenMonthly)}
                                    className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                                    placeholder="0"
                                />
                                <span className="text-gray-500 text-xs">IQD</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChildrenAlimonySection;

/**
 * 📋 خطوات الاستبدال اليدوية:
 * 
 * 1. افتح ExecutionCreationView.tsx
 * 2. ابحث عن: {(alimonyBeneficiary === 'أولاد فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
 * 3. استبدل الكود الكامل (من السطر التالي حتى نهاية div المغلق) بمحتوى JSX من الأعلى
 * 4. كرر للمرة الثانية (يوجد قسمين متطابقين)
 */
