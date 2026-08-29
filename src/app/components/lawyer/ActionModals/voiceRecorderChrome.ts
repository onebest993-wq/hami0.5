import {
    VAULT_SHEET,
    VAULT_SHEET_OVERLAY_VIEWPORT,
} from '@/app/components/lawyer/SmartVaultModal/vaultDustyRoseTheme';
import { HUB_TOPMOST_OVERLAY_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';

/** فوق نوافذ الإضبارة (ملاحظات z-250 / محضر z-260) — مع الإبقاء على أنماط الـ vault */
export const VOICE_RECORDER_OVERLAY =
    VAULT_SHEET_OVERLAY_VIEWPORT.replace(/z-\[\d+]/, HUB_TOPMOST_OVERLAY_Z_CLASS);

export const VAULT_RECORDER_SHELL =
    `${VAULT_SHEET} relative w-full max-w-md overflow-hidden rounded-[22px] sm:rounded-[22px] ` +
    'border-[#B87333]/18 shadow-[0_24px_80px_rgba(0,0,0,0.52)]';
export const VAULT_RECORDER_HEADER =
    'relative flex items-center justify-between border-b border-[#B87333]/14 px-5 py-4 ' +
    'bg-gradient-to-l from-[#132238] via-[#0E1B2E] to-[#0a1524]';
export const VAULT_RECORDER_INNER =
    'rounded-2xl border border-[#D9CFC0]/16 bg-gradient-to-br from-[#15253a] via-[#132238] to-[#0E1B2E] ' +
    'shadow-[inset_0_1px_0_rgba(230,222,208,0.06)]';
export const PEARL_BTN_GOLD =
    'flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl font-bold text-sm transition-all ' +
    'bg-[#B87333]/18 border border-[#B87333]/35 text-[#E8E4DC] hover:bg-[#B87333]/26 active:scale-[0.985] disabled:opacity-60';
export const PEARL_BTN_STOP =
    'flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl font-bold text-sm transition-all ' +
    'border border-rose-400/38 bg-rose-500/12 text-rose-100 active:scale-[0.985] disabled:opacity-60 animate-pulse';
