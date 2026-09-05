/**
 * آخر قسم فُتح — كِسرة JS + طبقة بيانات (ليست حزمة إقلاع).
 * بعد استقرار المنزل تُسخَّن الكِسرة أولاً دون دمجها في المسار الحرج.
 * البيانات (peek/فهرس/شبكة مسموحة) تُطلق مع الكِسرة لا بعدها حتى لا يبقى الهيكل فارغاً.
 */
const SECTION_CHUNK_IDS = [
    'forum',
    'execution',
    'lawsuit',
    'transaction',
    'repository',
    'schedule',
    'fieldTasks',
    'settings',
    'notifications',
    'search',
    'profile',
    'criminal',
] as const;

export type SectionChunkId = (typeof SECTION_CHUNK_IDS)[number];

const STORAGE_KEY = 'hami:section-chunk-recency';

function isSectionChunkId(value: string): value is SectionChunkId {
    return (SECTION_CHUNK_IDS as readonly string[]).includes(value);
}

export function rememberOpenedSectionChunk(id: SectionChunkId): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
        /* quota / private */
    }
}

export function peekLastOpenedSectionChunk(): SectionChunkId | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw && isSectionChunkId(raw)) return raw;
    } catch {
        /* ignore */
    }
    return null;
}

export function resetSectionChunkRecencyForTests(): void {
    try {
        window.localStorage?.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * يسخّن كِسرة آخر قسم بعد استقرار المنزل — لا ينتظر موجة الأقسام الثقيلة.
 * يحترم تعطيل prefetchScreens. lite لا يمنع الكِسرة (محلية).
 * طبقة البيانات تُطلق مع الكِسرة — الشبكة تُحجب داخل warmSectionData عند localOnly / lite / 2G.
 * يُعيد وعداً حتى لا تبدأ موجة التحليل التالية قبل انطلاق كِسرة JS.
 */
export function warmLastOpenedSectionChunk(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return import('@/app/services/settings/settingsSnapshot')
        .then(({ getLawyerSettingsSnapshot }) => {
            try {
                if (getLawyerSettingsSnapshot().performance.prefetchScreens === false) return;
            } catch {
                /* default allow */
            }
            const id = peekLastOpenedSectionChunk();
            if (!id) return;
            void import('@/app/runtime/sectionChunkDataWarm')
                .then((m) => m.warmSectionData(id))
                .catch(() => undefined);
            return import('@/app/runtime/sectionChunkPreload').then((m) => m.preloadSectionChunk(id));
        })
        .then(() => undefined)
        .catch(() => undefined);
}
