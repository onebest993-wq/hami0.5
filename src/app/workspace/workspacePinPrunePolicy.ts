import type { ClusterScanRecord, WorkspacePinnedItem, WorkspacePinType } from './types';

function pinKey(id: string, type: WorkspacePinType): string {
    return `${type}:${id}`;
}

/**
 * لا تُزيل تثبيتاً لنوع لم يُفهرس بعد في المسح (مثلاً مهام ميدان قبل تحميل quantumTasks).
 * يُزيل اليتيم فقط عندما يوجد سجل واحد على الأقل من نفس النوع في الفهرس.
 */
export function buildConservativePruneKeepKeys(
    scanIndex: ClusterScanRecord[],
    pinnedItems: WorkspacePinnedItem[],
): Set<string> {
    const indexedKeys = new Set(scanIndex.map((record) => pinKey(record.id, record.type)));
    const typesPresentInScan = new Set(scanIndex.map((record) => record.type));
    const keep = new Set<string>();

    for (const pin of pinnedItems) {
        const key = pinKey(pin.id, pin.type);
        if (!typesPresentInScan.has(pin.type)) {
            keep.add(key);
            continue;
        }
        if (indexedKeys.has(key)) {
            keep.add(key);
        }
    }

    return keep;
}
