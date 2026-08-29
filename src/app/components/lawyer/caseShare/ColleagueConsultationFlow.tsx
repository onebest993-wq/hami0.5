import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send } from '@/app/components/ui/icons/Send';
import { X } from '@/app/components/ui/icons/X';
import { Shield } from '@/app/components/ui/icons/Shield';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { RefreshCw } from '@/app/components/ui/icons/RefreshCw';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuthSafe } from '@/app/context/authHooks';
import type {
    DossierShareSource,
    CaseShareVisibleFields,
    NetworkColleague,
} from '@/app/services/caseShare/caseShareTypes';
import { defaultConsultVisibleFields } from '@/app/services/caseShare/caseShareTypes';
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
import { HUB_DOSSIER_CONSULT_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { LV_INSET, LV_INSET_HOVER } from '@/app/components/lawyer/lawyerShared/lawsuitVisualLite';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

type Step = 'target' | 'privacy' | 'confirm';

type ColleagueConsultationFlowProps = {
    open: boolean;
    onClose: () => void;
    source?: DossierShareSource;
};

const btnPrimary =
    'min-h-[44px] flex-1 rounded-xl bg-[#E6C673] text-[#0A0F1C] text-sm font-bold disabled:opacity-40 touch-manipulation';
const btnGhost =
    `min-h-[44px] rounded-xl border border-white/12 px-3 text-sm font-bold text-white/65 touch-manipulation ${LV_INSET} ${LV_INSET_HOVER}`;

function stopBubble(e: React.SyntheticEvent) {
    e.stopPropagation();
}

export const ColleagueConsultationFlow = memo(function ColleagueConsultationFlow({
    open,
    onClose,
    source,
}: ColleagueConsultationFlowProps) {
    useBodyScrollLock(open);

    const { user } = useAuthSafe();
    const userId = user?.id ?? null;
    const ownerName = user?.user_metadata?.fullName || user?.email?.split('@')[0] || 'محامٍ';
    const dossierId = source?.dossierId ?? null;
    const dossierModule = source?.module;
    const loadGenRef = useRef(0);

    const [step, setStep] = useState<Step>('target');
    const [loadingColleagues, setLoadingColleagues] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
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
        setLoadError(null);
        setFields(defaultConsultVisibleFields(dossierModule));
        setSessionMinutes(DEFAULT_CASE_SHARE_SESSION_MINUTES);
    }, [open, dossierModule, dossierId]);

    const reloadColleagues = useCallback(() => {
        if (!userId) {
            setLoadError('سجّل الدخول لعرض شبكة المتابعة');
            setColleagues([]);
            setLoadingColleagues(false);
            return;
        }
        const gen = ++loadGenRef.current;
        setLoadingColleagues(true);
        setLoadError(null);
        void CaseShareApiService.listNetworkColleagues(userId)
            .then((list) => {
                if (loadGenRef.current !== gen) return;
                setColleagues(list);
            })
            .catch(() => {
                if (loadGenRef.current !== gen) return;
                setLoadError('تعذّر تحميل الشبكة — أعد المحاولة');
                setColleagues([]);
            })
            .finally(() => {
                if (loadGenRef.current === gen) setLoadingColleagues(false);
            });
    }, [userId]);

    useEffect(() => {
        if (!open || !dossierId) return;
        reloadColleagues();
    }, [open, dossierId, reloadColleagues]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, onClose]);

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
        } catch (err) {
            const message =
                err instanceof Error && err.message === 'RECIPIENT_NOT_IN_NETWORK'
                    ? 'المستلم ليس في شبكة المتابعة'
                    : 'تعذّر إرسال طلب الاستشارة';
            SmartToast.error(message);
        } finally {
            setSubmitting(false);
        }
    }, [userId, selectedColleague, ownerName, source, mergedFields, sessionMinutes, onClose]);

    if (!open) return null;

    if (!source) {
        return (
            <div
                className={`fixed inset-0 ${HUB_DOSSIER_CONSULT_Z_CLASS} bg-black/70 flex items-center justify-center p-6`}
                data-testid="colleague-consultation-layer"
                onClick={onClose}
            >
                <p className="text-white/60 text-sm" onClick={stopBubble}>
                    افتح إضبارة لإرسال طلب استشارة
                </p>
            </div>
        );
    }

    const stepHint =
        step === 'target'
            ? 'اختر زميلاً من شبكتك'
            : step === 'privacy'
              ? 'ما يظهر للزميل'
              : 'تأكيد الإرسال';

    return (
        <div
            className={`fixed inset-0 ${HUB_DOSSIER_CONSULT_Z_CLASS}`}
            data-testid="colleague-consultation-layer"
            role="presentation"
        >
            <button
                type="button"
                aria-label="إغلاق"
                className="absolute inset-0 bg-black/70 touch-manipulation"
                onClick={onClose}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="استشارة زميل"
                dir="rtl"
                className="absolute inset-x-0 bottom-0 max-h-[min(82vh,82dvh)] flex flex-col rounded-t-2xl border border-[#E6C673]/18 bg-[#0A0F1C] shadow-2xl"
                onClick={stopBubble}
                onPointerDown={stopBubble}
            >
                <div className="mx-auto mt-2.5 mb-1 h-1 w-9 shrink-0 rounded-full bg-white/20" />

                <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 pb-2.5 shrink-0">
                    <div className="min-w-0 flex-1 text-right">
                        <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                            <Send size={14} className="text-[#E6C673] shrink-0" />
                            استشارة زميل
                        </h3>
                        <p className="truncate text-[10px] text-white/40 mt-0.5">
                            {selectedColleague && step !== 'target'
                                ? selectedColleague.name
                                : source.title}
                            {' · '}
                            {stepHint}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/45 hover:bg-white/5 hover:text-white touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 touch-pan-y">
                    {step === 'target' ? (
                        <div className="space-y-2">
                            {loadingColleagues ? (
                                <div className="flex justify-center py-10 text-[#E6C673]" aria-busy="true">
                                    <Loader2 size={22} className="animate-spin" />
                                </div>
                            ) : colleagues.length === 0 ? (
                                <div className="space-y-3 py-6 text-center">
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        {loadError ??
                                            'لا زملاء في الشبكة بعد — تابع محامياً من المنتدى ثم حدّث.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={reloadColleagues}
                                        className={`${btnGhost} mx-auto inline-flex items-center justify-center gap-1.5 px-4`}
                                    >
                                        <RefreshCw size={14} />
                                        تحديث
                                    </button>
                                </div>
                            ) : (
                                colleagues.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedId(c.id)}
                                        className={`w-full min-h-[44px] flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-right touch-manipulation transition-colors ${
                                            selectedId === c.id
                                                ? 'border-[#E6C673]/35 bg-[#E6C673]/10'
                                                : `border-white/10 ${LV_INSET} ${LV_INSET_HOVER}`
                                        }`}
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6C673]/25 bg-[#E6C673]/10 text-[11px] font-bold text-[#E6C673]">
                                            {c.name.slice(0, 1)}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-bold text-white">
                                                {c.name}
                                            </span>
                                            <span className="block text-[10px] text-white/40">
                                                {c.relation === 'both'
                                                    ? 'متابعة متبادلة'
                                                    : c.relation === 'following'
                                                      ? 'تتابعه'
                                                      : 'يتابعك'}
                                            </span>
                                        </span>
                                        {selectedId === c.id ? (
                                            <UserCheck size={15} className="text-[#E6C673] shrink-0" />
                                        ) : null}
                                    </button>
                                ))
                            )}
                        </div>
                    ) : null}

                    {step === 'privacy' ? (
                        <div className="space-y-3">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#E6C673]">
                                <Shield size={13} />
                                أقسام المشاركة
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
                            <textarea
                                value={fields.text_masking ?? ''}
                                onChange={(e) =>
                                    setFields((f) => ({ ...f, text_masking: e.target.value }))
                                }
                                placeholder="ملخص موجّه للزميل (اختياري)"
                                className="h-16 w-full resize-none rounded-xl border border-white/10 bg-[#131620] px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/30"
                            />
                        </div>
                    ) : null}

                    {step === 'confirm' && preview ? (
                        <div className="space-y-2 text-sm">
                            <p className="text-[11px] text-white/45">
                                معاينة · {formatCaseShareSession(sessionMinutes)}
                            </p>
                            <div className="rounded-xl border border-[#E6C673]/20 bg-[#E6C673]/[0.06] p-3 space-y-1.5">
                                <p className="font-bold text-white text-[13px]">{preview.title}</p>
                                {preview.narrative ? (
                                    <p className="text-[11px] text-white/55 leading-relaxed whitespace-pre-wrap">
                                        {preview.narrative}
                                    </p>
                                ) : null}
                            </div>
                            {(preview.visibleCatalog ?? []).length ? (
                                (preview.visibleCatalog ?? []).map((section) => (
                                    <div
                                        key={section.key}
                                        className="rounded-xl border border-white/10 px-3 py-2"
                                    >
                                        <p className="mb-1 text-[11px] font-bold text-[#E6C673]">
                                            {section.title}
                                        </p>
                                        <ul className="space-y-0.5">
                                            {section.items.map((item) => (
                                                <li
                                                    key={item.id}
                                                    className="truncate text-[11px] text-white/65"
                                                >
                                                    • {item.label}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))
                            ) : (
                                <p className="py-3 text-center text-[11px] text-white/40">
                                    الملخص فقط — لم تُفعَّل أقسام
                                </p>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="flex gap-2 border-t border-white/[0.07] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
                    {step !== 'target' ? (
                        <button
                            type="button"
                            onClick={() => setStep(step === 'confirm' ? 'privacy' : 'target')}
                            className={`${btnGhost} inline-flex items-center gap-1`}
                        >
                            <ChevronLeft size={15} /> رجوع
                        </button>
                    ) : colleagues.length > 0 ? (
                        <button
                            type="button"
                            onClick={reloadColleagues}
                            disabled={loadingColleagues}
                            className={`${btnGhost} inline-flex items-center gap-1.5`}
                            aria-label="تحديث القائمة"
                        >
                            <RefreshCw size={14} className={loadingColleagues ? 'animate-spin' : ''} />
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
                        className={`${btnPrimary} inline-flex items-center justify-center gap-2`}
                    >
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                        {step === 'confirm' ? 'إرسال' : 'التالي'}
                    </button>
                </div>
            </div>
        </div>
    );
});
