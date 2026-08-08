import { useEffect, useState } from 'react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import {
    fetchVaultDocsDeduped,
    SMART_VAULT_DOCS_UPDATED_EVENT,
} from '@/app/services/vault/vaultDocsWarmCache';
import { peekVaultDocsWarmCache } from '@/app/services/vault/vaultDocsWarmState';

/** وثائق الخزنة للمسح العنقودي — تُحدَّث من الكاش الدافئ دون حجب الواجهة */
export function useVaultDocsForClusterScan(
    userId: string | undefined,
    enabled: boolean,
): SmartVaultDoc[] {
    const [vaultDocs, setVaultDocs] = useState<SmartVaultDoc[]>([]);

    useEffect(() => {
        if (!enabled) {
            setVaultDocs([]);
            return;
        }
        const uid = String(userId ?? '').trim();
        if (!uid) {
            setVaultDocs([]);
            return;
        }

        let cancelled = false;
        const syncFromCache = () => {
            if (cancelled) return;
            setVaultDocs(peekVaultDocsWarmCache(uid) ?? []);
        };

        syncFromCache();
        void fetchVaultDocsDeduped(uid)
            .then((docs) => {
                if (!cancelled) setVaultDocs(docs);
            })
            .catch(() => undefined);

        const onVaultUpdated = (event: Event) => {
            const detail = (event as CustomEvent<{ userId?: string; docs?: SmartVaultDoc[] }>).detail;
            if (detail?.userId !== uid) return;
            if (cancelled) return;
            if (Array.isArray(detail.docs)) {
                setVaultDocs(detail.docs);
                return;
            }
            syncFromCache();
        };

        window.addEventListener(SMART_VAULT_DOCS_UPDATED_EVENT, onVaultUpdated);
        return () => {
            cancelled = true;
            window.removeEventListener(SMART_VAULT_DOCS_UPDATED_EVENT, onVaultUpdated);
        };
    }, [enabled, userId]);

    return vaultDocs;
}
