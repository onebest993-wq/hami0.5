/** حفظ خطوات الحجز العقاري/المنقول + التأييد + النشر — chunk execution-hooks */
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';

export type {
    SaveSeizureMarkConfirmationDeps,
    SaveSeizedPropertyStepDetailsDeps,
    SavePublicationDetailsDeps,
} from './executionDashboardSeizedPropertyModals.types';
import type { SaveSeizureMarkConfirmationDeps } from './executionDashboardSeizedPropertyModals.types';
export { savePublicationDetails } from './executionDashboardSavePublicationDetails';
export { saveSeizedPropertyStepDetails } from './saveSeizedPropertyStepDetails';

export function saveSeizureMarkConfirmation(deps: SaveSeizureMarkConfirmationDeps): void {
    const {
        seizureMarkModalEntityId,
        seizureMarkModalEntityKind: entityKind,
        seizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        executionDataRef,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        setSeizureMarkModalOpen,
        setSeizureMarkModalEntityId,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        showToast,
    } = deps;

    const entityId = String(seizureMarkModalEntityId || '').trim();
    if (!entityId) return;
    const letterNo = String(seizureMarkLetterNumberDraft || '').trim();
    if (!letterNo) {
        showToast('أدخل رقم كتاب التأييد.', 'warning');
        return;
    }
    const ymd = String(seizureMarkDateDraft || '').trim();
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        showToast('اختر تاريخ الكتاب بشكل صحيح.', 'warning');
        return;
    }
    const entity = String(seizureMarkEntityDraft || '').trim();
    if (!entity) {
        showToast('أدخل الجهة المجيبة.', 'warning');
        return;
    }
    const nowIso = new Date().toISOString();
    let persisted: boolean | void = true;
    if (entityKind === 'movable') {
        const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = {
            ...next[idx],
            seizureMarkLetterNumber: letterNo,
            seizureMarkDate: ymd,
            seizureMarkEntity: entity,
        };
        persisted = persistExecutionMerge({ seizedMovables: next });
        if (persisted === false) {
            showToast('تعذّر تسجيل كتاب التأييد — أعد المحاولة', 'error');
            return;
        }
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📨 تسجيل كتاب تأييد وضع الإشارة — مال منقول',
            description: `رقم الكتاب: ${letterNo}\nتاريخ الكتاب: ${ymd}\nالجهة المجيبة: ${entity}`,
            type: 'coercive',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedMovableId: entityId, seizureMarkLetterNumber: letterNo, seizureMarkEntity: entity },
        });
    } else {
        const prev = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = {
            ...next[idx],
            seizureMarkLetterNumber: letterNo,
            seizureMarkDate: ymd,
            seizureMarkEntity: entity,
        };
        persisted = persistExecutionMerge({ seizedProperties: next });
        if (persisted === false) {
            showToast('تعذّر تسجيل كتاب التأييد — أعد المحاولة', 'error');
            return;
        }
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📨 تسجيل كتاب تأييد وضع الإشارة — عقار',
            description: `رقم الكتاب: ${letterNo}\nتاريخ الكتاب: ${ymd}\nالجهة المجيبة: ${entity}`,
            type: 'coercive',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedPropertyId: entityId, seizureMarkLetterNumber: letterNo, seizureMarkEntity: entity },
        });
    }
    setSeizureMarkModalOpen(false);
    setSeizureMarkModalEntityId(null);
    setSeizureMarkLetterNumberDraft('');
    setSeizureMarkDateDraft('');
    setSeizureMarkEntityDraft('');
    toastAfterExecutionPersist(persisted, showToast, 'تم تسجيل كتاب التأييد وتحديث البطاقة فوراً.');
}
