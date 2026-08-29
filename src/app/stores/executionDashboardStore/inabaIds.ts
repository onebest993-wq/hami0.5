import type { ExecutionDashboardState } from './types';

export const INABA_SUB_FILE_ID = '__inaba__';
export const INABA_SUB_FILE_PREFIX = INABA_SUB_FILE_ID;

export function makeInabaSubFileId(parentFileId: string): string {
    const p = String(parentFileId || '').trim();
    return p ? `${INABA_SUB_FILE_PREFIX}:${p}` : INABA_SUB_FILE_PREFIX;
}

export function isInabaSubFileId(id: string | null | undefined): boolean {
    const v = String(id || '').trim();
    if (!v) return false;
    return v === INABA_SUB_FILE_PREFIX || v.startsWith(`${INABA_SUB_FILE_PREFIX}:`);
}

/** معرف الإضبارة الأم — ثابت أثناء التبديل بين الأم والإنابة */
export function resolveParentDossierId(
    state: Pick<ExecutionDashboardState, 'currentFile' | 'delegationParentFileId' | 'activeSubFileId'>,
    fallbackId?: string | null
): string {
    const fromDelegation = String(state.delegationParentFileId || '').trim();
    if (fromDelegation && !isInabaSubFileId(fromDelegation)) return fromDelegation;
    const cur = String(state.currentFile?.id || '').trim();
    if (cur && !isInabaSubFileId(cur)) return cur;
    const parentLink = String((state.currentFile as { parentId?: string })?.parentId || '').trim();
    if (parentLink && !isInabaSubFileId(parentLink)) return parentLink;
    const fb = String(fallbackId || '').trim();
    if (fb && !isInabaSubFileId(fb)) return fb;
    return '';
}

/** مفتاح تخزين بيانات إضبارة الإنابة — منفصل عن الأم */
export function inabaSubMetaStorageKey(parentId: string, subFileId: string): string {
    return `${String(parentId || '').trim()}__sub__${String(subFileId || '').trim()}__meta`;
}
