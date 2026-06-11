import { useMemo } from 'react';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';

export function useCreditorWorkspace(
    effectiveCreditors: any[],
    additionalCreditorsPm: any[],
) {
    const creditorWorkspaceEntries = useMemo(() => {
        const out: Array<{
            key: string;
            c: Record<string, unknown>;
            isPmCreditor: boolean;
            ecIndex: number;
            pmCreditor?: any;
        }> = [];
        effectiveCreditors.forEach((c, i) => {
            out.push({
                key: String(c.id ?? `ec-${i}`),
                c: c as unknown as Record<string, unknown>,
                isPmCreditor: false,
                ecIndex: i,
            });
        });
        additionalCreditorsPm.forEach((ac) => {
            const occ = ac.occupation ?? ac.employmentType ?? 'كاسب';
            out.push({
                key: `pmc-${ac.id}`,
                c: {
                    id: ac.id,
                    name: resolvePartyStoredName(ac),
                    phone: ac.phone ?? '',
                    address: ac.address ?? '',
                    occupation: occ,
                    isClient: Boolean(ac.isClient),
                },
                isPmCreditor: true,
                ecIndex: -1,
                pmCreditor: ac,
            });
        });
        return out;
    }, [effectiveCreditors, additionalCreditorsPm]);

    const creditorNamesTextList = useMemo(() => {
        const fromMain = effectiveCreditors.map((c) => resolvePartyStoredName(c)).filter(Boolean);
        const fromPm = additionalCreditorsPm.map((c) => resolvePartyStoredName(c)).filter(Boolean);
        const merged = [...fromMain, ...fromPm];
        return merged.length ? merged.join('، ') : '';
    }, [effectiveCreditors, additionalCreditorsPm]);

    return { creditorWorkspaceEntries, creditorNamesTextList };
}
