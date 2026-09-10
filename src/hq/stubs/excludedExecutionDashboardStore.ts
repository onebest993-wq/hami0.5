/** بديل بناء المقر — مخزن التنفيذ ليس سطح المقر. */
export function useExecutionDashboardStore(): {
    getState: () => { resetStore: () => void; purgeDossierScopedState: (id: string) => void };
} {
    return {
        getState: () => ({
            resetStore: () => undefined,
            purgeDossierScopedState: () => undefined,
        }),
    };
}

export function isInabaSubFileId(): boolean {
    return false;
}

/*
 * معرّفات الإنابة وختم الخطّ الزمني — يستوردها سطح المحامي بقيمةٍ لا بنوع، فرollup
 * يطلبها من البديل. وأسلوب هذا المجلّد: **المعرّف يحتفظ بقيمته الحقيقية** كي تبقى
 * المقارنات صادقة، و**ما يُنتج عملاً يُفرَّغ**. فالبناة النقيّة تُنقل كما هي،
 * و`resolveParentDossierId` يُرجع فراغاً لأنّ المقر بلا حالة إضبارة، والختمُ يُعيد
 * الحدث كما هو لأنّ المقر بلا خطٍّ زمنيّ يُختم.
 */
export const INABA_SUB_FILE_ID = '__inaba__';

export function makeInabaSubFileId(parentFileId: string): string {
    const parentId = String(parentFileId || '').trim();
    return parentId ? `${INABA_SUB_FILE_ID}:${parentId}` : INABA_SUB_FILE_ID;
}

export function inabaSubMetaStorageKey(parentId: string, subFileId: string): string {
    return `${String(parentId || '').trim()}__sub__${String(subFileId || '').trim()}__meta`;
}

export function resolveParentDossierId(): string {
    return '';
}

export function stampInabaTimelineEventMetadata<T>(event: T): T {
    return event;
}

export function stampParentTimelineEventMetadata<T>(event: T): T {
    return event;
}
