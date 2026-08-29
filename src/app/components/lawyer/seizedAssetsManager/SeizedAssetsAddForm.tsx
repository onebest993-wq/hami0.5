import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { EXEC_MODAL_TOUCH_TARGET } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { seizedAssetTypes } from './seizedAssetsTypeCatalog';
import { SeizedAssetsTypeFields } from './SeizedAssetsTypeFields';

export function SeizedAssetsAddForm({
    showAddForm,
    onShowAddForm,
    newAssetType,
    setNewAssetType,
    formData,
    setFormData,
    onCancel,
    onAdd,
}: {
    showAddForm: boolean;
    onShowAddForm: () => void;
    newAssetType: string;
    setNewAssetType: (v: string) => void;
    formData: any;
    setFormData: (v: any) => void;
    onCancel: () => void;
    onAdd: () => void;
}) {
    return (
        <>
            {!showAddForm && (
                <button type="button"
                    onClick={onShowAddForm}
                    className="w-full mb-6 py-4 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3"
                >
                    <Plus size={24} />
                    + إضافة طلب حجز أموال جديد
                </button>
            )}

            {showAddForm && (
                <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-6 mb-6">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-amber-500" />
                        إضافة طلب حجز جديد
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">نوع المال المطلوب حجزه</label>
                            <select
                                value={newAssetType}
                                onChange={(e) => {
                                    setNewAssetType(e.target.value);
                                    setFormData({});
                                }}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                            >
                                {seizedAssetTypes.map((type) => (
                                    <option key={type.value} value={type.value}>{type.value}</option>
                                ))}
                            </select>
                        </div>

                        <SeizedAssetsTypeFields
                            newAssetType={newAssetType}
                            formData={formData}
                            setFormData={setFormData}
                        />

                        <div className="flex gap-3 pt-4">
                            <button type="button"
                                onClick={onCancel}
                                className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 py-3 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors`}
                            >
                                إلغاء
                            </button>
                            <button type="button"
                                onClick={onAdd}
                                className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold transition-colors shadow-lg flex items-center justify-center gap-2`}
                            >
                                <CheckCircle size={20} />
                                حفظ وإضافة للمحجوزات
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
