/**
 * 🎯 V11 - READY TO COPY CODE
 * 
 * انسخ الكود أدناه واستبدل به القسم القديم في ExecutionCreationView.tsx
 * 
 * المواقع:
 * - السطر 1821-1847 (القسم الأول)
 * - السطر 2038-2064 (القسم الثاني)
 */

// =====================================================
// 📋 الكود الجاهز للنسخ - استخدمه في المكانين
// =====================================================

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

/**
 * =====================================================
 * 📝 طريقة الاستخدام خطوة بخطوة:
 * =====================================================
 * 
 * 1. افتح ملف: /src/app/components/lawyer/ExecutionCreationView.tsx
 * 
 * 2. ابحث عن السطر: {(alimonyBeneficiary === 'أولاد فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
 *    (سيظهر مرتين - في السطر ~1822 و ~2039)
 * 
 * 3. للقسم الأول (السطر ~1821-1847):
 *    - حدد من السطر 1821 إلى 1847 (كامل البلوك)
 *    - احذفه
 *    - الصق الكود أعلاه (من السطر 12 إلى 63)
 * 
 * 4. للقسم الثاني (السطر ~2038-2064):
 *    - حدد من السطر 2038 إلى 2064 (كامل البلوك)
 *    - احذفه
 *    - الصق نفس الكود مرة أخرى
 * 
 * 5. احفظ الملف (Ctrl+S)
 * 
 * 6. تحقق من النتيجة:
 *    - افتح صفحة إنشاء ملف تنفيذ
 *    - اختر "نفقة" أو "حجة نفقة"
 *    - يجب أن تظهر حقلين:
 *      ✓ عدد الأولاد المحكوم لهم
 *      ✓ مقدار نفقة الأولاد الشهرية (للولد الواحد)
 * 
 * =====================================================
 * ✅ النظام سيكون 100% مكتمل بعد هذا!
 * =====================================================
 */
