/** مسار vault IDB — بدون سحب vaultBlobStore الثقيل إلى LD stem */
export const VAULT_IDB_PATH_PREFIX = 'idb:vault:';

export function isVaultIdbStoragePath(path: string | undefined | null): boolean {
    return (path || '').startsWith(VAULT_IDB_PATH_PREFIX);
}
