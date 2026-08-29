/**
 * Client-safe environment surface (Vite `VITE_*` only).
 *
 * Strict security:
 * - Official admin mailbox → `clientEnv.masterEmail` (`VITE_ADMIN_MASTER_EMAIL`)
 * - Public support mailbox → `clientEnv.supportEmail` (`VITE_APP_SUPPORT_EMAIL`)
 * Never hardcode the admin master address in UI components; always read it here.
 */

function readViteString(key: string): string {
    try {
        const bag = import.meta.env as Record<string, unknown>;
        const raw = bag[key];
        return typeof raw === 'string' ? raw.trim() : '';
    } catch {
        return '';
    }
}

export type ClientEnv = {
    /** Official admin mailbox — high risk; OTP / headquarters flows only. */
    readonly masterEmail: string;
    /** Public technical-support mailbox shown to end users. */
    readonly supportEmail: string;
    /** Public admin WhatsApp (digits / 964…) for recovery contact — `VITE_SUPPORT_WHATSAPP`. */
    readonly supportWhatsapp: string;
};

/**
 * Lazy getters so Vitest `vi.stubEnv` and runtime env swaps stay accurate.
 */
export const clientEnv: ClientEnv = {
    get masterEmail(): string {
        return readViteString('VITE_ADMIN_MASTER_EMAIL');
    },
    get supportEmail(): string {
        return readViteString('VITE_APP_SUPPORT_EMAIL');
    },
    get supportWhatsapp(): string {
        return readViteString('VITE_SUPPORT_WHATSAPP');
    },
};
