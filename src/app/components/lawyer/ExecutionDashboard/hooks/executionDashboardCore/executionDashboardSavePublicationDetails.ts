/** توثيق النشر والإعلان للحجز العقاري/المنقول */
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';
import type { SavePublicationDetailsDeps } from './executionDashboardSeizedPropertyModals.types';

export type { SavePublicationDetailsDeps } from './executionDashboardSeizedPropertyModals.types';

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
    let persisted: boolean | void = true;
    if (entityKind === 'movable') {
        const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = { ...next[idx], newspaperName, publicationDateYmd: ymd };
        persisted = persistExecutionMerge({ seizedMovables: next });
        if (persisted === false) {
            showToast('تعذّر حفظ بيانات النشر — أعد المحاولة', 'error');
            return;
        }
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
        next[idx] = { ...next[idx], newspaperName, publicationDateYmd: ymd };
        persisted = persistExecutionMerge({ seizedProperties: next });
        if (persisted === false) {
            showToast('تعذّر حفظ بيانات النشر — أعد المحاولة', 'error');
            return;
        }
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
    toastAfterExecutionPersist(persisted, showToast, 'تم حفظ بيانات النشر وتحديث البطاقة فوراً.');
}
