import {
    HUB_DOSSIER_CHROME_Z_CLASS,
    HUB_DOSSIER_MODAL_Z_CLASS,
    HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS,
} from '@/app/components/lawyer/dashboard/hubOverlayStack';

/** غلاف النوافذ المتداخلة داخل إضبارة الدعوى */
export const SMART_FILE_NESTED_MODAL_Z = HUB_DOSSIER_MODAL_Z_CLASS;

export const SMART_FILE_NESTED_MODAL_OVERLAY_CLASS = `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} flex items-start justify-center overflow-y-auto overscroll-contain bg-[#03050B]/94 p-3 sm:items-center sm:p-4 font-['Tajawal'] pointer-events-auto`;

export const SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS = `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} flex items-start justify-center overflow-y-auto overscroll-contain bg-[#020309]/96 p-3 sm:items-center sm:p-4 font-['Tajawal'] pointer-events-auto`;

/** لوحات ملء الشاشة داخل الإضبارة (مرجع قانوني، سجل الجلسة، …) */
export const SMART_FILE_FULLSCREEN_PANEL_OVERLAY_CLASS = `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} bg-[#020309]/96 font-['Tajawal'] pointer-events-auto`;

/** لوحة «سير الدعوى» — فوق شريط الإضبارة (z-252) بخلفية معتمة */
export const SMART_FILE_FLOW_PANEL_BACKDROP_CLASS = `fixed inset-0 ${HUB_DOSSIER_CHROME_Z_CLASS} bg-[#05060D]/94 backdrop-blur-[1px] animate-in fade-in duration-200 pointer-events-auto`;

/** معاينة المستند فوق نافذة المحفظة داخل الإضبارة */
export const SMART_FILE_DOCUMENT_PREVIEW_OVERLAY_CLASS =
    "fixed inset-0 z-[258] flex items-center justify-center bg-[#020309]/96 p-3 sm:p-4 font-['Tajawal'] pointer-events-auto";

export const SMART_FILE_FLOW_PANEL_SHELL_CLASS =
    `fixed top-[72px] left-1/2 -translate-x-1/2 w-[92vw] max-w-[360px] ${HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS} font-['Tajawal'] animate-in zoom-in-95 fade-in duration-200 rounded-2xl border border-white/[0.1] bg-[#0A0F1C] shadow-[0_20px_60px_rgba(0,0,0,0.72)] overflow-hidden pointer-events-auto`;
