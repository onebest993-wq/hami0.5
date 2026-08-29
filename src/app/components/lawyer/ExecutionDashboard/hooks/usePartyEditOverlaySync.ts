import { useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { clearPartyEditDisplayOverlay, getPartyEditDisplayOverlay } from '../helpers/partyEditDisplayOverlay';

export function usePartyEditOverlaySync(executionData: ExecutionFile | null | undefined) {
    useEffect(() => {
        const creditors = executionData?.creditors;
        if (Array.isArray(creditors)) {
            for (const row of creditors) {
                const id = row?.id != null ? String(row.id).trim() : '';
                if (!id) continue;
                const overlay = getPartyEditDisplayOverlay('creditor', id);
                if (!overlay) continue;
                if (
                    String(row.name ?? '') === overlay.name &&
                    String(row.phone ?? '') === overlay.phone &&
                    String(row.address ?? '') === overlay.address
                ) {
                    clearPartyEditDisplayOverlay('creditor', id);
                }
            }
        }
        const debtors = executionData?.debtors;
        if (Array.isArray(debtors)) {
            for (const row of debtors) {
                const id = row?.id != null ? String(row.id).trim() : '';
                if (!id) continue;
                const overlay = getPartyEditDisplayOverlay('debtor', id);
                if (!overlay) continue;
                if (
                    String(row.name ?? '') === overlay.name &&
                    String(row.phone ?? '') === overlay.phone &&
                    String(row.address ?? '') === overlay.address
                ) {
                    clearPartyEditDisplayOverlay('debtor', id);
                }
            }
        }
    }, [executionData?.creditors, executionData?.debtors]);
}
