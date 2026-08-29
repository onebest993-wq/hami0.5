import React from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';
import { EXECUTION_DOSSIER_PHONE_HEADER_GRID } from '@/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite';
import { HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';

const EXIT_BTN_CLASS =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-[#0A0F1C] text-slate-400 hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-200 touch-manipulation min-h-[44px] min-w-[44px]';

const SLOT_CLASS =
    'inline-flex h-9 w-9 min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-white/[0.06] bg-transparent';

const BODY_SLOT_CLASS = 'h-11 rounded-lg border border-white/[0.06] bg-transparent';

/** حقول فهرس فقط — لا دفتر موحّد ولا فك تشفير. */
export type ExecutionDossierPaintFile = {
    id?: string | number;
    type?: string;
    fileNumber?: string;
    fileYear?: string;
    caseNo?: string;
    year?: string;
    directorate?: string;
};

export const EXECUTION_DOSSIER_PAINT_FILE_EMPTY: ExecutionDossierPaintFile = {
    id: 0,
    type: 'execution',
};

function readDossierHeadline(file: ExecutionDossierPaintFile): string {
    const row = file as Record<string, unknown>;
    const fileNumber = String(row.fileNumber ?? row.caseNo ?? '').trim();
    const year = String(row.fileYear ?? row.year ?? '').trim();
    if (fileNumber && year) return `${fileNumber}/${year}`;
    if (fileNumber) return fileNumber;
    const directorate = String(row.directorate ?? '').trim();
    if (directorate) return directorate;
    return 'إضبارة تنفيذ';
}

/** X مطابق لـ lucide دون سحب حزمة الأيقونات إلى جذع الـ overlays. */
function ExecutionDossierExitMark(): React.ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={17}
            height={17}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

/**
 * العمود الداخلي لتوأم أول viewport — يُستخدم داخل RootFrame أو غلاف overlay.
 * بلا نبض ولا نص تحميل ظاهر.
 */
export function ExecutionDossierInstantBody({
    file,
    onExitToHome,
}: {
    file?: ExecutionDossierPaintFile | FileData | null;
    onExitToHome?: () => void;
}): React.ReactElement {
    const headline = readDossierHeadline(file ?? EXECUTION_DOSSIER_PAINT_FILE_EMPTY);

    return (
        <div
            className="flex h-full w-full max-w-md flex-col border border-white/10 bg-[#0A0F1C]"
            dir="rtl"
            aria-busy="true"
            aria-label="جاري تجهيز الإضبارة التنفيذية"
        >
            <div className="mx-2 mt-1 rounded-lg border border-white/[0.06] bg-[#0B1120]">
                <div className={EXECUTION_DOSSIER_PHONE_HEADER_GRID}>
                    {onExitToHome ? (
                        <button
                            type="button"
                            onClick={onExitToHome}
                            data-testid={EXECUTION_DOSSIER_TEST_IDS.close}
                            className={EXIT_BTN_CLASS}
                            aria-label="المغادرة إلى الواجهة الرئيسية"
                            title="المغادرة إلى الواجهة الرئيسية"
                        >
                            <ExecutionDossierExitMark />
                        </button>
                    ) : (
                        <span className={`${SLOT_CLASS} bg-hami-navy/45`} aria-hidden />
                    )}
                    <div className="flex min-w-0 flex-1 justify-center">
                        <span className="truncate text-[12px] font-semibold tracking-tight text-green-400">
                            الإضبارة التنفيذية
                        </span>
                    </div>
                    <span className={`${SLOT_CLASS} justify-self-center`} aria-hidden />
                    <span className={`${SLOT_CLASS} justify-self-end`} aria-hidden />
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-3 pt-2">
                <div className="mb-1.5 rounded-lg border border-amber-500/22 bg-transparent px-2.5 py-1.5">
                    <p className="truncate text-center text-[13px] font-bold text-amber-50/90">
                        {headline}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <div className={BODY_SLOT_CLASS} aria-hidden />
                    <div className={BODY_SLOT_CLASS} aria-hidden />
                    <div className={BODY_SLOT_CLASS} aria-hidden />
                </div>
            </div>
        </div>
    );
}

/**
 * توأم هندسي لرأس الإضبارة الحية + صفوف أول viewport.
 * بلا نبض ولا نص تحميل ظاهر — حجز مكان حتى تُقيَّم اللوحة.
 */
export function ExecutionDossierInstantFrame({
    file,
    onExitToHome,
}: {
    file: FileData | ExecutionDossierPaintFile;
    onExitToHome: () => void;
}): React.ReactElement {
    return (
        <div
            className={`fixed inset-0 z-[230] flex items-center justify-center bg-[#05060D] p-0 ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`}
            dir="rtl"
            data-testid={EXECUTION_DOSSIER_TEST_IDS.dossier}
            data-hami-overlay-safe="1"
            aria-busy="true"
            aria-label="جاري تجهيز الإضبارة التنفيذية"
        >
            <ExecutionDossierInstantBody file={file} onExitToHome={onExitToHome} />
        </div>
    );
}
