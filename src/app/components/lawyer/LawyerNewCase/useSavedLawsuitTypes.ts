import { useCallback, useState } from 'react';
import { persistSavedLawsuitType, readSavedLawsuitTypes } from './savedLawsuitTypes';

export function useSavedLawsuitTypes() {
    const [savedTypes, setSavedTypes] = useState<string[]>(() => readSavedLawsuitTypes());

    const saveType = useCallback((raw: string) => {
        const next = persistSavedLawsuitType(raw);
        setSavedTypes(next);
        return next;
    }, []);

    return { savedTypes, saveType };
}
