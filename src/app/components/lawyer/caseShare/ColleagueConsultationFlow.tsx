import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { motion, AnimatePresence } from 'motion/react';

import { Send, X, Shield, UserCheck, ChevronLeft, Loader2 } from 'lucide-react';

import { SmartToast } from '@/app/components/ui/SmartToast';

import { useAuthSafe } from '@/app/context/AuthContext';

import type { DossierShareSource, CaseShareVisibleFields, NetworkColleague } from '@/app/services/caseShare/caseShareTypes';

import { DEFAULT_CASE_SHARE_VISIBLE_FIELDS } from '@/app/services/caseShare/caseShareTypes';

import { buildMaskedView } from '@/app/services/caseShare/caseShareMasking';

import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';

import { ColleagueShareCatalogPicker } from './ColleagueShareCatalogPicker';
import { CaseShareSessionDurationPicker } from './CaseShareSessionDurationPicker';
import {
    DEFAULT_CASE_SHARE_SESSION_MINUTES,
    formatCaseShareSession,
    type CaseShareSessionMinutes,
} from '@/app/services/caseShare/caseShareSession';



type Step = 'target' | 'privacy' | 'confirm';



type ColleagueConsultationFlowProps = {

    open: boolean;

    onClose: () => void;

    source?: DossierShareSource;

};



function ToggleRow({

    label,

    hint,

    checked,

    onChange,

}: {

    label: string;

    hint?: string;

    checked: boolean;

    onChange: (v: boolean) => void;

}) {

    return (

        <label className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 cursor-pointer">

            <span className="flex-1 min-w-0">

                <span className="block text-white text-sm font-bold">{label}</span>

                {hint ? <span className="block text-white/40 text-[11px] mt-0.5">{hint}</span> : null}

            </span>

            <input

                type="checkbox"

                checked={checked}

                onChange={(e) => onChange(e.target.checked)}

                className="w-5 h-5 accent-[#E6C673] shrink-0"

            />

        </label>

    );

}



function ModeRow({

    label,

    value,

    onChange,

}: {

    label: string;

    value: 'full' | 'partial' | 'hidden';

    onChange: (v: 'full' | 'partial' | 'hidden') => void;

}) {

    const options: Array<{ id: 'full' | 'partial' | 'hidden'; label: string }> = [

        { id: 'full', label: 'كامل' },

        { id: 'partial', label: 'جزئي' },

        { id: 'hidden', label: 'مخفي' },

    ];

    return (

        <div className="py-2.5 border-b border-white/5">

            <p className="text-white text-sm font-bold mb-2">{label}</p>

            <div className="flex gap-1.5">

                {options.map((opt) => (

                    <button

                        key={opt.id}

                        type="button"

                        onClick={() => onChange(opt.id)}

                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${

                            value === opt.id

                                ? 'bg-[#E6C673]/15 text-[#E6C673] border border-[#E6C673]/35'

                                : 'text-white/45 border border-white/10'

                        }`}

                    >

                        {opt.label}

                    </button>

                ))}

            </div>

        </div>

    );

}



export const ColleagueConsultationFlow = memo(function ColleagueConsultationFlow({

    open,

    onClose,

    source,

}: ColleagueConsultationFlowProps) {

    const { user } = useAuthSafe();

    const userId = user?.id ?? null;

    const ownerName = user?.user_metadata?.fullName || user?.email?.split('@')[0] || 'محامٍ';



    const [step, setStep] = useState<Step>('target');

    const [loadingColleagues, setLoadingColleagues] = useState(false);

    const [colleagues, setColleagues] = useState<NetworkColleague[]>([]);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [fields, setFields] = useState<CaseShareVisibleFields>({ ...DEFAULT_CASE_SHARE_VISIBLE_FIELDS });

    const [submitting, setSubmitting] = useState(false);

    const [maskTerms, setMaskTerms] = useState('');
    const [sessionMinutes, setSessionMinutes] = useState<CaseShareSessionMinutes>(DEFAULT_CASE_SHARE_SESSION_MINUTES);



    useEffect(() => {

        if (!open) return;

        setStep('target');

        setSelectedId(null);

        setFields({ ...DEFAULT_CASE_SHARE_VISIBLE_FIELDS });

        setMaskTerms('');
        setSessionMinutes(DEFAULT_CASE_SHARE_SESSION_MINUTES);

    }, [open, source]);



    useEffect(() => {

        if (!open || !source || !userId) return;

        setLoadingColleagues(true);

        void CaseShareApiService.listNetworkColleagues(userId)

            .then(setColleagues)

            .finally(() => setLoadingColleagues(false));

    }, [open, source, userId]);



    const selectedColleague = colleagues.find((c) => c.id === selectedId) ?? null;



    const mergedFields = useMemo(

        (): CaseShareVisibleFields => ({

            ...fields,

            masked_terms: maskTerms.split(',').map((t) => t.trim()).filter(Boolean),

        }),

        [fields, maskTerms],

    );



    const preview = useMemo(

        () => (source ? buildMaskedView(source, mergedFields, ownerName) : null),

        [source, mergedFields, ownerName],

    );



    const handleSend = useCallback(async () => {

        if (!userId || !selectedColleague || !source) return;

        setSubmitting(true);

        try {

            await CaseShareApiService.createShare({

                ownerId: userId,

                ownerName,

                recipientId: selectedColleague.id,

                recipientName: selectedColleague.name,

                source,

                visibleFields: mergedFields,
                sessionDurationMinutes: sessionMinutes,
            });

            SmartToast.success(`تم إرسال طلب الاستشارة إلى ${selectedColleague.name}`);

            onClose();

        } catch {

            SmartToast.error('تعذّر إرسال طلب الاستشارة');

        } finally {

            setSubmitting(false);

        }

    }, [userId, selectedColleague, ownerName, source, mergedFields, sessionMinutes, onClose]);



    if (!open) return null;



    if (!source) {

        return (

            <AnimatePresence>

                <motion.div

                    initial={{ opacity: 0 }}

                    animate={{ opacity: 1 }}

                    exit={{ opacity: 0 }}

                    className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-sm flex items-center justify-center p-6"

                    onClick={onClose}

                >

                    <p className="text-white/60 text-sm" onClick={(e) => e.stopPropagation()}>

                        افتح إضبارة لإرسال طلب استشارة

                    </p>

                </motion.div>

            </AnimatePresence>

        );

    }



    return (

        <AnimatePresence>

            <motion.div

                key="consult-backdrop"

                initial={{ opacity: 0 }}

                animate={{ opacity: 1 }}

                exit={{ opacity: 0 }}

                className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-sm"

                onClick={onClose}

            />

            <motion.div

                key="consult-sheet"

                initial={{ y: '100%' }}

                animate={{ y: 0 }}

                exit={{ y: '100%' }}

                transition={{ type: 'spring', stiffness: 420, damping: 38 }}

                className="fixed inset-x-0 bottom-0 z-[121] max-h-[88dvh] rounded-t-[24px] bg-[#0A0F1C] border border-[#E6C673]/20 shadow-2xl flex flex-col"

                dir="rtl"

                role="dialog"

                aria-label="استشارة زميل مختار"

            >

                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-2" />

                <div className="px-5 pb-3 flex items-center justify-between border-b border-white/10">

                    <div>

                        <h3 className="text-white font-bold text-sm flex items-center gap-2">

                            <Send size={16} className="text-[#E6C673]" />

                            استشارة زميل مختار

                        </h3>

                        <p className="text-white/45 text-[11px] mt-0.5 truncate max-w-[260px]">{source.title}</p>

                    </div>

                    <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 text-white/50 flex items-center justify-center">

                        <X size={18} />

                    </button>

                </div>



                <div className="flex-1 overflow-y-auto px-5 py-4">

                    {step === 'target' ? (

                        <>

                            <p className="text-white/55 text-xs mb-3">

                                اختر زميلاً من شبكة المتابعة — من تتابعه أو يتابعك

                            </p>

                            {loadingColleagues ? (

                                <div className="py-12 flex justify-center text-[#E6C673]"><Loader2 className="animate-spin" /></div>

                            ) : colleagues.length === 0 ? (

                                <div className="py-10 text-center text-white/45 text-sm">

                                    لا يوجد زملاء في شبكة المتابعة — تابع محامياً من المنتدى أولاً

                                </div>

                            ) : (

                                <div className="space-y-2">

                                    {colleagues.map((c) => (

                                        <button

                                            key={c.id}

                                            type="button"

                                            onClick={() => setSelectedId(c.id)}

                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors ${

                                                selectedId === c.id

                                                    ? 'border-[#E6C673]/40 bg-[#E6C673]/10'

                                                    : 'border-white/10 bg-white/[0.03]'

                                            }`}

                                        >

                                            <span className="w-9 h-9 rounded-full bg-[#E6C673]/12 border border-[#E6C673]/25 flex items-center justify-center text-[#E6C673] text-xs font-bold">

                                                {c.name.slice(0, 1)}

                                            </span>

                                            <span className="flex-1 text-right">

                                                <span className="block text-white text-sm font-bold">{c.name}</span>

                                                <span className="block text-white/40 text-[10px]">

                                                    {c.relation === 'both' ? 'متابعة متبادلة' : c.relation === 'following' ? 'تتابعه' : 'يتابعك'}

                                                </span>

                                            </span>

                                            {selectedId === c.id ? <UserCheck size={16} className="text-[#E6C673]" /> : null}

                                        </button>

                                    ))}

                                </div>

                            )}

                        </>

                    ) : null}



                    {step === 'privacy' ? (

                        <>

                            <p className="text-[#E6C673] text-xs font-bold mb-3 flex items-center gap-1.5">

                                <Shield size={14} /> محتوى الإضبارة المرسل

                            </p>



                            <ColleagueShareCatalogPicker
                                catalog={source.catalog ?? []}
                                fields={fields}
                                onChange={setFields}
                            />

                            <CaseShareSessionDurationPicker
                                value={sessionMinutes}
                                onChange={setSessionMinutes}
                            />

                            <div className="mt-4 pt-3 border-t border-white/10">

                                <p className="text-white/50 text-[11px] font-bold mb-2">تجهيل إضافي</p>

                                <ModeRow

                                    label="أسماء الأطراف"

                                    value={fields.parties_names}

                                    onChange={(v) => setFields((f) => ({ ...f, parties_names: v }))}

                                />

                                <ModeRow

                                    label="المحكمة والقاضي"

                                    value={fields.court_details}

                                    onChange={(v) => setFields((f) => ({ ...f, court_details: v }))}

                                />

                                <ToggleRow

                                    label="أرقام الدعاوى"

                                    checked={fields.case_numbers}

                                    onChange={(v) => setFields((f) => ({ ...f, case_numbers: v }))}

                                />

                                <div className="py-3 space-y-2">

                                    <label className="text-white text-sm font-bold">ملخص موجّه للزميل</label>

                                    <textarea

                                        value={fields.text_masking ?? ''}

                                        onChange={(e) => setFields((f) => ({ ...f, text_masking: e.target.value }))}

                                        placeholder="اكتب ملخص المشكلة القانونية دون تفاصيل حساسة..."

                                        className="w-full h-20 rounded-xl bg-[#131620] border border-white/10 px-3 py-2 text-white text-sm resize-none outline-none focus:border-[#E6C673]/35"

                                    />

                                    <input

                                        value={maskTerms}

                                        onChange={(e) => setMaskTerms(e.target.value)}

                                        placeholder="كلمات للتجهيل (مفصولة بفاصلة)"

                                        className="w-full h-10 rounded-xl bg-[#131620] border border-white/10 px-3 text-white text-xs outline-none focus:border-[#E6C673]/35"

                                    />

                                </div>

                            </div>

                        </>

                    ) : null}



                    {step === 'confirm' && preview ? (

                        <div className="space-y-3 text-sm">

                            <p className="text-white/55 text-xs">معاينة ما سيراه {selectedColleague?.name}</p>

                            <p className="text-[#E6C673]/80 text-[11px]">
                                مدة الجلسة: {formatCaseShareSession(sessionMinutes)}
                            </p>

                            <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/5 p-4 space-y-2">

                                <p className="text-white font-bold">{preview.title}</p>

                                <p className="text-white/50 text-xs">المحكمة: {preview.court}</p>

                                <p className="text-white/50 text-xs">الأطراف: {preview.parties.join(' · ') || '—'}</p>

                                <p className="text-white/50 text-xs">الأرقام: {preview.caseNumbers.join(' · ') || '—'}</p>

                                {preview.narrative ? (

                                    <p className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap">{preview.narrative}</p>

                                ) : null}

                            </div>

                            {(preview.visibleCatalog ?? []).map((section) => (

                                <div key={section.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">

                                    <p className="text-[#E6C673] text-xs font-bold mb-2">{section.title}</p>

                                    <ul className="space-y-1">

                                        {section.items.map((item) => (

                                            <li key={item.id} className="text-white/70 text-[11px] truncate">

                                                • {item.label}

                                                {item.preview ? (

                                                    <span className="text-white/35"> — {item.preview}</span>

                                                ) : null}

                                            </li>

                                        ))}

                                    </ul>

                                </div>

                            ))}

                            {!preview.documentsIncluded ? (

                                <p className="text-amber-300/80 text-[10px]">المستندات مخفية بالكامل</p>

                            ) : null}

                        </div>

                    ) : null}

                </div>



                <div className="px-5 py-4 border-t border-white/10 flex gap-2">

                    {step !== 'target' ? (

                        <button

                            type="button"

                            onClick={() => setStep(step === 'confirm' ? 'privacy' : 'target')}

                            className="px-4 py-2.5 rounded-xl border border-white/15 text-white/60 text-sm font-bold flex items-center gap-1"

                        >

                            <ChevronLeft size={16} /> رجوع

                        </button>

                    ) : null}

                    <button

                        type="button"

                        disabled={(step === 'target' && !selectedId) || submitting}

                        onClick={() => {

                            if (step === 'target') setStep('privacy');

                            else if (step === 'privacy') setStep('confirm');

                            else void handleSend();

                        }}

                        className="flex-1 py-2.5 rounded-xl bg-[#E6C673] text-[#0A0F1C] font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"

                    >

                        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}

                        {step === 'confirm' ? 'إرسال الطلب' : 'التالي'}

                    </button>

                </div>

            </motion.div>

        </AnimatePresence>

    );

});

