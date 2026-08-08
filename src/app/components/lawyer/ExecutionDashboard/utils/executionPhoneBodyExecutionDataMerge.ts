import type { ExecutionFile, SeizedAsset, SeizedMovable, SeizedProperty } from '@/app/types/execution';

function movableRichness(row: SeizedMovable): number {
    let score = 0;
    if (String(row.movableDescription || '').trim()) score += 1;
    if (String(row.seizureMarkLetterNumber || '').trim()) score += 2;
    if (String(row.newspaperName || '').trim()) score += 2;
    if (String(row.status || '').trim() !== 'seized') score += 1;
    if (row.initialAwardAmountIqd != null) score += 2;
    return score;
}

function propertyRichness(row: SeizedProperty): number {
    let score = 0;
    if (String(row.propertyNumber || '').trim()) score += 1;
    if (String(row.seizureMarkLetterNumber || '').trim()) score += 2;
    if (String(row.newspaperName || '').trim()) score += 2;
    if (String(row.status || '').trim() !== 'seized') score += 1;
    return score;
}

function mergeSeizedRows<T extends { id?: string }>(
    fromScope: T[] | undefined,
    fromLocal: T[] | undefined,
    richness: (row: T) => number,
): T[] {
    const map = new Map<string, T>();
    const add = (row: T) => {
        const id = String(row.id || '').trim();
        if (!id) return;
        const prev = map.get(id);
        if (!prev) {
            map.set(id, row);
            return;
        }
        const pickLocal = richness(row) >= richness(prev);
        map.set(id, pickLocal ? { ...prev, ...row } : { ...row, ...prev });
    };
    for (const row of fromScope ?? []) add(row);
    for (const row of fromLocal ?? []) add(row);
    return Array.from(map.values());
}

export function mergeSeizedAssetLists(
    primary: SeizedAsset[] | undefined,
    secondary: SeizedAsset[] | undefined,
): SeizedAsset[] {
    return mergeSeizedRows(primary, secondary, (row) => {
        let score = 0;
        if (row.details && typeof row.details === 'object' && !Array.isArray(row.details)) score += 2;
        if (String(row.description || '').trim()) score += 1;
        if (String(row.status || '').trim() !== 'seized') score += 1;
        return score;
    });
}

export function mergeSeizedMovableLists(
    primary: SeizedMovable[] | undefined,
    secondary: SeizedMovable[] | undefined,
): SeizedMovable[] {
    return mergeSeizedRows(primary, secondary, movableRichness);
}

export function mergeSeizedPropertyLists(
    primary: SeizedProperty[] | undefined,
    secondary: SeizedProperty[] | undefined,
): SeizedProperty[] {
    return mergeSeizedRows(primary, secondary, propertyRichness);
}

/** لا نسمح لـ scope المتأخر بمسح seizedMovables/Properties المحدَّثة محلياً في phone body */
export function mergeExecutionFileSeizureLists(
    fromScope: ExecutionFile | null | undefined,
    localRef: ExecutionFile | null | undefined,
): ExecutionFile | null | undefined {
    if (!fromScope) return localRef ?? null;
    if (!localRef) return fromScope;
    const seizedMovables = mergeSeizedRows(
        fromScope.seizedMovables,
        localRef.seizedMovables,
        movableRichness,
    );
    const seizedProperties = mergeSeizedRows(
        fromScope.seizedProperties,
        localRef.seizedProperties,
        propertyRichness,
    );
    return {
        ...fromScope,
        seizedMovables,
        seizedProperties,
    };
}
