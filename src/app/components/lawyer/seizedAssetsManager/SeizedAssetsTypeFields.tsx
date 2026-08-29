import React from 'react';

export function SeizedAssetsTypeFields({
    newAssetType,
    formData,
    setFormData,
}: {
    newAssetType: string;
    formData: any;
    setFormData: (v: any) => void;
}) {
    switch (newAssetType) {
            case 'حجز راتب موظف':
                return (
                    <>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">الوزارة / الدائرة</label>
                            <input
                                type="text"
                                value={formData.ministry || ''}
                                onChange={(e) => setFormData({ ...formData, ministry: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                                placeholder="مثال: وزارة الصحة"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">مقدار الاستقطاع</label>
                            <select
                                value={formData.deductionRate || '1/5'}
                                onChange={(e) => setFormData({ ...formData, deductionRate: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                            >
                                <option value="1/5">خُمس الراتب (1/5)</option>
                                <option value="1/4">ربع الراتب (1/4)</option>
                            </select>
                        </div>
                    </>
                );
            case 'حجز مركبة':
                return (
                    <>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">مديرية المرور المخاطبة</label>
                            <input
                                type="text"
                                value={formData.trafficDept || ''}
                                onChange={(e) => setFormData({ ...formData, trafficDept: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                                placeholder="مثال: مرور بغداد الرصافة"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">رقم اللوحة وصنفها</label>
                            <input
                                type="text"
                                value={formData.plateNumber || ''}
                                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                                placeholder="مثال: 12345 - بغداد نقل خاص"
                            />
                        </div>
                    </>
                );
            case 'حجز عقار':
                return (
                    <>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">دائرة التسجيل العقاري</label>
                            <input
                                type="text"
                                value={formData.registryOffice || ''}
                                onChange={(e) => setFormData({ ...formData, registryOffice: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                                placeholder="مثال: تسجيل عقار الكرخ"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">رقم العقار والمقاطعة</label>
                            <input
                                type="text"
                                value={formData.propertyNumber || ''}
                                onChange={(e) => setFormData({ ...formData, propertyNumber: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                                placeholder="مثال: 5/123 الكرادة"
                            />
                        </div>
                    </>
                );
            case 'حجز حساب مصرفي':
                return (
                    <div>
                        <label className="block text-slate-400 text-sm mb-2">اسم المصرف والفرع</label>
                        <input
                            type="text"
                            value={formData.bankName || ''}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                            placeholder="مثال: الرافدين - فرع المنصور"
                        />
                    </div>
                );
            case 'أموال منقولة/قاصة':
                return (
                    <div>
                        <label className="block text-slate-400 text-sm mb-2">وصف الأموال المنقولة</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none min-h-[80px]"
                            placeholder="مثال: أثاث منزلي، معدات مكتبية، إلخ..."
                        />
                    </div>
                );
            default:
                return null;
    }
}
