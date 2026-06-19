import React, { useState } from 'react';
import {
    AlertTriangle,
    Check,
    Gavel,
    Lock,
    PauseCircle,
    RotateCcw,
    Trash2,
    X,
} from 'lucide-react';
import type { AffiliationSide, Party, ThirdPartyEntryMode } from '../../../LawyerShared';
import { TimelineEvent } from '../../../LawyerShared';
import {
    affiliationSideLabel,
    groupPartiesBySide,
} from '../../smartFile/incidentalCaseLinking';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    GLASS_BTN,
    GLASS_CHIP,
    GLASS_CHIP_ACTIVE,
    GLASS_CLOSE,
    GLASS_FIELD,
    GLASS_MODAL_HEADER,
    GLASS_MODAL_OVERLAY,
    GLASS_MODAL_SHELL,
    GLASS_SELECT,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../../smartFile/moroccanGlassShell';
import type { TransitionModalProps } from '../../smartFile/modalFormTypes';

export const TransitionModal = ({ isOpen, onClose, onConfirm, nextStageName, currentParties = [] }: TransitionModalProps) => {
    const [newStage, setNewStage] = useState('');
    const [newCourt, setNewCourt] = useState('');
    const [newCaseNo, setNewCaseNo] = useState('');
    const [appellant, setAppellant] = useState(''); // من هو مقدم الطعن
    const [result, setResult] = useState(''); // منطوق القرار
    const [date, setDate] = useState(getLocalTodayYmd());

    React.useEffect(() => {
        if (isOpen) {
            // Reset on open
            setNewStage('');
            setNewCourt('');
            setNewCaseNo('');
            setAppellant('');
            setResult('');
            setDate(getLocalTodayYmd());
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!newStage || !newCourt || !newCaseNo || !appellant || !result) return;
        
        onConfirm({
            newStage,
            newCourt,
            newCaseNo,
            appellant,
            result,
            date
        });
        
        onClose();
    };

    if (!isOpen) return null;

    // Extract party names for the appellant dropdown
    const party1 = currentParties[0] || { name: 'الطرف الأول' };
    const party2 = currentParties[1] || { name: 'الطرف الثاني' };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-[#E6C673] to-[#F4D03F] p-4 text-[#0F172A] flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Gavel size={18}/> الانتقال لمرحلة تقاضي جديدة
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <p className="text-white/80 text-sm border-r-4 border-[#E6C673] pr-3">
                        سيتم أرشفة المرحلة الحالية بالكامل (المحكمة، القاضي، الأطراف، جميع الإجراءات). 
                        وسيتم إنشاء ملف جديد للمرحلة القادمة مع تحديث المراكز القانونية تلقائياً.
                    </p>

                    {/* منطوق القرار للمرحلة الحالية */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            منطوق قرار المحكمة (للمرحلة الحالية) <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={result} 
                            onChange={e => setResult(e.target.value)} 
                            placeholder="مثال: الحكم لصالح المدعي / رفض الدعوى / الإحالة..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]" 
                        />
                    </div>

                    {/* تاريخ القرار */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تاريخ صدور القرار</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673] [color-scheme:dark]" 
                        />
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <p className="text-white/60 text-xs mb-3 font-bold uppercase tracking-wide">بيانات المرحلة الجديدة</p>
                        
                        {/* المرحلة الجديدة */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-white/60 mb-1.5">
                                المرحلة الجديدة <span className="text-red-500">*</span>
                            </label>
                            <select 
                                value={newStage} 
                                onChange={e => setNewStage(e.target.value)}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]"
                            >
                                <option value="">اختر المرحلة...</option>
                                <option value="الاستئناف">الاستئناف</option>
                                <option value="التمييز">التمييز</option>
                            </select>
                        </div>

                        {/* اسم المحكمة الجديدة */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-white/60 mb-1.5">
                                اسم المحكمة الجديدة <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                value={newCourt} 
                                onChange={e => setNewCourt(e.target.value)} 
                                placeholder="مثال: محكمة استئناف بغداد الاتحادية"
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]" 
                            />
                        </div>

                        {/* رقم الدعوى الجديد */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-white/60 mb-1.5">
                                رقم الدعوى الجديد <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                value={newCaseNo} 
                                onChange={e => setNewCaseNo(e.target.value)} 
                                placeholder="مثال: 123/س/2026"
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673] text-right" 
                                dir="rtl"
                            />
                        </div>

                        {/* من هو مقدم الطعن (Critical Logic) */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-white/60 mb-1.5">
                                من هو مقدم الطعن؟ (المستأنف/المميز) <span className="text-red-500">*</span>
                            </label>
                            <select 
                                value={appellant} 
                                onChange={e => setAppellant(e.target.value)}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]"
                            >
                                <option value="">اختر من قدم الطعن...</option>
                                <option value={party1.name}>{party1.name} (حالياً: {party1.role || 'الطرف الأول'})</option>
                                <option value={party2.name}>{party2.name} (حالياً: {party2.role || 'الطرف الثاني'})</option>
                            </select>
                            <p className="text-white/40 text-[10px] mt-1 pr-2">
                                ⚠️ سيتم تحديث المراكز القانونية تلقائياً (المستأنف/المستأنف عليه)
                            </p>
                        </div>
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!newStage || !newCourt || !newCaseNo || !appellant || !result} 
                        className="w-full bg-[#E6C673] text-[#0F172A] py-3 rounded-lg font-bold text-sm hover:bg-[#F4D03F] transition-all shadow-lg shadow-[#E6C673]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ✅ تأكيد الانتقال وأرشفة المرحلة الحالية
                    </button>
                </div>
            </div>
        </div>
    );
};


