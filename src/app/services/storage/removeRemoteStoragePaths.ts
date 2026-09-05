import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { isVaultIdbStoragePath } from '@/app/services/vault/vaultBlobPathLite';

export function isRemoteStorageObjectPath(path: string): boolean {
    const p = path.trim();
    if (!p) return false;
    if (p.startsWith('idb:') || p.startsWith('local:')) return false;
    if (isVaultIdbStoragePath(p)) return false;
    return true;
}

/** حذف كائن تخزين سحابي — لا شبكة إن مزامنة العمل مطفأة */
export async function removeRemoteStoragePathsBestEffort(paths: string[]): Promise<void> {
    if (!isLawyerWorkCloudLive()) return;
    const toRemove = [...new Set(paths.map((p) => p.trim()).filter(isRemoteStorageObjectPath))];
    if (toRemove.length === 0) return;
    try {
        await SecureAPIClient.fetchSecure('/api/upload/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: toRemove }),
        });
    } catch {
        console.warn('[LawyerStorage] فشل حذف ملف(ات) من المخزن:', toRemove.join(', '));
    }
}
