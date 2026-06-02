import type { ClusterScanRecord, WorkspacePinnedItem } from './types';

/** يكمّل حقول التثبيت المحفوظة من فهرس المسح الحي (إصلاح تثبيتات قديمة بحقول فارغة) */
export function enrichPinFromScan(
    pin: WorkspacePinnedItem,
    scanIndex: ClusterScanRecord[],
): WorkspacePinnedItem {
    const rec = scanIndex.find((r) => r.type === pin.type && r.id === pin.id);
    if (!rec) return pin;
    return {
        ...pin,
        title: pin.title && pin.title !== '—' ? pin.title : rec.title,
        clientName: pin.clientName.trim() || rec.clientName,
        caseNumber: pin.caseNumber.trim() || rec.caseNumber,
    };
}
