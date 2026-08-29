import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { SummonsInlineDateField } from '@/app/components/lawyer/execution/SummonsInlineDateField';

export interface SummonsHubGuarantorPanelProps {
    guarantorNotificationFeature: {
        enabled: boolean;
        state:
            | { noticeDateYmd: string; reason: string; endedAt?: string | null; attendedAt?: string | null }
            | null
            | undefined;
        onRegister: (p: { noticeDateYmd: string; reason: string }) => void;
        onAttend: () => void;
        onTerminate: () => void;
    };
    guarantorNoticeDate: string;
    setGuarantorNoticeDate: (v: string) => void;
    guarantorNoticeReason: string;
    setGuarantorNoticeReason: (v: string) => void;
    guarantorFormError: string;
    setGuarantorFormError: (v: string) => void;
    summonsTodayYmdMax: string;
    submitGuarantorNotice: () => void;
    onClose: () => void;
}

export const SummonsHubGuarantorPanel: React.FC<SummonsHubGuarantorPanelProps> = ({
    guarantorNotificationFeature,
    guarantorNoticeDate,
    setGuarantorNoticeDate,
    guarantorNoticeReason,
    setGuarantorNoticeReason,
    guarantorFormError,
    setGuarantorFormError,
    summonsTodayYmdMax,
    submitGuarantorNotice,
    onClose,
}) => (
    <motion.div
        key="guarantor"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
    >
        <div
            className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 space-y-3"
            dir="rtl"
        >
            <p className="text-amber-200 font-bold text-sm">تبليغ / تكليف الكفيل بالحضور</p>
            <SummonsInlineDateField
                id="execution-guarantor-notice-date"
                label="تاريخ التبليغ"
                value={guarantorNoticeDate}
                max={summonsTodayYmdMax}
                accent="amber"
                onChange={(next) => {
                    setGuarantorNoticeDate(next);
                    setGuarantorFormError('');
                }}
            />
            <div>
                <label className="mb-2 block text-right text-xs font-semibold text-gray-300">
                    سبب التبليغ / التكليف
                </label>
                <input
                    type="text"
                    value={guarantorNoticeReason}
                    onChange={(e) => {
                        setGuarantorNoticeReason(e.target.value);
                        setGuarantorFormError('');
                    }}
                    placeholder="أدخل سبب التبليغ أو التكليف بالحضور"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-right text-sm text-white"
                />
            </div>
            {guarantorFormError ? (
                <p className="text-right text-[11px] font-bold text-rose-400">{guarantorFormError}</p>
            ) : null}

            {guarantorNotificationFeature.state &&
            !guarantorNotificationFeature.state.endedAt ? (
                <div className="grid grid-cols-1 gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            guarantorNotificationFeature.onAttend();
                            onClose();
                        }}
                        className="w-full rounded-xl border border-emerald-500/25 bg-emerald-500/10 py-2.5 text-[12px] font-bold text-emerald-50 hover:bg-emerald-500/15"
                    >
                        حضور الكفيل / إنهاء التبليغ
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            guarantorNotificationFeature.onTerminate();
                            onClose();
                        }}
                        className="w-full rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-[12px] font-bold text-rose-50 hover:bg-rose-500/15"
                    >
                        إنهاء التبليغ
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={submitGuarantorNotice}
                    className="w-full rounded-xl border border-amber-500/25 bg-amber-500/10 py-2.5 text-[12px] font-bold text-amber-50 hover:bg-amber-500/15"
                >
                    تبليغ / تكليف الكفيل بالحضور
                </button>
            )}
        </div>
    </motion.div>
);
