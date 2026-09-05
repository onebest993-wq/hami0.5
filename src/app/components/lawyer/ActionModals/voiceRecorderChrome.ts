import {
    VAULT_SHEET,
    VAULT_SHEET_OVERLAY_VIEWPORT,
} from '@/app/components/lawyer/SmartVaultModal/vaultDustyRoseTheme';
import { HUB_TOPMOST_OVERLAY_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';

/** فوق نوافذ الإضبارة (ملاحظات z-250 / محضر z-260) — مع الإبقاء على أنماط الـ vault */
export const VOICE_RECORDER_OVERLAY =
    VAULT_SHEET_OVERLAY_VIEWPORT.replace(/z-\[\d+]/, HUB_TOPMOST_OVERLAY_Z_CLASS);

export const VAULT_RECORDER_SHELL =
    `${VAULT_SHEET} relative w-full max-w-md overflow-hidden`;
export const VAULT_RECORDER_HEADER =
    'relative flex items-center justify-between border-b border-white/[0.08] px-3 py-2.5 bg-[#0A0F1C]';
export const VAULT_RECORDER_INNER =
    'rounded-xl border border-white/[0.08] bg-white/[0.035]';
export const PEARL_BTN_GOLD =
    'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl font-medium text-sm transition-colors ' +
    'bg-[#E6C673]/16 border-0 text-[#E6C673] hover:bg-[#E6C673]/24 active:opacity-[0.88] disabled:opacity-60';
export const PEARL_BTN_STOP =
    'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl font-medium text-sm transition-colors ' +
    'border-0 bg-rose-500/14 text-rose-100 active:opacity-[0.88] disabled:opacity-60';
