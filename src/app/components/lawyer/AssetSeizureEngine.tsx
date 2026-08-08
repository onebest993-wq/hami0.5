import React, { useState } from 'react';
import { Lock, Plus, X, Building2, Car, Home, CreditCard, Package, Gavel, Clock, CheckCircle } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface Seizure {
    id: string;
    type: 'salary' | 'vehicle' | 'property' | 'bank' | 'movable';
    department: string;
    status: 'pending' | 'seized';
    dateAdded: string;
}

interface AssetSeizureEngineProps {
    onUpdate?: (seizures: Seizure[]) => void;
}

/**
 * 🔒 Asset Seizure Engine Component
 * محرك الحجز التنفيذي وتتبع الأموال
 */
export const AssetSeizureEngine: React.FC<AssetSeizureEngineProps> = ({ onUpdate }) => {
    const [seizures, setSeizures] = useState<Seizure[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<Seizure['type']>('salary');
    const [department, setDepartment] = useState('');

    const seizureTypes = [
        { value: 'salary', label: 'حجز راتب موظف', icon: Building2, color: 'indigo' },
        { value: 'vehicle', label: 'حجز مركبة', icon: Car, color: 'blue' },
        { value: 'property', label: 'حجز عقار', icon: Home, color: 'emerald' },
        { value: 'bank', label: 'حجز حساب مصرفي', icon: CreditCard, color: 'purple' },
        { value: 'movable', label: 'حجز أموال منقولة', icon: Package, color: 'amber' }
    ];

    const handleAddSeizure = () => {
        if (!department.trim()) {
            SmartToast.error('يرجى إدخال اسم الدائرة المخاطبة');
            return;
        }

        const newSeizure: Seizure = {
            id: Date.now().toString(),
            type: selectedType,
            department: department.trim(),
            status: 'pending',
            dateAdded: new Date().toLocaleDateString('ar-EG')
        };

        const updated = [...seizures, newSeizure];
        setSeizures(updated);
        onUpdate?.(updated);
        
        // Reset
        setDepartment('');
        setIsModalOpen(false);
    };

    const toggleStatus = (id: string) => {
        const updated = seizures.map(s => 
            s.id === id 
                ? { ...s, status: s.status === 'pending' ? 'seized' as const : 'pending' as const }
                : s
        );
        setSeizures(updated);
        onUpdate?.(updated);
    };

    const getTypeInfo = (type: Seizure['type']) => {
        return seizureTypes.find(t => t.value === type)!;
    };

    return (
        <div className="w-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-amber-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-2xl flex items-center gap-3">
                    <Lock className="text-amber-500" size={28} />
                    محرك الحجز التنفيذي وتتبع الأموال
                </h2>
                <button type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <Plus size={20} />
                    إضافة طلب حجز أموال
                </button>
            </div>

            {/* SEIZURE CARDS GRID */}
            {seizures.length === 0 ? (
                <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
                    <Lock className="text-slate-600 mx-auto mb-4" size={48} />
                    <p className="text-slate-400 text-lg">لم يتم إضافة أي طلبات حجز بعد</p>
                    <p className="text-slate-500 text-sm mt-2">ابدأ بإضافة أول طلب حجز باستخدام الزر أعلاه</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {seizures.map((seizure) => {
                        const typeInfo = getTypeInfo(seizure.type);
                        const IconComponent = typeInfo.icon;
                        
                        return (
                            <div 
                                key={seizure.id} 
                                className={`bg-slate-800/70 border-2 ${
                                    seizure.status === 'seized' 
                                        ? 'border-red-500/50' 
                                        : 'border-slate-700'
                                } rounded-xl p-5 transition-all hover:shadow-xl`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full bg-${typeInfo.color}-500/20 flex items-center justify-center`}>
                                            <IconComponent className={`text-${typeInfo.color}-500`} size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg">{typeInfo.label}</h3>
                                            <p className="text-slate-400 text-sm">تاريخ الإضافة: {seizure.dateAdded}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                                    <p className="text-slate-400 text-xs mb-1">الدائرة المخاطبة:</p>
                                    <p className="text-white font-bold">{seizure.department}</p>
                                </div>

                                {/* STATUS TOGGLE */}
                                <div className="mb-4">
                                    <button type="button"
                                        onClick={() => toggleStatus(seizure.id)}
                                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                            seizure.status === 'pending'
                                                ? 'bg-amber-600/30 border-2 border-amber-500/50 text-amber-300 hover:bg-amber-600/50'
                                                : 'bg-red-600/30 border-2 border-red-500/50 text-red-300 hover:bg-red-600/50'
                                        }`}
                                    >
                                        {seizure.status === 'pending' ? (
                                            <>
                                                <Clock size={16} />
                                                ⏳ قيد إرسال الكتاب
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={16} />
                                                🔴 تم وضع إشارة الحجز
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* AUCTION BUTTON (Disabled until seized) */}
                                <button type="button"
                                    disabled={seizure.status !== 'seized'}
                                    className={`w-full py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                        seizure.status === 'seized'
                                            ? 'bg-gradient-to-r from-red-700 to-crimson-700 hover:from-red-800 hover:to-crimson-800 text-white shadow-lg cursor-pointer'
                                            : 'bg-slate-700/30 text-slate-600 cursor-not-allowed'
                                    }`}
                                >
                                    <Gavel size={20} />
                                    🔨 طلب بيع بالمزايدة العلنية
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ADD SEIZURE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold text-xl flex items-center gap-2">
                                <Plus className="text-amber-500" size={24} />
                                إضافة طلب حجز جديد
                            </h3>
                            <button type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* TYPE SELECTOR */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2 font-bold">
                                    نوع الحجز:
                                </label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value as Seizure['type'])}
                                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                                >
                                    {seizureTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* DEPARTMENT INPUT */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2 font-bold">
                                    اسم الدائرة المخاطبة:
                                </label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    placeholder="مثال: مديرية مرور بغداد"
                                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button type="button"
                                onClick={handleAddSeizure}
                                className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
                            >
                                ✅ حفظ وإضافة الطلب
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
