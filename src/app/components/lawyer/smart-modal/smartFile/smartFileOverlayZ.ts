import { HUB_DOSSIER_MODAL_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { SMART_MODAL_MOTION_FADE_ENTER, SMART_MODAL_MOTION_FLOW_PANEL_ENTER } from './smartModalMotionClasses';

/** غلاف النوافذ المتداخلة داخل إضبارة الدعوى */
export const SMART_FILE_NESTED_MODAL_Z = HUB_DOSSIER_MODAL_Z_CLASS;

export const SMART_FILE_NESTED_MODAL_OVERLAY_CLASS = `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} flex items-start justify-center overflow-y-auto overscroll-contain bg-[#03050B]/88 p-3 sm:items-center sm:p-4 font-['Tajawal'] pointer-events-auto`;

export const SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS = `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} flex items-start justify-center overflow-y-auto overscroll-contain bg-[#03050B]/68 p-3 sm:items-center sm:p-4 font-['Tajawal'] pointer-events-auto`;

/** لوحات ملء الشاشة داخل الإضبارة (مرجع قانوني، سجل الجلسة، …) */
export const SMART_FILE_FULLSCREEN_PANEL_OVERLAY_CLASS = `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} bg-[#03050B]/68 font-['Tajawal'] pointer-events-auto`;

/** حاوية لوحة «سير الدعوى» — توسيط بالـflex بلا inset يمدّ العرض */
export const SMART_FILE_FLOW_PANEL_HOST_CLASS =
    `fixed inset-0 z-[280] pointer-events-none font-['Tajawal'] flex items-start justify-center pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.25rem))] px-3`;

export const SMART_FILE_FLOW_PANEL_BACKDROP_CLASS = `absolute inset-0 bg-[#05060D]/72 ${SMART_MODAL_MOTION_FADE_ENTER} motion-safe:duration-300 pointer-events-auto`;

/** معاينة المستند فوق نافذة المحفظة داخل الإضبارة */
export const SMART_FILE_DOCUMENT_PREVIEW_OVERLAY_CLASS =
    "fixed inset-0 z-[258] flex items-center justify-center bg-[#03050B]/88 p-3 sm:p-4 font-['Tajawal'] pointer-events-auto";

/** عرض ثابت — بلا left+right معاً حتى لا تتمدّد بعرض الشاشة */
export const SMART_FILE_FLOW_PANEL_SHELL_CLASS =
    `relative w-full min-w-0 max-w-[18rem] font-['Tajawal'] ${SMART_MODAL_MOTION_FLOW_PANEL_ENTER} rounded-xl border border-white/[0.1] bg-[#0A0F1C] shadow-[0_12px_36px_rgba(0,0,0,0.3)] overflow-hidden pointer-events-auto`;
