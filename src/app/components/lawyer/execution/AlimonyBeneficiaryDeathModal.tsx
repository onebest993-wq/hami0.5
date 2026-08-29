import React, { useCallback, useEffect, useState } from 'react';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Plus } from '@/app/components/ui/icons/Plus';
import { UserRound } from '@/app/components/ui/icons/UserRound';
import { Users } from '@/app/components/ui/icons/Users';
import { X } from '@/app/components/ui/icons/X';
import {
    countAliveAlimonyBeneficiaries,
    type AlimonyBeneficiaryProfile,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';

export interface AlimonyBeneficiaryDeathModalProps {
    open: boolean;
    onClose: () => void;
    profile: AlimonyBeneficiaryProfile | null;
    onConfirm: (input: { wifeDeceased: boolean; childrenDiedCount: number }) => boolean;
}

function BeneficiaryPickCard({
    active,
    locked,
    onClick,
    icon,
    title,
    subtitle,
}: {
    active: boolean;
    locked?: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}) {
    return (
        <button
            type="button"
            onClick={locked ? undefined : onClick}
            disabled={locked}
            className={`w-full rounded-2xl border px-3 py-2.5 text-right transition-all ${
                active
                    ? 'border-rose-400/50 bg-rose-950/30 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-[#E6C673]/30 hover:bg-white/[0.05]'
            } ${locked ? 'cursor-default opacity-95' : ''}`}
        >
            <div className="flex flex-row-reverse items-center gap-2.5">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active ? 'bg-rose-500/20 text-rose-300' : 'bg-[#E6C673]/10 text-[#E6C673]'
                    }`}
                >
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-100">{title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">{subtitle}</p>
                </div>
                <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        active
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-white/5 text-slate-500'
                    }`}
                >
                    {active ? (
                        <span className="inline-flex items-center gap-0.5">
                            {locked ? <Lock size={9} className="shrink-0" /> : null}
                            متوفى
                        </span>
                    ) : (
                        'اضغط للتحديد'
                    )}
                </span>
            </div>
        </button>
    );
}

export const AlimonyBeneficiaryDeathModal: React.FC<AlimonyBeneficiaryDeathModalProps> = ({
    open,
    onClose,
    profile,
    onConfirm,
}) => {
    const [wifeDeceased, setWifeDeceased] = useState(false);
    const [childrenDiedCount, setChildrenDiedCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setWifeDeceased(false);
            setChildrenDiedCount(0);
            setError(null);
        }
    }, [open]);

    const handleSubmit = useCallback(() => {
        if (!profile) return;
        if (!wifeDeceased && childrenDiedCount <= 0) {
            setError('اختر من توفّى من المستحقين أدناه.');
            return;
        }
        if (wifeDeceased && !profile.wifeAlive) {
            setError('نفقة الزوجة مُسجَّلة متوفاة مسبقاً.');
            return;
        }
        if (childrenDiedCount > profile.childrenAlive) {
            setError(`لا يمكن تجاوز ${profile.childrenAlive} من الأولاد المتبقين.`);
            return;
        }
        const ok = onConfirm({ wifeDeceased, childrenDiedCount });
        if (ok) onClose();
    }, [childrenDiedCount, onClose, onConfirm, profile, wifeDeceased]);

    const markOneMoreChildDeceased = useCallback(() => {
        if (!profile) return;
        setError(null);
        setChildrenDiedCount((prev) =>
            prev >= profile.childrenAlive ? prev : prev + 1
        );
    }, [profile]);

    const markWifeDeceased = useCallback(() => {
        if (wifeDeceased) return;
        setError(null);
        setWifeDeceased(true);
    }, [wifeDeceased]);

    const markSingleChildDeceased = useCallback(() => {
        if (childrenDiedCount >= 1) return;
        setError(null);
        setChildrenDiedCount(1);
    }, [childrenDiedCount]);

    if (!open || !profile) return null;

    const aliveCount = countAliveAlimonyBeneficiaries(profile);
    const showWifePick = profile.hasWifeBenefit && profile.wifeAlive;
    const showChildrenPick = profile.hasChildrenBenefit && profile.childrenAlive > 0;
    const childPickLabel =
        profile.childrenAlive === 1
            ? 'وفاة الطفل'
            : `عدد الأولاد المتوفين (${childrenDiedCount} من ${profile.childrenAlive})`;

    return (
        <div
            className="fixed inset-0 z-[196] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
            role="presentation"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="flex max-h-[min(560px,90vh)] w-full max-w-sm flex-col overflow-hidden rounded-3xl border-2 border-[#E6C673]/40 bg-[#0B1120] shadow-2xl shadow-black/50"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E6C673]/25 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-[#E6C673]/10 hover:text-white"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <div className="text-center">
                        <h2 className="text-sm font-bold text-[#E6C673]">إبلاغ وفاة مستحقي النفقة</h2>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                            {aliveCount} مستحق على قيد الحياة
                        </p>
                    </div>
                    <span className="w-9" aria-hidden />
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
                    <p className="text-[10px] leading-relaxed text-slate-300">
                        اضغط على من توفّى — الاختيار <span className="text-[#E6C673]/90">نهائي</span>{' '}
                        ولا يُلغى. يمكنك تحديد أكثر من مستحق في نفس الإبلاغ. يبقى فقط من لم
                        تُحدِّده للإبلاغ لاحقاً.
                    </p>

                    <div className="space-y-2">
                        {showWifePick ? (
                            <BeneficiaryPickCard
                                active={wifeDeceased}
                                locked={wifeDeceased}
                                onClick={markWifeDeceased}
                                icon={<UserRound size={18} />}
                                title="الزوجة"
                                subtitle={`نفقة شهرية: ${profile.wifeMonthly.toLocaleString('ar-IQ')} د.ع`}
                            />
                        ) : null}

                        {showChildrenPick ? (
                            profile.childrenAlive === 1 ? (
                                <BeneficiaryPickCard
                                    active={childrenDiedCount === 1}
                                    locked={childrenDiedCount === 1}
                                    onClick={markSingleChildDeceased}
                                    icon={<Users size={18} />}
                                    title="الطفل"
                                    subtitle={`نفقة شهرية: ${profile.childMonthly.toLocaleString('ar-IQ')} د.ع`}
                                />
                            ) : (
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 space-y-2.5">
                                    <div className="flex flex-row-reverse items-center gap-2">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6C673]/10 text-[#E6C673]">
                                            <Users size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-slate-100">
                                                {childPickLabel}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-slate-400">
                                                {profile.childMonthly.toLocaleString('ar-IQ')} د.ع
                                                لكل طفل — المتبقي {profile.childrenAlive}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="min-w-[2.5rem] text-center text-lg font-black tabular-nums text-rose-300">
                                            {childrenDiedCount}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={markOneMoreChildDeceased}
                                            disabled={childrenDiedCount >= profile.childrenAlive}
                                            className="inline-flex flex-row-reverse items-center gap-1.5 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-3 py-2 text-[10px] font-bold text-[#E6C673] transition hover:bg-[#E6C673]/20 disabled:opacity-30"
                                            aria-label="إضافة متوفى"
                                        >
                                            <Plus size={14} />
                                            إضافة متوفى
                                        </button>
                                    </div>
                                    {childrenDiedCount > 0 ? (
                                        <p className="text-center text-[9px] text-slate-500">
                                            العدد المحدَّد نهائي — لا يُرجَع للخلف
                                        </p>
                                    ) : null}
                                </div>
                            )
                        ) : null}
                    </div>

                    {error ? (
                        <p className="rounded-xl border border-rose-500/25 bg-rose-950/25 px-3 py-2 text-[10px] text-rose-300">
                            {error}
                        </p>
                    ) : null}
                </div>

                <div className="shrink-0 border-t border-[#E6C673]/20 px-4 py-3">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="w-full rounded-2xl border border-[#E6C673]/40 bg-gradient-to-l from-[#E6C673]/20 to-amber-900/20 py-3 text-xs font-bold text-[#F5E6A8] shadow-lg shadow-black/20 transition hover:from-[#E6C673]/30"
                    >
                        تأكيد الإبلاغ وتحديث المركز المالي
                    </button>
                </div>
            </div>
        </div>
    );
};
