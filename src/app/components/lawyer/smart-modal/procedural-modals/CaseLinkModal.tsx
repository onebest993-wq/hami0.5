import React, { useState } from 'react';
import { Link } from '@/app/components/ui/lucideIcons';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { MoroccanGlassShell } from '../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../smartFile/smartModalChrome';
import type { CaseLinkCandidate, CaseLinkPeerSelection } from '../smartFile/caseLinking';

type CaseLinkModalProps = {
    isOpen: boolean;
    onClose: () => void;
    currentFileId: number;
    currentCaseNo: string;
    candidates: CaseLinkCandidate[];
    onLinkExisting: (data: { peer: CaseLinkPeerSelection; linkDate: string; reason?: string }) => void;
    onLinkExternal: (data: { peerCaseNo: string; linkDate: string; reason?: string }) => void;
};

export const CaseLinkModal = ({
    isOpen,
    onClose,
    currentFileId,
    currentCaseNo,
    candidates,
    onLinkExisting,
    onLinkExternal,
}: CaseLinkModalProps) => {
    const {
        T,
        required,
        highlight,
        cardPrimary,
        cardSecondary,
        optionBtn,
        optionBtnPrimary,
        listItemActive,
        listItemIdle,
    } = useSmartModalAccent();

    const [step, setStep] = useState<'choose' | 'existing' | 'external'>('choose');
    const [linkDate, setLinkDate] = useState(getLocalTodayYmd());
    const [reason, setReason] = useState('');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [peerCaseNo, setPeerCaseNo] = useState('');

    React.useEffect(() => {
        if (!isOpen) return;
        setStep('choose');
        setLinkDate(getLocalTodayYmd());
        setReason('');
        setSelectedKey(null);
        setPeerCaseNo('');
    }, [isOpen, currentFileId]);

    if (!isOpen) return null;

    const statusLabel = (status: string) => {
        if (status === 'archived' || status === 'archived_stage') return 'مؤرشفة';
        if (status === 'paused') return 'موقوفة';
        return 'نشطة';
    };

    const selectedCandidate = candidates.find((c) => c.key === selectedKey) ?? null;

    const toPeerSelection = (candidate: CaseLinkCandidate): CaseLinkPeerSelection => ({
        dossierKind: candidate.dossierKind,
        lawsuitFileId: candidate.lawsuitFileId,
        criminalId: candidate.criminalId,
        caseNo: candidate.caseNo,
    });

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-3xl">
            <SmartModalHeader icon={Link} title="ربط الدعوى" onClose={onClose} />
            <div className={`${T.body} md:min-h-[30rem] md:space-y-6`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={cardPrimary}>
                        <p className="text-[10px] text-white/50 mb-0.5">الدعوى الحالية</p>
                        <p className={`text-sm font-bold ${highlight}`}>{currentCaseNo || `#${currentFileId}`}</p>
                    </div>
                    <div className={cardSecondary}>
                        <p className="text-[10px] text-white/50 mb-0.5">الإضبارة المربوطة</p>
                        <p className="text-sm font-bold text-white/55">
                            {step === 'existing' && selectedCandidate
                                ? selectedCandidate.caseNo
                                : step === 'external' && peerCaseNo.trim()
                                  ? peerCaseNo.trim()
                                  : 'غير محددة بعد'}
                        </p>
                    </div>
                </div>

                {step === 'choose' ? (
                    <>
                        <p className="text-xs text-white/60 leading-relaxed">
                            الربط لا يوحّد الإضابير — يجلب نسخة للاطلاع من أي إضبارة (مدنية، أحوال، أو جزائية) نشطة أو مؤرشفة وبأي مرحلة طعن، دون تعديل ملف المخزن.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button type="button" onClick={() => setStep('existing')} className={optionBtn}>
                                إضبارة موجودة
                            </button>
                            <button type="button" onClick={() => setStep('external')} className={optionBtnPrimary}>
                                رقم مرجعي (غير بالمخزن)
                            </button>
                        </div>
                    </>
                ) : step === 'existing' ? (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setStep('choose');
                                setSelectedKey(null);
                            }}
                            className="text-[11px] text-white/50 hover:text-white/75"
                        >
                            ← رجوع
                        </button>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {candidates.length === 0 ? (
                                <p className="text-xs text-white/50 py-4 text-center">
                                    لا توجد إضابير متاحة للربط
                                </p>
                            ) : (
                                candidates.map((candidate) => {
                                    const active = selectedKey === candidate.key;
                                    return (
                                        <button
                                            key={candidate.key}
                                            type="button"
                                            onClick={() => setSelectedKey(candidate.key)}
                                            className={`w-full text-right rounded-xl border px-4 py-3.5 transition-colors ${
                                                active ? listItemActive : listItemIdle
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-bold text-white/90">{candidate.caseNo}</span>
                                                <span className="text-[10px] text-white/45">
                                                    {candidate.kindLabel ? `${candidate.kindLabel} · ` : ''}
                                                    {statusLabel(candidate.status)}
                                                    {candidate.stageLabel ? ` · ${candidate.stageLabel}` : ''}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => setStep('choose')} className="text-[11px] text-white/50 hover:text-white/75">
                            ← رجوع
                        </button>
                        <div>
                            <label className={T.label}>
                                رقم الدعوى المربوطة <span className={required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={peerCaseNo}
                                onChange={(e) => setPeerCaseNo(e.target.value)}
                                className={T.field}
                                placeholder="رقم الدعوى المرجعية"
                            />
                        </div>
                    </>
                )}

                {step !== 'choose' ? (
                    <>
                        <div>
                            <label className={T.label}>تاريخ الربط</label>
                            <input type="date" value={linkDate} onChange={(e) => setLinkDate(e.target.value)} className={T.field} />
                        </div>
                        <div>
                            <label className={T.label}>سبب الربط (اختياري)</label>
                            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${T.field} min-h-[110px] resize-none`} />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (step === 'existing' && selectedCandidate) {
                                    onLinkExisting({
                                        peer: toPeerSelection(selectedCandidate),
                                        linkDate,
                                        reason: reason.trim() || undefined,
                                    });
                                    onClose();
                                } else if (step === 'external' && peerCaseNo.trim()) {
                                    onLinkExternal({
                                        peerCaseNo: peerCaseNo.trim(),
                                        linkDate,
                                        reason: reason.trim() || undefined,
                                    });
                                    onClose();
                                }
                            }}
                            disabled={(step === 'existing' && !selectedCandidate) || (step === 'external' && !peerCaseNo.trim())}
                            className={`${T.btn} ${T.btnDisabled}`}
                        >
                            تأكيد الربط
                        </button>
                    </>
                ) : null}
            </div>
        </MoroccanGlassShell>
    );
};
