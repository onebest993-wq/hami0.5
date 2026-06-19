import { PauseCircle, Scale } from 'lucide-react';
import type { CaseStage } from '../../../LawyerShared';

export type SmartFileStatusBannersProps = {
    displayStage: CaseStage;
    status: string;
    isViewingArchived: boolean;
    handleResumeAbandonment: () => void;
    setShowResumeInterruptionModal: (v: boolean) => void;
    handleResume: () => void;
};

export function SmartFileStatusBanners({
    displayStage,
    status,
    isViewingArchived,
    setShowResumeInterruptionModal,
    handleResume,
}: SmartFileStatusBannersProps) {
    return (
        <>
            {displayStage?.isVoided ? (
                <div
                    className="w-full bg-slate-900 border-2 border-slate-600 text-slate-400 p-6 rounded-lg text-center font-bold text-lg mb-4"
                    dir="rtl"
                >
                    ❌ تم إبطال عريضة الدعوى قانوناً
                    <div className="text-xs font-normal mt-2 text-slate-500">
                        (بسبب تركها للمراجعة للمرة الثانية أو لمرور المدة القانونية)
                    </div>
                </div>
            ) : null}

            {displayStage?.interruptionDate && !displayStage?.abandonmentDate ? (
                <div
                    className="w-full bg-rose-900 text-rose-100 p-3 rounded-lg flex justify-between items-center mb-4 border border-rose-500"
                    dir="rtl"
                >
                    <span className="font-bold text-sm flex items-center gap-2">
                        <PauseCircle size={18} />
                        🛑 انقطاع السير في الدعوى. تبطل عريضتها بعد 6 أشهر!
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowResumeInterruptionModal(true)}
                        className="bg-rose-100 text-rose-900 px-3 py-1 rounded font-extrabold text-xs hover:bg-white transition-colors shadow-sm"
                    >
                        ▶️ استئناف السير
                    </button>
                </div>
            ) : null}

            {status === 'موقوفة اتفاقياً' ? (
                <div
                    className="w-full bg-amber-900/20 border-2 border-amber-500/50 text-amber-300 p-4 rounded-lg flex justify-between items-center mb-4"
                    dir="rtl"
                >
                    <span className="font-bold text-sm flex items-center gap-2">
                        <PauseCircle size={20} className="text-amber-400" />
                        ⏸️ الدعوى موقوفة اتفاقياً. يجب استئناف السير قبل مرور 15 يوماً من تاريخ انتهاء الوقف.
                    </span>
                    {!isViewingArchived ? (
                        <button
                            type="button"
                            onClick={handleResume}
                            className="bg-amber-600/20 border border-amber-500/50 text-amber-400 px-3 py-1 rounded font-extrabold text-xs hover:bg-amber-600/40 transition-colors"
                        >
                            ▶️ استئناف السير
                        </button>
                    ) : null}
                </div>
            ) : null}

            {status === 'قيد نظر طلب رد القاضي' ? (
                <div
                    className="w-full bg-purple-900/20 border-2 border-purple-500/50 text-purple-300 p-4 rounded-lg flex justify-center items-center mb-4"
                    dir="rtl"
                >
                    <span className="font-bold text-sm flex items-center gap-2">
                        <Scale size={20} className="text-purple-400" />
                        ⏸️ الدعوى مجمدة: قيد نظر طلب رد القاضي أو نقل الدعوى.
                    </span>
                </div>
            ) : null}
        </>
    );
}
