export function isCloudSyncEnabled(): boolean;
export const LEGACY_DEV_USER_KEY: string;
export function resolveCloudSyncUserKey(): Promise<string | null>;
export function collectAppData(overrides?: { lawyer_settings?: unknown }): {
    lawyer_settings: unknown;
    lawyer_theme: unknown;
    lawyer_shape: unknown;
    syncedAt: number;
};
export function applyAppData(appData: unknown): boolean;
export function saveToCloud(appData: unknown): Promise<unknown>;
export function loadFromCloud(): Promise<unknown>;
export function migrateLegacyDevUserCloudData(): Promise<boolean>;
