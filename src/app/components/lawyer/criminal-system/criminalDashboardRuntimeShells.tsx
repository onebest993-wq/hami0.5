import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';

/** الحالة الاستثنائية: لم يُعثر على الإضبارة (محذوفة/رقم غير صحيح) — مستخرَجة من الـ runtime بلا أي تغيير بصري. */
export function MissingCaseShell({
    onClose,
    onExitToHome,
}: {
    onClose?: () => void;
    onExitToHome?: () => void;
}) {
    const handleExit = onExitToHome ?? onClose;

    return (
        <div
            className="flex flex-1 min-h-0 flex-col w-full bg-black font-['Tajawal']"
            dir="rtl"
            data-testid={CRIMINAL_DOSSIER_TEST_IDS.dossier}
            data-dossier-state="missing"
        >
            {handleExit ? (
                <div className="shrink-0 px-4 pt-2 pb-1">
                    <DossierHeaderNavButtons
                        onBack={onClose}
                        onExit={handleExit}
                        backTestId={CRIMINAL_DOSSIER_TEST_IDS.back}
                        exitTestId={CRIMINAL_DOSSIER_TEST_IDS.exit}
                    />
                </div>
            ) : null}
            <div className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1021] p-6 text-center">
                    <div className="text-white font-black text-base mb-2">
                        لم يتم العثور على الإضبارة الجنائية. قد تكون محذوفة أو الرقم غير صحيح
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-4 w-full rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-3 text-sm hover:brightness-110 active:brightness-95 transition"
                    >
                        العودة للقائمة
                    </button>
                </div>
            </div>
        </div>
    );
}

/** لافتة toast قانونية عابرة فوق الإضبارة — مستخرَجة من الـ runtime بلا أي تغيير بصري. */
export function LegalToastBanner({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div className="fixed top-4 left-4 right-4 z-[260] flex items-center justify-center print:hidden pointer-events-none">
            <div
                className={`max-w-3xl w-full rounded-2xl border px-4 py-3 font-black text-sm text-center whitespace-normal break-words shadow-lg ${
                    message.startsWith('✓')
                        ? 'border-emerald-500/45 bg-emerald-900/35 text-emerald-100'
                        : 'border-red-500/40 bg-red-900/25 text-red-200'
                }`}
            >
                {message}
            </div>
        </div>
    );
}

/** placeholder خفيف أثناء lazy-load — يمنع وميض فارغ دون تغيير التصميم النهائي. */
export function CriminalDashboardLazySurfaceFallback({
    minHeightClass = 'min-h-[120px]',
}: {
    minHeightClass?: string;
}) {
    return (
        <div
            className={`${minHeightClass} border-b border-white/[0.06] bg-[#1b1511]/70`}
            aria-hidden
        />
    );
}
