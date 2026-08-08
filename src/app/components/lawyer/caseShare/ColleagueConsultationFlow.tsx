import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Shield, UserCheck, ChevronLeft, Loader2 } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuthSafe } from '@/app/context/AuthContext';
import type { DossierShareSource, CaseShareVisibleFields, NetworkColleague } from '@/app/services/caseShare/caseShareTypes';
import {
    defaultConsultVisibleFields,
} from '@/app/services/caseShare/caseShareTypes';
import { normalizeExecutionConsultCatalog } from '@/app/services/caseShare/caseShareCatalogBuilder';
import { buildMaskedView } from '@/app/services/caseShare/caseShareMasking';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import { ColleagueShareCatalogPicker } from './ColleagueShareCatalogPicker';
import { CaseShareSessionClockSlider } from './CaseShareSessionClockSlider';
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

function ConsultDossierSummary({ source }: { source: DossierShareSource }) {
    const meta = source.executionMeta;
    if (!meta) {
        return (
            <div className="mb-4 rounded-xl border border-[#E6C673]/20 bg-[#E6C673]/5 px-3 py-3 text-right">
                <p className="text-[10px] font-semibold text-white/45 mb-1">بيانات الإضبارة</p>
                <p className="text-sm font-bold text-white truncate">{source.title}</p>
            </div>
        );
    }

    const directorate = meta.directorate || source.courtLabel?.trim() || '—';
    const fileRef = meta.fileNumber
        ? `${meta.fileNumber}${meta.fileYear ? `/${meta.fileYear}` : ''}`
        : source.caseNumbers[0] ?? '—';

    const rows: Array<{ label: string; value: string; accent?: boolean }> = [
        { label: 'مديرية التنفيذ', value: directorate },
        { label: 'رقم الإضبارة', value: fileRef, accent: true },
    ];
    if (meta?.claimType) rows.push({ label: 'نوع المطالبة', value: meta.claimType });
    if (meta?.documentType) rows.push({ label: 'نوع السند', value: meta.documentType });
    if (meta?.lifecycleStatus) rows.push({ label: 'حالة الإضبارة', value: meta.lifecycleStatus });
    if (meta?.docNumber) rows.push({ label: 'رقم السند', value: meta.docNumber });

    return (
        <div className="mb-4 rounded-xl border border-[#E6C673]/20 bg-[#E6C673]/5 px-3 py-3 text-right">
            <p className="text-[10px] font-semibold text-white/45 mb-2">بيانات الإضبارة</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {rows.map((row) => (
                    <div key={row.label} className="min-w-0">
                        <p className="text-[9px] text-white/40">{row.label}</p>
                        <p
                            className={`truncate text-[12px] font-bold ${
                                row.accent ? 'text-[#E6C673] tabular-nums' : 'text-white'
                            }`}
                        >
                            {row.value}
                        </p>
                    </div>
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
    const [fields, setFields] = useState<CaseShareVisibleFields>(() =>
        defaultConsultVisibleFields(source?.module),
    );
    const [submitting, setSubmitting] = useState(false);
    const [sessionMinutes, setSessionMinutes] = useState<CaseShareSessionMinutes>(
        DEFAULT_CASE_SHARE_SESSION_MINUTES,
    );

    const isExecution = source?.module === 'execution';

    const shareCatalog = useMemo(() => {
        const catalog = source?.catalog ?? [];
        if (!isExecution) return catalog;
        return normalizeExecutionConsultCatalog(catalog);
    }, [source?.catalog, isExecution]);

    useEffect(() => {
        if (!open) return;
        setStep('target');
        setSelectedId(null);
        setFields(defaultConsultVisibleFields(source?.module));
        setSessionMinutes(DEFAULT_CASE_SHARE_SESSION_MINUTES);
    }, [open, source?.module, source?.dossierId]);

    useEffect(() => {
        if (!open || !source || !userId) return;
        setLoadingColleagues(true);
        void CaseShareApiService.listNetworkColleagues(userId)
            .then(setColleagues)
            .finally(() => setLoadingColleagues(false));
    }, [open, source, userId]);

    const selectedColleague = colleagues.find((c) => c.id === selectedId) ?? null;

    const mergedFields = useMemo((): CaseShareVisibleFields => {
        if (!isExecution) return { ...fields, masked_terms: fields.masked_terms ?? [] };
        return {
            ...fields,
            parties_names: 'hidden',
            court_details: 'hidden',
            masked_terms: [],
        };
    }, [fields, isExecution]);

    const preview = useMemo(
        () => (source ? buildMaskedView(source, mergedFields, ownerName, sessionMinutes) : null),
        [source, mergedFields, ownerName, sessionMinutes],
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
                    <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <Send size={16} className="text-[#E6C673] shrink-0" />
                            استشارة زميل مختار
                        </h3>
                        {selectedColleague && step !== 'target' ? (
                            <p className="text-white/45 text-[11px] mt-0.5 truncate">
                                إلى: {selectedColleague.name}
                            </p>
                        ) : (
                            <p className="text-white/45 text-[11px] mt-0.5 truncate">{source.title}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/5 text-white/50 flex items-center justify-center shrink-0"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
                    {step === 'target' ? (
                        <>
                            <ConsultDossierSummary source={source} />
                            <p className="text-white/55 text-xs mb-3">
                                اختر زميلاً من شبكة المتابعة — من تتابعه أو يتابعك
                            </p>
                            {loadingColleagues ? (
                                <div className="py-12 flex justify-center text-[#E6C673]">
                                    <Loader2 className="animate-spin" />
                                </div>
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
                                                    {c.relation === 'both'
                                                        ? 'متابعة متبادلة'
                                                        : c.relation === 'following'
                                                          ? 'تتابعه'
                                                          : 'يتابعك'}
                                                </span>
                                            </span>
                                            {selectedId === c.id ? (
                                                <UserCheck size={16} className="text-[#E6C673]" />
                                            ) : null}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : null}

                    {step === 'privacy' ? (
                        <>
                            <ConsultDossierSummary source={source} />
                            <p className="text-[#E6C673] text-xs font-bold mb-3 flex items-center gap-1.5">
                                <Shield size={14} />
                                ما يظهر للزميل من أقسام الإضبارة
                            </p>
                            <p className="text-white/45 text-[10px] mb-3 leading-relaxed">
                                كل الأقسام مخفية افتراضاً — فعّل «الكل» أو «اختيار» لكل قسم تريد مشاركته. يمكن
                                إخفاء عناصر جزئياً من السجل أو الملاحظات أو المستندات وغيرها.
                            </p>

                            <ColleagueShareCatalogPicker
                                catalog={shareCatalog}
                                fields={fields}
                                onChange={setFields}
                            />

                            <CaseShareSessionClockSlider
                                value={sessionMinutes}
                                onChange={setSessionMinutes}
                            />

                            <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                                <label className="text-white text-sm font-bold">ملخص موجّه للزميل (اختياري)</label>
                                <textarea
                                    value={fields.text_masking ?? ''}
                                    onChange={(e) =>
                                        setFields((f) => ({ ...f, text_masking: e.target.value }))
                                    }
                                    placeholder="اكتب ملخص المشكلة القانونية دون تفاصيل حساسة..."
                                    className="w-full h-20 rounded-xl bg-[#131620] border border-white/10 px-3 py-2 text-white text-sm resize-none outline-none focus:border-[#E6C673]/35"
                                />
                            </div>
                        </>
                    ) : null}

                    {step === 'confirm' && preview ? (
                        <div className="space-y-3 text-sm">
                            <ConsultDossierSummary source={source} />
                            <p className="text-white/55 text-xs">
                                معاينة ما سيراه {selectedColleague?.name}
                            </p>
                            <p className="text-[#E6C673]/80 text-[11px]">
                                مدة الجلسة: {formatCaseShareSession(sessionMinutes)}
                            </p>

                            <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/5 p-4 space-y-2">
                                <p className="text-white font-bold">{preview.title}</p>
                                {!isExecution && preview.court ? (
                                    <p className="text-white/50 text-xs">المحكمة: {preview.court}</p>
                                ) : null}
                                {!isExecution && preview.parties.length ? (
                                    <p className="text-white/50 text-xs">
                                        الأطراف: {preview.parties.join(' · ')}
                                    </p>
                                ) : null}
                                {preview.caseNumbers.length && fields.case_numbers ? (
                                    <p className="text-white/50 text-xs">
                                        الأرقام: {preview.caseNumbers.join(' · ')}
                                    </p>
                                ) : null}
                                {preview.narrative ? (
                                    <p className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap">
                                        {preview.narrative}
                                    </p>
                                ) : null}
                            </div>

                            {(preview.visibleCatalog ?? []).length ? (
                                (preview.visibleCatalog ?? []).map((section) => (
                                    <div
                                        key={section.key}
                                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                                    >
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
                                ))
                            ) : (
                                <p className="text-white/40 text-xs text-center py-4">
                                    لم تُفعَّل أي أقسام للمشاركة — سيصل للزميل الملخص فقط
                                </p>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="px-5 py-4 border-t border-white/10 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
