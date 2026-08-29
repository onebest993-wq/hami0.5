export type HamiSettingsProps = {
    onClose: () => void;
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
    onShellReset?: () => void;
    userId?: string | null;
    /** false مع keep-alive — الإعدادات مخفية لكن mounted */
    open?: boolean;
    /** يبقي shellHydrated بعد الإغلاق */
    keepAlive?: boolean;
};
