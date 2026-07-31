import React, { useState, useEffect } from 'react';
import { X, Scale, Clock, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';
import {
    FAST_TRACK_STATUS_UI_OPTIONS,
    isFastTrackDecidedStatus,
    resolveFastTrackStatusKey,
    storedFastTrackStatus,
    type FastTrackStatusKey,
} from './smartFile/fastTrackStatus';
import { useSmartFileModalTheme } from './smartFile/smartFileModalTheme';

const STATUS_ICONS: Record<FastTrackStatusKey, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
    pending: Clock,
    accepted: CheckCircle2,
    rejected: XCircle,
    approved: ShieldCheck,
    grievance: Scale,
};

interface FastTrackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: FastTrackData) => void;
    editMode?: boolean;
    editData?: FastTrackData | null;
}

interface FastTrackData {
    id?: string;
    type: string;
    reason: string;
    requestDate: string;
    status: string;
    notes: string;
}

export const FastTrackModal = ({ isOpen, onClose, onSave, editMode = false, editData }: FastTrackModalProps) => {
    const T = useSmartFileModalTheme();
    const [requestType, setRequestType] = useState('');
    const [subject, setSubject] = useState('');
    const [submissionDate, setSubmissionDate] = useState(getLocalTodayYmd());
    const [statusKey, setStatusKey] = useState<FastTrackStatusKey>('pending');

    const [grievanceDate, setGrievanceDate] = useState('');
    const [grievanceTime, setGrievanceTime] = useState('');
    const [grievanceOutcome, setGrievanceOutcome] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        if (editMode && editData) {
            const ed = editData as FastTrackData & {
                requestType?: string;
                subject?: string;
                submissionDate?: string;
                grievanceDate?: string;
                grievanceTime?: string;
                grievanceOutcome?: string;
            };
            setRequestType(String(ed.type || ed.requestType || '').trim());
            setSubject(ed.reason || ed.subject || '');
            setSubmissionDate(ed.requestDate || ed.submissionDate || getLocalTodayYmd());
            setStatusKey(resolveFastTrackStatusKey(ed.status));
            setGrievanceDate(ed.grievanceDate || '');
            setGrievanceTime(ed.grievanceTime || '');
            setGrievanceOutcome(ed.grievanceOutcome || '');
            return;
        }

        const preset = editData as (FastTrackData & { requestType?: string }) | null | undefined;
        const presetType = preset?.type || preset?.requestType;

        setRequestType(String(presetType || '').trim());
        setSubject('');
        setSubmissionDate(getLocalTodayYmd());
        setStatusKey('pending');
        setGrievanceDate('');
        setGrievanceTime('');
        setGrievanceOutcome('');
    }, [editMode, editData, isOpen]);

    const status = storedFastTrackStatus(statusKey);
    const showGrievanceSection = statusKey === 'grievance';
    const isDecided = isFastTrackDecidedStatus(status);
    const showOutcomePicker = editMode && !isDecided && !showGrievanceSection;
    const outcomeOptions = FAST_TRACK_STATUS_UI_OPTIONS.filter((opt) => opt.key === 'accepted' || opt.key === 'rejected');

    const handleSubmit = () => {
        const type = requestType.trim();
        if (!type || !subject.trim()) return;

        const fastTrackData = {
            type,
            reason: subject,
            requestDate: submissionDate,
            status: editMode ? status : storedFastTrackStatus('pending'),
            notes: editData?.notes || '',
            ...(showGrievanceSection && {
                grievanceDate,
                grievanceTime,
                grievanceOutcome,
            }),
            ...(editMode && editData ? { id: editData.id } : {}),
        };

        onSave(fastTrackData as FastTrackData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={T.overlay} dir="rtl" onClick={onClose}>
            <div className={`w-full max-w-3xl ${T.shell}`} onClick={(e) => e.stopPropagation()}>
                <div className={T.shellCard}>
                    <div className={T.header}>
                        <h3 className={T.headerTitle}>
                            {editMode ? 'تحديث الطلب' : 'تسجيل طلب جديد'}
                        </h3>
                        <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                            <X size={16} />
                        </button>
                    </div>

                    <div className={`${T.body} md:min-w-[46rem]`}>
                    <div>
                        <label className={T.label}>
                            نوع الطلب <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={requestType}
                            onChange={(e) => setRequestType(e.target.value)}
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.fastTrackRequestType}
                            placeholder="اكتب نوع الطلب يدوياً — مثل: منع سفر، إيقاف أعمال..."
                            className={T.field}
                        />
                    </div>

                    <div>
                        <label className={T.label}>
                            موضوع الطلب <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.fastTrackSubject}
                            placeholder="اشرح باختصار موضوع الطلب..."
                            className={`${T.field} min-h-[80px] resize-none`}
                        />
                    </div>

                    <div>
                        <label className={T.label}>
                            تاريخ التقديم <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={submissionDate}
                            onChange={(e) => setSubmissionDate(e.target.value)}
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.fastTrackSubmissionDate}
                            className={T.field}
                        />
                    </div>

                    {showOutcomePicker ? (
                        <div>
                            <label className={T.label}>
                                نتيجة الطلب
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {outcomeOptions.map((opt) => {
                                    const Icon = STATUS_ICONS[opt.key];
                                    const active = statusKey === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            data-testid={CIVIL_LAWSUIT_TEST_IDS.fastTrackStatus(opt.key)}
                                            onClick={() => setStatusKey(opt.key)}
                                            className={`relative rounded-xl border px-3 py-2.5 text-right transition-all duration-200 ${
                                                active ? opt.chipActive : opt.chipIdle
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold leading-tight">{opt.label}</p>
                                                    <p className="text-[9px] opacity-70 mt-0.5">{opt.hint}</p>
                                                </div>
                                                <Icon
                                                    size={16}
                                                    strokeWidth={1.75}
                                                    className={`shrink-0 ${active ? 'opacity-95' : 'opacity-40'}`}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {editMode && isDecided ? (
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-white/45">النتيجة</span>
                            <span
                                className={`text-[11px] font-bold ${
                                    statusKey === 'accepted' ? 'text-emerald-300' : 'text-rose-300'
                                }`}
                            >
                                {statusKey === 'accepted' ? 'قبول' : 'رفض'}
                            </span>
                        </div>
                    ) : null}

                    {showGrievanceSection && (
                        <div className={`rounded-xl p-3 space-y-3 border ${T.variant === 'personal-pearl' ? 'border-white/[0.12] bg-white/[0.04]' : 'border-[#E6C673]/15 bg-white/[0.03]'}`}>
                            <div className="flex items-center gap-2">
                                <Scale size={15} className={T.headerIcon} strokeWidth={1.75} />
                                <h4 className={`${T.accentText} font-bold text-[11px]`}>تفاصيل جلسة التظلم</h4>
                            </div>

                            <div>
                                <label className={T.label}>
                                    موعد جلسة التظلم <span className={T.accentText}>*</span>
                                </label>
                                <input
                                    type="date"
                                    value={grievanceDate}
                                    onChange={(e) => setGrievanceDate(e.target.value)}
                                    className={T.field}
                                />
                            </div>

                            <div>
                                <label className={T.label}>
                                    وقت الجلسة <span className={T.accentText}>*</span>
                                </label>
                                <input
                                    type="time"
                                    value={grievanceTime}
                                    onChange={(e) => setGrievanceTime(e.target.value)}
                                    className={T.field}
                                />
                            </div>

                            <div>
                                <label className={T.label}>نتيجة التظلم</label>
                                <select
                                    value={grievanceOutcome}
                                    onChange={(e) => setGrievanceOutcome(e.target.value)}
                                    className={T.select}
                                >
                                    <option value="">لم يُحسم بعد</option>
                                    <option value="تأييد الأمر">تأييد الأمر</option>
                                    <option value="تعديل الأمر">تعديل الأمر</option>
                                    <option value="إلغاء الأمر">إلغاء الأمر</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                            !requestType.trim()
                            || !subject.trim()
                            || (showGrievanceSection && (!grievanceDate || !grievanceTime))
                        }
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.fastTrackSubmit}
                        className={T.btn}
                    >
                        {editMode ? 'تحديث البيانات' : 'حفظ الطلب'}
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
