import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, X } from 'lucide-react';
import type { ThirdPartyModalProps, ThirdParty } from '../types';

export const ThirdPartyModal = ({ isOpen, onClose, onSave, currentStage }: ThirdPartyModalProps) => {
    const [name, setName] = useState('');
    const [entryType, setEntryType] = useState('voluntary'); 
    const [role, setRole] = useState('joining'); 
    const [alignment, setAlignment] = useState('independent'); 

    useEffect(() => {
        if (entryType === 'voluntary') setRole('joining');
        else setRole('request');
    }, [entryType]);

    const isAppeal = currentStage?.includes('استئناف') || currentStage?.toLowerCase().includes('appeal');
    const isOffensiveDisabled = isAppeal && entryType === 'voluntary';

    const handleSave = () => {
        if (!name) return;
        
        let finalRoleLabel = '';
        if (entryType === 'voluntary') {
            finalRoleLabel = role === 'joining' ? 'متدخل انضمامي' : 'متدخل هجومي';
        } else {
            finalRoleLabel = role === 'request' ? 'مدخل بطلب الخصم' : 'مدخل بقرار المحكمة';
        }

        onSave({
            id: Date.now(),
            name,
            type: 'thirdParty',
            roleLabel: finalRoleLabel,
            entryType,
            role,
            alignment,
            hasLawyer: false,
            lawyerName: '',
            lawyerPhone: '',
            isMyOffice: false
        } as ThirdParty);
        onClose();
        setName('');
        setEntryType('voluntary');
        setRole('joining');
        setAlignment('independent');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-['Tajawal']">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
            >
                <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <UserPlus size={18} className="text-amber-500" />
                        إضافة شخص ثالث
                    </h3>
                    <button type="button" onClick={onClose}><X size={18} className="text-gray-400 hover:text-red-500" /></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">الاسم الكامل</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-10 border border-gray-300 rounded-lg px-3 focus:border-amber-500 outline-none transition-colors"
                            placeholder="اسم الشخص الثالث..."
                            autoFocus
                        />
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">إلغاء</button>
                        <button type="button" onClick={handleSave} className="px-6 py-2 bg-[#0B1021] text-white rounded-lg text-sm font-bold hover:bg-black transition-all shadow-lg shadow-black/10">
                            تأكيد الإضافة
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
