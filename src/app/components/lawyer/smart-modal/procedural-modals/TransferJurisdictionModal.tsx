import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Check, Scale, X } from '@/app/components/ui/lucideIcons';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { PendingCourtReferral } from '@/app/domain/lawsuit/courtReferral';
import { MoroccanGlassShell } from '../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../smartFile/smartModalChrome';

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onRegister: (data: { newCourt: string; transferDate: string; notes: string }) => boolean;
    onResolveAcceptance?: (data: {
        decision: 'accept' | 'reject';
        decisionDate: string;
        notes?: string;
        draft?: PendingCourtReferral | null;
    }) => void;
    currentCourt?: string;
    pendingReferral?: PendingCourtReferral | null;
};

export const TransferJurisdictionModal = ({
    isOpen,
    onClose,
    onRegister,
    onResolveAcceptance,
    currentCourt = '',
    pendingReferral = null,
}: ModalProps) => {
    const { T, required } = useSmartModalAccent();
    const [step, setStep] = useState<'register' | 'decide'>('register');
    const [draft, setDraft] = useState<PendingCourtReferral | null>(null);
    const [newCourt, setNewCourt] = useState('');
    const [transferDate, setTransferDate] = useState(getLocalTodayYmd());
    const [notes, setNotes] = useState('');
    const [decisionDate, setDecisionDate] = useState(getLocalTodayYmd());
    const [decisionNotes, setDecisionNotes] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        if (pendingReferral) {
            setStep('decide');
            setDraft(pendingReferral);
        } else {
            setStep('register');
            setDraft(null);
            setNewCourt('');
            setTransferDate(getLocalTodayYmd());
            setNotes('');
        }
        setDecisionDate(getLocalTodayYmd());
        setDecisionNotes('');
    }, [isOpen, pendingReferral]);

    const handleRegister = () => {
        const trimmed = newCourt.trim();
        if (!trimmed) return;
        const saved = onRegister({ newCourt: trimmed, transferDate, notes: notes.trim() });
        if (saved === false) return;
        setDraft({
            referredToCourt: trimmed,
            previousCourtName: String(currentCourt || '').trim(),
            transferDate,
            notes: notes.trim() || undefined,
        });
        setStep('decide');
    };

    const handleDecision = (decision: 'accept' | 'reject') => {
        if (!onResolveAcceptance || !activeDraft) return;
        onResolveAcceptance({
            decision,
            decisionDate,
            notes: decisionNotes.trim() || undefined,
            draft: activeDraft,
        });
    };

    if (!isOpen) return null;

    const courtLabel = String(currentCourt || '').trim() || 'غير محددة';
    const activeDraft = draft ?? pendingReferral;

    if (step === 'decide' && activeDraft) {
        return (
            <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-2xl">
                <SmartModalHeader icon={Scale} title="إحالة لعدم الاختصاص" onClose={onClose} />
                <div className={`${T.body} md:min-h-[22rem] md:space-y-5`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                            <p className="text-[9px] font-bold text-white/35 mb-1">المحكمة المحال إليها</p>
                            <p className="text-sm font-bold text-white/90">{activeDraft.referredToCourt}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                            <p className="text-[9px] font-bold text-white/35 mb-1">المحكمة السابقة</p>
                            <p className="text-sm font-semibold text-white/70">{activeDraft.previousCourtName}</p>
                        </div>
                    </div>

                    <div>
                        <label className={T.label}>تاريخ القرار</label>
                        <HamiDateInput
                            value={decisionDate}
                            onValueChange={setDecisionDate}
                            className={T.field}
                            placeholder="اختر تاريخ القرار"
                        />
                    </div>
                    <div>
                        <label className={T.label}>ملاحظات (اختياري)</label>
                        <textarea
                            value={decisionNotes}
                            onChange={(e) => setDecisionNotes(e.target.value)}
                            className={`${T.field} min-h-[88px] resize-none`}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => handleDecision('accept')}
                            className={`${T.btn} flex items-center justify-center gap-1.5`}
                        >
                            <Check size={14} aria-hidden />
                            قبول الإحالة
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDecision('reject')}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-500/16 transition-colors"
                        >
                            <X size={14} aria-hidden />
                            رفض
                        </button>
                    </div>
                </div>
            </MoroccanGlassShell>
        );
    }

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-2xl">
            <SmartModalHeader icon={Scale} title="إحالة لعدم الاختصاص" onClose={onClose} />
            <div className={`${T.body} md:min-h-[26rem] md:space-y-6`}>
                <div className="rounded-2xl border border-violet-400/18 bg-violet-500/[0.06] p-4">
                    <p className="text-[10px] font-bold text-violet-200/70 mb-2">المحكمة الحالية</p>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-black/20 px-3 py-2 text-sm font-bold text-white/90">
                        {courtLabel}
                    </span>
                </div>

                <div>
                    <label className={T.label}>
                        المحكمة المحال إليها <span className={required}>*</span>
                    </label>
                    <input
                        type="text"
                        value={newCourt}
                        onChange={(e) => setNewCourt(e.target.value)}
                        placeholder="مثال: محكمة بداءة الكرخ"
                        className={T.field}
                        autoFocus
                    />
                </div>
                <div>
                    <label className={T.label}>تاريخ الإحالة</label>
                    <HamiDateInput
                        value={transferDate}
                        onValueChange={setTransferDate}
                        className={T.field}
                        placeholder="اختر تاريخ الإحالة"
                    />
                </div>
                <div>
                    <label className={T.label}>ملاحظات (اختياري)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={`${T.field} min-h-[120px] resize-none`}
                        placeholder="سبب الإحالة أو ملاحظات إضافية..."
                    />
                </div>
                <button
                    type="button"
                    onClick={handleRegister}
                    disabled={!newCourt.trim()}
                    className={`${T.btn} ${T.btnDisabled} flex items-center justify-center gap-1.5`}
                >
                    <ArrowLeftRight size={14} aria-hidden />
                    حفظ
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
