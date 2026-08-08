import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, X, DollarSign } from '@/app/components/ui/lucideIcons';
import {
    CLIENT_WALLET_UPDATED_EVENT,
    type ClientWalletPaymentTarget,
    type ClientWalletStore,
    clientWalletTotalDue,
    readClientWallet,
    sumClientWalletPayments,
    writeClientWallet,
} from '@/app/utils/clientWalletExecutionStorage';

const CARD_OUTER =
    'rounded-[20px] border border-[rgba(255,215,0,0.28)] bg-gradient-to-br from-[rgb(20_34_62/0.9)] to-[rgb(12_22_44/0.96)] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.35)]';

const SECTION_INNER =
    'rounded-xl bg-[#0A1122]/72 border border-white/12 p-3.5 sm:p-4';

function parseAmount(raw: string): number {
    const n = parseFloat(String(raw).replace(/,/g, '').replace(/\s/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : NaN;
}

const targetLabel = (t: ClientWalletPaymentTarget) =>
    t === 'agreed_fees' ? 'نحو الأتعاب المتفق عليها' : 'نحو استرداد مصاريف المحامي';

export interface ClientWalletExecutionSectionProps {
    executionId: string | undefined;
    /** من حقل «أتعاب المحاماة المتفق عليها مع الموكل» عند فتح الإضبارة */
    agreedClientFees: number;
    /** دفعات مسجّلة سابقاً على الملف (قبل محفظة الإضبارة) — تُستورد مرة واحدة إن كانت المحفظة فارغة */
    legacyPaidClientFees?: number;
    onPaidTotalSync: (totalPaidFromWallet: number) => void;
    /** داخل نافذة المركز المالي — بدون هوامش mx-3 الخارجية */
    embedded?: boolean;
}

export const ClientWalletExecutionSection: React.FC<ClientWalletExecutionSectionProps> = ({
    executionId,
    agreedClientFees,
    legacyPaidClientFees = 0,
    onPaidTotalSync,
    embedded = false,
}) => {
    const [store, setStore] = useState<ClientWalletStore>(() => readClientWallet(executionId));
    const [modalOpen, setModalOpen] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payTarget, setPayTarget] = useState<ClientWalletPaymentTarget>('agreed_fees');
    const [oopInput, setOopInput] = useState('');

    const applyStoreAndSync = useCallback(
        (next: ClientWalletStore) => {
            setStore(next);
            onPaidTotalSync(sumClientWalletPayments(next));
        },
        [onPaidTotalSync]
    );

    const reload = useCallback(() => {
        const s = readClientWallet(executionId);
        applyStoreAndSync(s);
    }, [executionId, applyStoreAndSync]);

    useEffect(() => {
        if (!executionId) return;
        let s = readClientWallet(executionId);
        if (s.payments.length === 0 && legacyPaidClientFees > 0) {
            s = {
                ...s,
                payments: [
                    {
                        id: `seed-legacy-paid-${executionId}`,
                        amount: legacyPaidClientFees,
                        target: 'agreed_fees' as const,
                        at: new Date().toISOString(),
                    },
                ],
            };
            writeClientWallet(executionId, s);
        }
        applyStoreAndSync(s);
    }, [executionId, legacyPaidClientFees, applyStoreAndSync]);

    useEffect(() => {
        const h = () => reload();
        window.addEventListener(CLIENT_WALLET_UPDATED_EVENT, h);
        return () => window.removeEventListener(CLIENT_WALLET_UPDATED_EVENT, h);
    }, [reload]);

    const paidTotal = useMemo(() => sumClientWalletPayments(store), [store]);
    const totalDue = useMemo(
        () => clientWalletTotalDue(agreedClientFees, store),
        [agreedClientFees, store]
    );
    const remaining = Math.max(0, totalDue - paidTotal);
    const progressPct = totalDue > 0 ? Math.min(100, Math.round((paidTotal / totalDue) * 1000) / 10) : 0;

    if (!executionId) return null;

    const persist = (next: ClientWalletStore) => {
        writeClientWallet(executionId, next);
        applyStoreAndSync(next);
    };

    const applyOutOfPocket = () => {
        const v = parseAmount(oopInput);
        if (!Number.isFinite(v)) return;
        persist({ ...store, lawyerOutOfPocket: v });
        setOopInput('');
    };

    const applyPayment = () => {
        const amt = parseAmount(payAmount);
        if (!Number.isFinite(amt) || amt <= 0) return;
        const row = {
            id: `cwp-${Date.now()}`,
            amount: amt,
            target: payTarget,
            at: new Date().toISOString(),
        };
        persist({ ...store, payments: [row, ...store.payments] });
        setPayAmount('');
    };

    return (
        <div className={embedded ? '' : `mx-3 mt-3 ${CARD_OUTER}`} dir="rtl">
            <button
                type="button"
                onClick={() => {
                    setOopInput(store.lawyerOutOfPocket > 0 ? String(store.lawyerOutOfPocket) : '');
                    setModalOpen(true);
                }}
                className="w-full text-right rounded-xl bg-transparent transition hover:bg-white/[0.04] active:scale-[0.995]"
            >
                <div className={`${embedded ? '' : SECTION_INNER} space-y-3`}>
                    <div className="flex flex-row-reverse items-center justify-between gap-2">
                        <div className="flex flex-row-reverse items-center gap-2 min-w-0">
                            <Wallet className="shrink-0 text-[#E6C673]/90" size={18} strokeWidth={1.75} />
                            <h3 className="text-sm font-bold text-[#E6C673] truncate">المحفظة الخاصة</h3>
                        </div>
                        <span className="text-[9px] text-slate-500 shrink-0">اضغط لسداد دفعة</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-right">
                            <p className="text-slate-500 text-[9px] mb-1">الأتعاب المتفق عليها</p>
                            <p className="font-bold tabular-nums text-white">
                                {Math.max(0, agreedClientFees).toLocaleString('ar-IQ')} د.ع
                            </p>
                            <p className="text-[8px] text-slate-600 mt-1 leading-snug">من واجهة فتح الإضبارة</p>
                        </div>
                        <div className="rounded-lg border border-emerald-500/15 bg-emerald-950/20 p-2.5 text-right">
                            <p className="text-slate-500 text-[9px] mb-1">مصاريف المحامي المدفوعة مسبقاً</p>
                            <p className="font-bold tabular-nums text-emerald-100/95">
                                {store.lawyerOutOfPocket.toLocaleString('ar-IQ')} د.ع
                            </p>
                            <p className="text-[8px] text-slate-600 mt-1 leading-snug">مستقل عن مصاريف الإضبارة</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-row-reverse items-center justify-between text-[12px] text-slate-300">
                            <span>نسبة التسديد</span>
                            <span className="tabular-nums text-base font-black text-[#E6C673]">{progressPct}%</span>
                        </div>
                        <div className="h-3.5 rounded-full bg-slate-900/85 overflow-hidden border border-[#E6C673]/20">
                            <div
                                className="h-full rounded-full bg-gradient-to-l from-[#E6C673] to-amber-700 transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-2.5 py-2 text-right">
                                <p className="text-[10px] text-emerald-200/85 mb-1">المسدد</p>
                                <p className="text-sm font-bold tabular-nums text-emerald-100">
                                    {paidTotal.toLocaleString('ar-IQ')}
                                </p>
                            </div>
                            <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-2.5 py-2 text-right">
                                <p className="text-[10px] text-amber-200/90 mb-1">المتبقي</p>
                                <p className="text-sm font-black tabular-nums text-amber-100">
                                    {remaining.toLocaleString('ar-IQ')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </button>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {modalOpen && (
                            <motion.div
                                key="client-wallet-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                                onClick={() => setModalOpen(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.96, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.96, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-md rounded-2xl bg-[#0A1122]/85 backdrop-blur-xl border border-white/10 p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl"
                                >
                                    <div className="flex items-center justify-between flex-row-reverse">
                                        <h4 className="text-sm font-bold text-[#E6C673]">سداد دفعة — المحفظة الخاصة</h4>
                                        <button
                                            type="button"
                                            onClick={() => setModalOpen(false)}
                                            className="p-2 rounded-full hover:bg-white/10 text-slate-400"
                                            aria-label="إغلاق"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <p className="text-[10px] text-slate-500 text-right leading-relaxed">
                                        سجّل ما دفعه الموكل نحو الأتعاب المتفق عليها أو نحو استرداد ما صرفه المحامي من ماله.
                                        لا تُدمج هذه الحقول مع «مصاريف الإضبارة» في الوعاء الموحّد.
                                    </p>

                                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2 text-right">
                                        <p className="text-[11px] font-semibold text-slate-300">تسجيل مصاريف المحامي المدفوعة مسبقاً</p>
                                        <p className="text-[9px] text-slate-600">مجموع ما دفعته أنت كمحامٍ من جيبك (ليس من بنود الإضبارة).</p>
                                        <div className="flex flex-col sm:flex-row gap-2 flex-row-reverse">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="المبلغ (د.ع)"
                                                value={oopInput}
                                                onChange={(e) => setOopInput(e.target.value)}
                                                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm placeholder:text-slate-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={applyOutOfPocket}
                                                className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-[11px] font-bold text-slate-200 hover:bg-white/15"
                                            >
                                                حفظ المبلغ
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/25 p-3 space-y-3 text-right">
                                        <p className="text-[11px] font-semibold text-emerald-100/90 flex flex-row-reverse items-center gap-2 justify-end">
                                            <DollarSign size={16} />
                                            تسجيل دفعة من الموكل
                                        </p>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="مبلغ الدفعة (د.ع)"
                                            value={payAmount}
                                            onChange={(e) => setPayAmount(e.target.value)}
                                            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm placeholder:text-slate-500"
                                        />
                                        <div className="flex flex-col gap-2">
                                            {(['agreed_fees', 'lawyer_out_of_pocket'] as const).map((t) => (
                                                <label
                                                    key={t}
                                                    className={`flex flex-row-reverse items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-[11px] ${
                                                        payTarget === t
                                                            ? 'border-[#E6C673]/40 bg-[#E6C673]/10 text-[#F5E6A8]'
                                                            : 'border-white/10 bg-white/[0.02] text-slate-400'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="payTarget"
                                                        checked={payTarget === t}
                                                        onChange={() => setPayTarget(t)}
                                                        className="accent-[#E6C673]"
                                                    />
                                                    {targetLabel(t)}
                                                </label>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={applyPayment}
                                            className="w-full rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-800 py-3 text-white text-xs font-bold shadow-md"
                                        >
                                            تأكيد تسجيل الدفعة
                                        </button>
                                    </div>

                                    {store.payments.length > 0 && (
                                        <div className="border-t border-white/10 pt-3">
                                            <p className="text-[10px] text-slate-500 mb-2 text-right">آخر الدفعات</p>
                                            <ul className="max-h-32 overflow-y-auto space-y-1.5 text-[10px] text-slate-400 text-right">
                                                {store.payments.slice(0, 12).map((p) => (
                                                    <li
                                                        key={p.id}
                                                        className="flex flex-row-reverse justify-between gap-2 border-b border-white/5 pb-1.5"
                                                    >
                                                        <span className="text-emerald-300 tabular-nums">
                                                            +{p.amount.toLocaleString('ar-IQ')}
                                                        </span>
                                                        <span>
                                                            {targetLabel(p.target)} —{' '}
                                                            {new Date(p.at).toLocaleDateString('ar-IQ')}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
};
