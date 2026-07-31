import type { MutableRefObject } from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, TimelineEvent } from '@/app/types/execution';

export type SavePublicationDetailsDeps = {
    publicationModalEntityId: string | null;
    publicationModalEntityKind: 'property' | 'movable';
    publicationNewspaperNameDraft: string;
    publicationDateYmdDraft: string;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    setPublicationModalOpen: (open: boolean) => void;
    setPublicationModalEntityId: (id: string | null) => void;
    setPublicationNewspaperNameDraft: (v: string) => void;
    setPublicationDateYmdDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};

export function savePublicationDetails(deps: SavePublicationDetailsDeps): void {
    const {
        publicationModalEntityId,
        publicationModalEntityKind: entityKind,
        publicationNewspaperNameDraft,
        publicationDateYmdDraft,
        executionDataRef,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        setPublicationModalOpen,
        setPublicationModalEntityId,
        setPublicationNewspaperNameDraft,
        setPublicationDateYmdDraft,
        showToast,
    } = deps;

    const entityId = String(publicationModalEntityId || '').trim();
    if (!entityId) return;
    const newspaperName = String(publicationNewspaperNameDraft || '').trim();
    if (!newspaperName) {
        showToast('أدخل اسم الصحيفة.', 'warning');
        return;
    }
    const ymd = String(publicationDateYmdDraft || '').trim();
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        showToast('اختر تاريخ النشر بشكل صحيح.', 'warning');
        return;
    }
    const nowIso = new Date().toISOString();
    if (entityKind === 'movable') {
        const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = { ...(next[idx] as any), newspaperName, publicationDateYmd: ymd } as any;
        persistExecutionMerge({ seizedMovables: next });
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📰 توثيق النشر والإعلان — مال منقول',
            description: `الصحيفة: ${newspaperName}\nتاريخ النشر: ${ymd}`,
            type: 'coercive',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedMovableId: entityId, newspaperName, publicationDateYmd: ymd },
        });
    } else {
        const prev = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = { ...(next[idx] as any), newspaperName, publicationDateYmd: ymd } as any;
        persistExecutionMerge({ seizedProperties: next });
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📰 توثيق النشر والإعلان — عقار',
            description: `الصحيفة: ${newspaperName}\nتاريخ النشر: ${ymd}`,
            type: 'coercive',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedPropertyId: entityId, newspaperName, publicationDateYmd: ymd },
        });
    }
    setPublicationModalOpen(false);
    setPublicationModalEntityId(null);
    setPublicationNewspaperNameDraft('');
    setPublicationDateYmdDraft('');
    showToast('تم حفظ بيانات النشر وتحديث البطاقة فوراً.', 'success');
}
