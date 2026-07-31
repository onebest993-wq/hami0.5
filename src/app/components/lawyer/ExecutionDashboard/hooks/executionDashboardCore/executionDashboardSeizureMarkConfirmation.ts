import type { MutableRefObject } from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, TimelineEvent } from '@/app/types/execution';

export type SaveSeizureMarkConfirmationDeps = {
    seizureMarkModalEntityId: string | null;
    seizureMarkModalEntityKind: 'property' | 'movable';
    seizureMarkLetterNumberDraft: string;
    seizureMarkDateDraft: string;
    seizureMarkEntityDraft: string;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    setSeizureMarkModalOpen: (open: boolean) => void;
    setSeizureMarkModalEntityId: (id: string | null) => void;
    setSeizureMarkLetterNumberDraft: (v: string) => void;
    setSeizureMarkDateDraft: (v: string) => void;
    setSeizureMarkEntityDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};

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
    if (entityKind === 'movable') {
        const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = {
            ...(next[idx] as any),
            seizureMarkLetterNumber: letterNo,
            seizureMarkDate: ymd,
            seizureMarkEntity: entity,
        } as any;
        persistExecutionMerge({ seizedMovables: next });
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
            ...(next[idx] as any),
            seizureMarkLetterNumber: letterNo,
            seizureMarkDate: ymd,
            seizureMarkEntity: entity,
        } as any;
        persistExecutionMerge({ seizedProperties: next });
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
    showToast('تم تسجيل كتاب التأييد وتحديث البطاقة فوراً.', 'success');
}
