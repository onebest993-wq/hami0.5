import React, { useState } from 'react';
import { Lock } from '@/app/components/ui/icons/Lock';
import { X } from '@/app/components/ui/icons/X';




import type { AddProvisionalOrderModalProps } from '../../smartFile/modalFormTypes';
import { SMART_MODAL_MOTION_ZOOM_ENTER } from '../../smartFile/smartModalMotionClasses';

export const AddProvisionalOrderModal = ({ isOpen, onClose, onConfirm, currentParties = [] }: AddProvisionalOrderModalProps) => {
    const [orderType, setOrderType] = useState('');
    const [targetParty, setTargetParty] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setOrderType('');
            setTargetParty('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!orderType || !targetParty) return;
        onConfirm({ type: orderType, targetParty });
        onClose();
    };

    if (!isOpen) return null;

    const ORDER_TYPES = ['حجز احتياطي', 'منع سفر', 'قضاء مستعجل', 'وضع اليد', 'منع التعرض'];

    // Combine all parties for selection
    const allParties = currentParties.map((p: any) => p.name).filter(Boolean);

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/62 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className={`bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-lg ${SMART_MODAL_MOTION_ZOOM_ENTER}`}>
                <div className="bg-rose-900/80 border-b border-rose-500/30 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Lock size={18} className="text-rose-400" />
                        إصدار قرار ولائي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/60 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    {/* نوع القرار */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            نوع القرار <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={orderType} 
                            onChange={e => setOrderType(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500" 
                            dir="rtl"
                            autoFocus
                        >
                            <option value="">-- اختر نوع القرار --</option>
                            {ORDER_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* الخصم المستهدف */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            الخصم المستهدف <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={targetParty} 
                            onChange={e => setTargetParty(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500" 
                            dir="rtl"
                        >
                            <option value="">-- اختر الخصم --</option>
                            {allParties.map((name: string, idx: number) => (
                                <option key={idx} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!orderType || !targetParty} 
                        className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        إصدار القرار 🔒
                    </button>
                </div>
            </div>
        </div>
    );
};


