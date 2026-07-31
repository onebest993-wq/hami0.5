import React, { useState } from 'react';
import { Bell, Calendar, Check, Gavel, X } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';
import { AppealTransitionModal } from '../AppealTransitionModal';
import type {
    AbsentJudgmentNotificationModalProps,
    InterlocutoryAppealModalProps,
    JudicialNotificationModalProps,
    ObjectionJudgmentModalProps,
    ObjectionRegistrationModalProps,
    OpponentAbsentObjectionModalProps,
} from '../smartFile/modalFormTypes';
import {
    GLASS_BTN,
    GLASS_FIELD,
    GLASS_MODAL_HEADER,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../smartFile/smartFileModalTheme';
import { SmartModalHeader, useSmartModalAccent } from '../smartFile/smartModalChrome';


export const InterlocutoryAppealModal = ({ isOpen, onClose, onConfirm, editMode = false, editData }: InterlocutoryAppealModalProps) => {
    const { T, required, highlight, deadlineBox, optionClass, isPearl } = useSmartModalAccent();
    const [decisionType, setDecisionType] = useState('');
    const [decisionDate, setDecisionDate] = useState(getLocalTodayYmd());
    const [calculatedDeadline, setCalculatedDeadline] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (editMode && editData) {
                setDecisionType(editData.decisionType || '');
                setDecisionDate(editData.decisionDate || getLocalTodayYmd());
            } else {
                setDecisionType('');
                setDecisionDate(getLocalTodayYmd());
            }
        }
    }, [isOpen, editMode, editData]);

    React.useEffect(() => {
        if (decisionDate && /^\d{4}-\d{2}-\d{2}$/.test(String(decisionDate).trim())) {
            setCalculatedDeadline(addCalendarDaysYmd(String(decisionDate).trim().slice(0, 10), 7));
        }
    }, [decisionDate]);

    const handleSubmit = () => {
        if (!decisionType || !decisionDate) return;
        onConfirm({ decisionType, decisionDate, calculatedDeadline, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
    };

    if (!isOpen) return null;

    const DECISION_TYPES = [
        'قرار استئخار الدعوى',
        'رفض توحيد دعويين',
        'رفض الإحالة لعدم الاختصاص',
        'إبطال عريضة الدعوى',
        'رفض طلب التصحيح',
        'قرارات الأمور المستعجلة',
        'أخرى (مادة 216)',
    ];

    const title = editMode ? 'تحديث قرار تمييزي' : 'تمييز قرار إعدادي / مستعجل (مادة 216)';

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-xl">
            <SmartModalHeader icon={Gavel} title={title} onClose={onClose} />
            <div className={`${T.body} md:min-h-[28rem] md:space-y-6`}>
                <div>
                    <label className={T.label}>
                        نوع القرار المطعون فيه <span className={required}>*</span>
                    </label>
                    <select
                        value={decisionType}
                        onChange={(e) => setDecisionType(e.target.value)}
                        className={T.select}
                        dir="rtl"
                        autoFocus
                    >
                        <option value="" className={optionClass}>
                            -- اختر نوع القرار --
                        </option>
                        {DECISION_TYPES.map((d) => (
                            <option key={d} value={d} className={optionClass}>
                                {d}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={T.label}>
                        تاريخ صدور القرار / التبلغ به <span className={required}>*</span>
                    </label>
                    <input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} className={T.field} />
                </div>

                <div className={deadlineBox}>
                    <span className="text-[10px] text-white/40">آخر موعد لتقديم الطعن (المهلة القانونية)</span>
                    <div className={`text-lg font-bold ${highlight} flex items-center gap-2`}>
                        <Calendar size={16} />
                        {calculatedDeadline}
                        <span className={`text-xs ${isPearl ? 'text-[#F0A8B4]/50' : 'text-[#E6C673]/50'}`}>(7 أيام)</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!decisionType || !decisionDate}
                    className={`${T.btn} ${T.btnDisabled} flex items-center justify-center gap-2`}
                >
                    {editMode ? 'تحديث البيانات' : 'تأكيد وإضافة للتذكيرات'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};

// DEDICATED TRASH MODAL - Soft Delete System

export const AppealRegistrationModal = AppealTransitionModal;

export const JudicialNotificationModal = ({ isOpen, onClose, onConfirm }: JudicialNotificationModalProps) => {
    const T = useSmartFileModalTheme();
    const [targetPerson, setTargetPerson] = useState('');
    const [reason, setReason] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTargetPerson('');
            setReason('');
            setIsCompleted(false);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!targetPerson || !reason) return;
        onConfirm({ targetPerson, reason, isCompleted });
        onClose();
    };

    if (!isOpen) return null;

    const accentRequired = T.variant === 'personal-pearl' ? 'text-rose-300' : 'text-[#E6C673]';
    const checkboxActive =
        T.variant === 'personal-pearl'
            ? 'bg-[#F0A8B4]/25 border-[#F0A8B4]/45'
            : 'bg-[#E6C673]/30 border-[#E6C673]/50';
    const checkboxIcon = T.variant === 'personal-pearl' ? 'text-[#FFD4DC]' : 'text-[#E6C673]';

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-lg">
            <div className={T.useMoroccanCorners ? GLASS_MODAL_HEADER : T.header}>
                <h3 className={T.useMoroccanCorners ? 'font-bold text-sm text-white/95' : T.headerTitle}>
                    <Bell size={16} className={T.headerIcon} strokeWidth={1.75} />
                    تسجيل تبليغ قضائي
                </h3>
                {T.useMoroccanCorners ? (
                    <MoroccanCloseButton onClick={onClose} />
                ) : (
                    <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                        <X size={16} />
                    </button>
                )}
                {T.useMoroccanCorners ? <MoroccanHeaderDivider /> : null}
            </div>

            <div className={`${T.body} md:min-h-[24rem] md:space-y-6`}>
                <div>
                    <label className={T.label}>
                        الشخص المراد تبليغه <span className={accentRequired}>*</span>
                    </label>
                    <input
                        type="text"
                        value={targetPerson}
                        onChange={(e) => setTargetPerson(e.target.value)}
                        className={T.field}
                        autoFocus
                    />
                </div>

                <div>
                    <label className={T.label}>
                        موضوع التبليغ <span className={accentRequired}>*</span>
                    </label>
                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={T.field} />
                </div>

                <div
                    className="flex items-center gap-2 border border-white/[0.08] p-3 rounded-xl bg-white/[0.03] backdrop-blur-sm cursor-pointer hover:bg-white/[0.05] transition-colors"
                    onClick={() => setIsCompleted(!isCompleted)}
                >
                    <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isCompleted ? checkboxActive : 'border-white/30'}`}
                    >
                        {isCompleted && <Check size={14} className={checkboxIcon} />}
                    </div>
                    <span className={`text-sm select-none ${T.variant === 'personal-pearl' ? 'text-[#ECE8E2]/90' : 'text-white/80'}`}>
                        تم التبليغ بالفعل (إضافة للسجل مباشرة)
                    </span>
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!targetPerson || !reason}
                    className={`${T.btn} ${T.btnDisabled}`}
                >
                    {isCompleted ? 'تسجيل التبليغ' : 'إضافة كمهمة متابعة'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};


export const AbsentJudgmentNotificationModal = ({
    isOpen,
    onClose,
    onConfirm,
}: AbsentJudgmentNotificationModalProps) => {
    const [notificationDate, setNotificationDate] = useState(getLocalTodayYmd());

    React.useEffect(() => {
        if (isOpen) setNotificationDate(getLocalTodayYmd());
    }, [isOpen]);

    const handleSubmit = () => {
        if (!notificationDate) return;
        onConfirm({ notificationDate });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose}>
            <div className={GLASS_MODAL_HEADER}>
                <h3 className="font-bold text-[14px] text-white/95">
                    التبليغ بالحكم الغيابي
                </h3>
                <MoroccanCloseButton onClick={onClose} />
                <MoroccanHeaderDivider />
            </div>
            <div className="p-5 space-y-4">
                <p className="text-xs text-white/50 leading-relaxed">
                    سجّل تاريخ التبليغ الرسمي للحكم الغيابي. تُحتسب مهلة الاعتراض (10 أيام) من هذا التاريخ.
                </p>
                <div>
                    <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                        تاريخ التبليغ <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        value={notificationDate}
                        onChange={(e) => setNotificationDate(e.target.value)}
                        className={GLASS_FIELD}
                    />
                </div>
                <button type="button" onClick={handleSubmit} disabled={!notificationDate} className={GLASS_BTN}>
                    حفظ التبليغ
                </button>
            </div>
        </MoroccanGlassShell>
    );
};


export const OpponentAbsentObjectionModal = ({
    isOpen,
    onClose,
    onConfirm,
}: OpponentAbsentObjectionModalProps) => {
    const [newCaseNumber, setNewCaseNumber] = useState('');
    const [filingDate, setFilingDate] = useState(getLocalTodayYmd());

    React.useEffect(() => {
        if (isOpen) {
            setNewCaseNumber('');
            setFilingDate(getLocalTodayYmd());
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!newCaseNumber.trim() || !filingDate) return;
        onConfirm({ newCaseNumber: newCaseNumber.trim(), filingDate });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose}>
            <div className={GLASS_MODAL_HEADER}>
                <h3 className="font-bold text-[14px] text-white/95">
                    اعتراض المدعى عليه بالحكم الغيابي
                </h3>
                <MoroccanCloseButton onClick={onClose} />
                <MoroccanHeaderDivider />
            </div>
            <div className="p-5 space-y-4">
                <p className="text-xs text-white/50 leading-relaxed">
                    يُفتح سجل جديد بمرحلة الاعتراض على الحكم الغيابي مع انقلاب المراكز القانونية.
                </p>
                <div>
                    <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                        رقم دعوى الاعتراض <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={newCaseNumber}
                        onChange={(e) => setNewCaseNumber(e.target.value)}
                        className={GLASS_FIELD}
                        placeholder="رقم الدعوى الجديدة"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                        تاريخ تقديم الاعتراض <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        value={filingDate}
                        onChange={(e) => setFilingDate(e.target.value)}
                        className={GLASS_FIELD}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!newCaseNumber.trim() || !filingDate}
                    className={GLASS_BTN}
                >
                    إنشاء إضبارة الاعتراض
                </button>
            </div>
        </MoroccanGlassShell>
    );
};


export const ObjectionRegistrationModal = ({ isOpen, onClose, onConfirm }: ObjectionRegistrationModalProps) => {
    const [objectionDate, setObjectionDate] = useState(getLocalTodayYmd());
    const [sessionDate, setSessionDate] = useState('');
    const [receiptNumber, setReceiptNumber] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setObjectionDate(getLocalTodayYmd());
            setSessionDate('');
            setReceiptNumber('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!objectionDate || !sessionDate) return;
        onConfirm({ objectionDate, sessionDate, receiptNumber });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold">
                        تسجيل اعتراض غيابي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/80 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-3 text-xs text-teal-200">
                        <p className="leading-relaxed opacity-80">
                            سيتم فتح سجل جديد لمرافعة الاعتراض الغيابي وتجميد الحكم السابق لحين حسم الاعتراض.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تاريخ تقديم الاعتراض</label>
                        <input type="date" value={objectionDate} onChange={e => setObjectionDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500 [color-scheme:dark]" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">موعد الجلسة الأولى <span className="text-teal-500">*</span></label>
                        <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500 [color-scheme:dark]" autoFocus />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">رقم وصل الرسوم (اختياري)</label>
                        <input type="text" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500" placeholder="مثال: 45879" />
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!objectionDate || !sessionDate} 
                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-lg font-bold text-sm hover:from-teal-600 hover:to-emerald-700 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        بدء مرافعة الاعتراض
                    </button>
                </div>
            </div>
        </div>
    );
};


export const ObjectionJudgmentModal = ({ isOpen, onClose, onConfirm }: ObjectionJudgmentModalProps) => {
    const [outcome, setOutcome] = useState('');
    const [details, setDetails] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setOutcome('');
            setDetails('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!outcome) return;
        onConfirm({ outcome, details });
        onClose();
    };

    if (!isOpen) return null;

    const outcomes = [
        { id: 'rejected_formally', label: 'رد الاعتراض شكلاً', desc: 'يتم تأييد الحكم الغيابي لعدم استيفاء الشروط الشكلية' },
        { id: 'petition_nullified', label: 'إبطال عريضة الاعتراض', desc: 'لترك المعترض دعواه أو عدم حضوره' },
        { id: 'upheld', label: 'قبول شكلاً وتأييد الحكم الغيابي', desc: 'الاعتراض صحيح شكلاً ولكن لا سند له قانوناً' },
        { id: 'cancelled_new_judgment', label: 'إلغاء الحكم الغيابي وإصدار حكم جديد', desc: 'قبول الاعتراض وإلغاء الحكم السابق' },
    ];

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Gavel size={18}/> 
                        قرار الحكم في الاعتراض الغيابي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/80 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <label className="block text-xs font-bold text-white/60 mb-1.5">نتيجة الاعتراض <span className="text-indigo-500">*</span></label>
                    <div className="space-y-2">
                        {outcomes.map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => setOutcome(item.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${outcome === item.id ? 'bg-indigo-500/20 border-indigo-500' : 'bg-[#0F172A] border-white/10 hover:border-white/30'}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${outcome === item.id ? 'border-indigo-500' : 'border-white/40'}`}>
                                        {outcome === item.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                    </div>
                                    <span className={`text-sm font-bold ${outcome === item.id ? 'text-white' : 'text-white/80'}`}>{item.label}</span>
                                </div>
                                <p className="text-[10px] text-white/40 mr-6">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تفاصيل القرار (اختياري)</label>
                        <textarea 
                            value={details} 
                            onChange={e => setDetails(e.target.value)} 
                            rows={2}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500" 
                            placeholder="أي تفاصيل إضافية حول القرار..."
                        />
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!outcome} 
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-3 rounded-lg font-bold text-sm hover:from-indigo-700 hover:to-purple-800 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إصدار القرار وختم الاعتراض ⚖️
                    </button>
                </div>
            </div>
        </div>
    );
};

